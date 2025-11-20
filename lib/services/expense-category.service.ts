import connectDB from "../db";
import ExpenseCategory, { IExpenseCategory } from "@/models/ExpenseCategory";
import ExpenseEntry from "@/models/ExpenseEntry";
import { Types } from "mongoose";
import {
    ExpenseCategoryCreateInput,
    ExpenseCategoryUpdateInput,
    ExpenseCategoryFilters
} from "@/lib/validators/expense.validator";

export class ExpenseCategoryService {
    /**
     * Create a new expense category
     */
    static async createCategory(data: ExpenseCategoryCreateInput, userId: string): Promise<IExpenseCategory> {
        await connectDB();

        // Validate parent category if provided
        if (data.parentCategory) {
            const parentCategory = await ExpenseCategory.findById(data.parentCategory);
            if (!parentCategory) {
                throw new Error("Parent category not found");
            }
            if (!parentCategory.isActive) {
                throw new Error("Cannot create category under inactive parent");
            }
        }

        const categoryData = {
            name: data.name,
            description: data.description,
            createdBy: userId,
            parentCategory: data.parentCategory ? new Types.ObjectId(data.parentCategory) : undefined
        };

        const category = await ExpenseCategory.create(categoryData);
        return category.populate('parentCategory');
    }

    /**
     * Update an existing expense category
     */
    static async updateCategory(id: string, data: ExpenseCategoryUpdateInput, userId: string): Promise<IExpenseCategory> {
        await connectDB();

        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid category ID");
        }

        const existingCategory = await ExpenseCategory.findById(id);
        if (!existingCategory) {
            throw new Error("Category not found");
        }

        // Validate parent category if being updated
        if (data.parentCategory) {
            // Prevent circular references
            if (data.parentCategory === id) {
                throw new Error("Category cannot be its own parent");
            }

            const parentCategory = await ExpenseCategory.findById(data.parentCategory);
            if (!parentCategory) {
                throw new Error("Parent category not found");
            }
            if (!parentCategory.isActive) {
                throw new Error("Cannot set inactive category as parent");
            }

            // Check for circular reference in hierarchy
            const isCircular = await this.checkCircularReference(id, data.parentCategory);
            if (isCircular) {
                throw new Error("Cannot create circular reference in category hierarchy");
            }
        }

        const updateData = { ...data };
        if (data.parentCategory) {
            (updateData as any).parentCategory = new Types.ObjectId(data.parentCategory);
        }

        const updatedCategory = await ExpenseCategory.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('parentCategory');

        if (!updatedCategory) {
            throw new Error("Failed to update category");
        }

        return updatedCategory;
    }

    /**
     * Deactivate a category (soft delete)
     */
    static async deactivateCategory(id: string, userId: string): Promise<void> {
        await connectDB();

        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid category ID");
        }

        const category = await ExpenseCategory.findById(id);
        if (!category) {
            throw new Error("Category not found");
        }

        if (!category.isActive) {
            throw new Error("Category is already inactive");
        }

        // Check if category has active child categories
        const childCategories = await ExpenseCategory.find({
            parentCategory: id,
            isActive: true
        });

        if (childCategories.length > 0) {
            throw new Error("Cannot deactivate category with active child categories");
        }

        // Deactivate the category
        await ExpenseCategory.findByIdAndUpdate(id, {
            isActive: false
        });
    }

    /**
     * Reactivate a category
     */
    static async reactivateCategory(id: string, userId: string): Promise<IExpenseCategory> {
        await connectDB();

        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid category ID");
        }

        const category = await ExpenseCategory.findById(id);
        if (!category) {
            throw new Error("Category not found");
        }

        if (category.isActive) {
            throw new Error("Category is already active");
        }

        // If category has a parent, ensure parent is active
        if (category.parentCategory) {
            const parentCategory = await ExpenseCategory.findById(category.parentCategory);
            if (!parentCategory || !parentCategory.isActive) {
                throw new Error("Cannot reactivate category with inactive parent");
            }
        }

        const updatedCategory = await ExpenseCategory.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        ).populate('parentCategory');

        if (!updatedCategory) {
            throw new Error("Failed to reactivate category");
        }

        return updatedCategory;
    }

    /**
     * Get categories with filtering
     */
    static async getCategories(filters: Partial<ExpenseCategoryFilters> = {}): Promise<IExpenseCategory[]> {
        await connectDB();

        const query: any = {};

        // Include inactive categories if requested
        if (filters.includeInactive !== true) {
            query.isActive = true;
        }

        // Parent category filter
        if (filters.parentCategory) {
            query.parentCategory = new Types.ObjectId(filters.parentCategory);
        } else if (filters.parentCategory === null) {
            query.parentCategory = { $exists: false };
        }

        // Search filter
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: 'i' } },
                { description: { $regex: filters.search, $options: 'i' } }
            ];
        }

        const categories = await ExpenseCategory.find(query)
            .populate('parentCategory')
            .sort({ name: 1 })
            .lean();

        return categories as unknown as IExpenseCategory[];
    }

    /**
     * Get category by ID
     */
    static async getCategoryById(id: string): Promise<IExpenseCategory | null> {
        await connectDB();

        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const category = await ExpenseCategory.findById(id)
            .populate('parentCategory')
            .lean();

        return category as IExpenseCategory | null;
    }

    /**
     * Get category hierarchy (tree structure)
     */
    static async getCategoryHierarchy(): Promise<any[]> {
        await connectDB();

        const categories = await ExpenseCategory.find({ isActive: true })
            .populate('parentCategory')
            .sort({ name: 1 })
            .lean();

        // Build tree structure
        const categoryMap = new Map();
        const rootCategories: any[] = [];

        // First pass: create map of all categories
        categories.forEach(category => {
            categoryMap.set((category as any)._id.toString(), {
                ...category,
                children: []
            });
        });

        // Second pass: build hierarchy
        categories.forEach(category => {
            const categoryWithChildren = categoryMap.get((category as any)._id.toString());
            
            if (category.parentCategory) {
                const parent = categoryMap.get((category.parentCategory as any)._id.toString());
                if (parent) {
                    parent.children.push(categoryWithChildren);
                } else {
                    rootCategories.push(categoryWithChildren);
                }
            } else {
                rootCategories.push(categoryWithChildren);
            }
        });

        return rootCategories;
    }

    /**
     * Get category usage statistics
     */
    static async getCategoryUsageStats(categoryId: string): Promise<{
        totalExpenses: number;
        totalAmount: number;
        averageAmount: number;
        lastUsed?: Date;
    }> {
        await connectDB();

        if (!Types.ObjectId.isValid(categoryId)) {
            throw new Error("Invalid category ID");
        }

        const stats = await ExpenseEntry.aggregate([
            {
                $match: {
                    category: new Types.ObjectId(categoryId),
                    isDeleted: { $ne: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalExpenses: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    averageAmount: { $avg: '$amount' },
                    lastUsed: { $max: '$expenseDate' }
                }
            }
        ]);

        if (stats.length === 0) {
            return {
                totalExpenses: 0,
                totalAmount: 0,
                averageAmount: 0
            };
        }

        return {
            totalExpenses: stats[0].totalExpenses,
            totalAmount: stats[0].totalAmount,
            averageAmount: stats[0].averageAmount,
            lastUsed: stats[0].lastUsed
        };
    }

    /**
     * Check for circular reference in category hierarchy
     */
    private static async checkCircularReference(categoryId: string, parentId: string): Promise<boolean> {
        let currentParentId = parentId;
        const visited = new Set<string>();

        while (currentParentId) {
            if (visited.has(currentParentId)) {
                return true; // Circular reference detected
            }

            if (currentParentId === categoryId) {
                return true; // Direct circular reference
            }

            visited.add(currentParentId);

            const parent = await ExpenseCategory.findById(currentParentId);
            if (!parent || !parent.parentCategory) {
                break;
            }

            currentParentId = parent.parentCategory.toString();
        }

        return false;
    }

    /**
     * Bulk update categories
     */
    static async bulkUpdateCategories(updates: Array<{
        id: string;
        data: ExpenseCategoryUpdateInput;
    }>, userId: string): Promise<IExpenseCategory[]> {
        await connectDB();

        const results: IExpenseCategory[] = [];

        for (const update of updates) {
            try {
                const updatedCategory = await this.updateCategory(update.id, update.data, userId);
                results.push(updatedCategory);
            } catch (error) {
                // Log error but continue with other updates
                console.error(`Failed to update category ${update.id}:`, error);
            }
        }

        return results;
    }
}