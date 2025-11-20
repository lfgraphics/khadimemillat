import connectDB from "../db";
import ExpenseEntry, { IExpenseEntry, IAuditEntry } from "@/models/ExpenseEntry";
import ExpenseCategory from "@/models/ExpenseCategory";
import { Types } from "mongoose";
import {
    ExpenseEntryCreateInput,
    ExpenseEntryUpdateInput,
    ExpenseEntryFilters,
    ExpenseReportInput
} from "@/lib/validators/expense.validator";

export interface ExpenseReport {
    summary: {
        totalExpenses: number;
        totalAmount: number;
        expenseCount: number;
        averageAmount: number;
    };
    breakdown: {
        byCategory: Array<{ category: string; amount: number; count: number }>;
        byUser: Array<{ user: string; amount: number; count: number }>;
        byDate: Array<{ date: string; amount: number; count: number }>;
    };
    expenses: IExpenseEntry[];
}

export class ExpenseService {
    /**
     * Create a new expense entry
     */
    static async createExpense(data: ExpenseEntryCreateInput, userId: string): Promise<IExpenseEntry> {
        await connectDB();

        // Validate category exists and is active
        const category = await ExpenseCategory.findById(data.category);
        if (!category) {
            throw new Error("Category not found");
        }
        if (!category.isActive) {
            throw new Error("Cannot create expense with inactive category");
        }

        // Create audit entry
        const auditEntry: IAuditEntry = {
            action: 'created',
            performedBy: userId,
            performedAt: new Date(),
            reason: data.reason
        };

        // Create expense entry
        const expenseData = {
            clerkUserId: userId,
            amount: data.amount,
            currency: data.currency || 'INR',
            category: new Types.ObjectId(data.category),
            description: data.description,
            vendor: data.vendor,
            expenseDate: data.expenseDate,
            receipts: data.receipts || [],
            auditTrail: [auditEntry]
        };

        const expense = await ExpenseEntry.create(expenseData);
        return expense.populate('category');
    }

    /**
     * Check if an expense can be edited by a user
     */
    static canEditExpense(expense: IExpenseEntry, userId: string, userRole: string): {
        canEdit: boolean;
        reason?: string;
        requiresAdminApproval?: boolean;
    } {
        // Check if expense is deleted
        if (expense.isDeleted) {
            return {
                canEdit: false,
                reason: "Cannot edit deleted expense"
            };
        }

        // Check ownership (non-admins can only edit their own expenses)
        if (userRole !== 'admin' && expense.clerkUserId !== userId) {
            return {
                canEdit: false,
                reason: "You can only edit your own expenses"
            };
        }

        // Check 30-day rule for non-admins
        const daysDiff = Math.floor((Date.now() - expense.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 30 && userRole !== 'admin') {
            return {
                canEdit: false,
                reason: "Cannot edit expenses older than 30 days without admin approval",
                requiresAdminApproval: true
            };
        }

        return { canEdit: true };
    }

    /**
     * Update an existing expense entry
     */
    static async updateExpense(id: string, data: ExpenseEntryUpdateInput, userId: string, userRole?: string): Promise<IExpenseEntry> {
        await connectDB();

        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid expense ID");
        }

        // Get existing expense
        const existingExpense = await ExpenseEntry.findById(id);
        if (!existingExpense) {
            throw new Error("Expense not found");
        }

        if (existingExpense.isDeleted) {
            throw new Error("Cannot update deleted expense");
        }

        // Check if category is being updated and validate it
        if (data.category) {
            const category = await ExpenseCategory.findById(data.category);
            if (!category) {
                throw new Error("Category not found");
            }
            if (!category.isActive) {
                throw new Error("Cannot update expense with inactive category");
            }
        }

        // Check edit permissions
        const editCheck = this.canEditExpense(existingExpense, userId, userRole || 'moderator');
        if (!editCheck.canEdit) {
            throw new Error(editCheck.reason || "Cannot edit this expense");
        }

        // Track changes for audit trail
        const changes: Record<string, any> = {};
        Object.keys(data).forEach(key => {
            if (key !== 'reason' && data[key as keyof ExpenseEntryUpdateInput] !== undefined) {
                const oldValue = existingExpense[key as keyof IExpenseEntry];
                const newValue = data[key as keyof ExpenseEntryUpdateInput];
                if (oldValue !== newValue) {
                    changes[key] = { from: oldValue, to: newValue };
                }
            }
        });

        // Create audit entry
        const auditEntry: IAuditEntry = {
            action: 'updated',
            performedBy: userId,
            performedAt: new Date(),
            changes,
            reason: data.reason
        };

        // Update expense
        const updateData = { ...data };
        delete (updateData as any).reason; // Remove reason from update data

        if (data.category) {
            (updateData as any).category = new Types.ObjectId(data.category);
        }

        const updatedExpense = await ExpenseEntry.findByIdAndUpdate(
            id,
            {
                ...updateData,
                $push: { auditTrail: auditEntry }
            },
            { new: true }
        ).populate('category');

        if (!updatedExpense) {
            throw new Error("Failed to update expense");
        }

        return updatedExpense;
    }

    /**
     * Soft delete an expense entry
     */
    static async deleteExpense(id: string, userId: string, reason: string): Promise<void> {
        await connectDB();

        if (!Types.ObjectId.isValid(id)) {
            throw new Error("Invalid expense ID");
        }

        const expense = await ExpenseEntry.findById(id);
        if (!expense) {
            throw new Error("Expense not found");
        }

        if (expense.isDeleted) {
            throw new Error("Expense is already deleted");
        }

        // Create audit entry
        const auditEntry: IAuditEntry = {
            action: 'deleted',
            performedBy: userId,
            performedAt: new Date(),
            reason
        };

        // Soft delete
        await ExpenseEntry.findByIdAndUpdate(id, {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: userId,
            $push: { auditTrail: auditEntry }
        });
    }

    /**
     * Get expenses with filtering and pagination
     */
    static async getExpenses(filters: ExpenseEntryFilters, userRole?: string): Promise<{
        expenses: IExpenseEntry[];
        total: number;
        page: number;
        limit: number;
    }> {
        await connectDB();

        const query: any = {};

        // Base query - exclude deleted unless specifically requested
        if (!filters.includeDeleted) {
            query.isDeleted = { $ne: true };
        }

        // Date range filter
        if (filters.startDate || filters.endDate) {
            query.expenseDate = {};
            if (filters.startDate) query.expenseDate.$gte = filters.startDate;
            if (filters.endDate) query.expenseDate.$lte = filters.endDate;
        }

        // Category filter
        if (filters.category) {
            query.category = new Types.ObjectId(filters.category);
        }

        // Amount range filter
        if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
            query.amount = {};
            if (filters.minAmount !== undefined) query.amount.$gte = filters.minAmount;
            if (filters.maxAmount !== undefined) query.amount.$lte = filters.maxAmount;
        }

        // User filter
        if (filters.clerkUserId) {
            query.clerkUserId = filters.clerkUserId;
        }

        const skip = (filters.page - 1) * filters.limit;

        const [expenses, total] = await Promise.all([
            ExpenseEntry.find(query)
                .populate('category')
                .sort({ expenseDate: -1, createdAt: -1 })
                .skip(skip)
                .limit(filters.limit)
                .lean(),
            ExpenseEntry.countDocuments(query)
        ]);

        return {
            expenses: expenses as unknown as IExpenseEntry[],
            total,
            page: filters.page,
            limit: filters.limit
        };
    }

    /**
     * Get a single expense by ID
     */
    static async getExpenseById(id: string, userRole?: string): Promise<IExpenseEntry | null> {
        await connectDB();

        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const expense = await ExpenseEntry.findById(id)
            .populate('category')
            .lean();

        return expense as IExpenseEntry | null;
    }

    /**
     * Upload receipts for an expense
     */
    static async uploadReceipts(expenseId: string, receiptUrls: string[], userId: string): Promise<IExpenseEntry> {
        await connectDB();

        if (!Types.ObjectId.isValid(expenseId)) {
            throw new Error("Invalid expense ID");
        }

        const expense = await ExpenseEntry.findById(expenseId);
        if (!expense) {
            throw new Error("Expense not found");
        }

        if (expense.isDeleted) {
            throw new Error("Cannot upload receipts to deleted expense");
        }

        // Create audit entry
        const auditEntry: IAuditEntry = {
            action: 'updated',
            performedBy: userId,
            performedAt: new Date(),
            changes: {
                receipts: {
                    from: expense.receipts,
                    to: [...(expense.receipts || []), ...receiptUrls]
                }
            },
            reason: 'Receipt upload'
        };

        const updatedExpense = await ExpenseEntry.findByIdAndUpdate(
            expenseId,
            {
                $addToSet: { receipts: { $each: receiptUrls } },
                $push: { auditTrail: auditEntry }
            },
            { new: true }
        ).populate('category');

        if (!updatedExpense) {
            throw new Error("Failed to upload receipts");
        }

        return updatedExpense;
    }

    /**
     * Generate expense report
     */
    static async generateReport(filters: ExpenseReportInput): Promise<ExpenseReport> {
        await connectDB();

        const query: any = {
            expenseDate: {
                $gte: filters.startDate,
                $lte: filters.endDate
            }
        };

        if (!filters.includeDeleted) {
            query.isDeleted = { $ne: true };
        }

        if (filters.categories && filters.categories.length > 0) {
            query.category = { $in: filters.categories.map(id => new Types.ObjectId(id)) };
        }

        if (filters.users && filters.users.length > 0) {
            query.clerkUserId = { $in: filters.users };
        }

        const expenses = await ExpenseEntry.find(query)
            .populate('category')
            .sort({ expenseDate: -1 })
            .lean() as unknown as IExpenseEntry[];

        // Calculate summary
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const expenseCount = expenses.length;
        const averageAmount = expenseCount > 0 ? totalAmount / expenseCount : 0;

        // Group by category
        const categoryMap = new Map<string, { amount: number; count: number }>();
        expenses.forEach(expense => {
            const categoryName = (expense.category as any)?.name || 'Unknown';
            const existing = categoryMap.get(categoryName) || { amount: 0, count: 0 };
            categoryMap.set(categoryName, {
                amount: existing.amount + expense.amount,
                count: existing.count + 1
            });
        });

        // Group by user
        const userMap = new Map<string, { amount: number; count: number }>();
        expenses.forEach(expense => {
            const existing = userMap.get(expense.clerkUserId) || { amount: 0, count: 0 };
            userMap.set(expense.clerkUserId, {
                amount: existing.amount + expense.amount,
                count: existing.count + 1
            });
        });

        // Group by date
        const dateMap = new Map<string, { amount: number; count: number }>();
        expenses.forEach(expense => {
            const dateKey = expense.expenseDate.toISOString().split('T')[0];
            const existing = dateMap.get(dateKey) || { amount: 0, count: 0 };
            dateMap.set(dateKey, {
                amount: existing.amount + expense.amount,
                count: existing.count + 1
            });
        });

        return {
            summary: {
                totalExpenses: expenseCount,
                totalAmount,
                expenseCount,
                averageAmount
            },
            breakdown: {
                byCategory: Array.from(categoryMap.entries()).map(([category, data]) => ({
                    category,
                    amount: data.amount,
                    count: data.count
                })),
                byUser: Array.from(userMap.entries()).map(([user, data]) => ({
                    user,
                    amount: data.amount,
                    count: data.count
                })),
                byDate: Array.from(dateMap.entries()).map(([date, data]) => ({
                    date,
                    amount: data.amount,
                    count: data.count
                }))
            },
            expenses
        };
    }

    /**
     * Get user activity statistics
     */
    static async getUserActivityStats(userId: string, days: number = 30): Promise<{
        totalExpenses: number;
        totalAmount: number;
        averageAmount: number;
        expensesByCategory: Array<{ category: string; amount: number; count: number }>;
        recentActivity: Array<{ date: string; action: string; description: string }>;
        monthlyTrend: Array<{ month: string; amount: number; count: number }>;
    }> {
        await connectDB();

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get user expenses
        const expenses = await ExpenseEntry.find({
            clerkUserId: userId,
            expenseDate: { $gte: startDate },
            isDeleted: { $ne: true }
        })
        .populate('category')
        .sort({ expenseDate: -1 })
        .lean() as unknown as IExpenseEntry[];

        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalExpenses = expenses.length;
        const averageAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

        // Group by category
        const categoryMap = new Map<string, { amount: number; count: number }>();
        expenses.forEach(expense => {
            const categoryName = (expense.category as any)?.name || 'Unknown';
            const existing = categoryMap.get(categoryName) || { amount: 0, count: 0 };
            categoryMap.set(categoryName, {
                amount: existing.amount + expense.amount,
                count: existing.count + 1
            });
        });

        // Get recent activity from audit trails
        const recentExpenses = await ExpenseEntry.find({
            clerkUserId: userId,
            'auditTrail.performedAt': { $gte: startDate }
        })
        .populate('category')
        .sort({ 'auditTrail.performedAt': -1 })
        .limit(10)
        .lean() as unknown as IExpenseEntry[];

        const recentActivity = recentExpenses.flatMap(expense => 
            expense.auditTrail
                .filter(audit => audit.performedAt >= startDate)
                .map(audit => ({
                    date: audit.performedAt.toISOString(),
                    action: audit.action,
                    description: `${audit.action} expense: ${expense.description || (expense.category as any)?.name || 'Unknown'} - ₹${expense.amount}`
                }))
        ).slice(0, 10);

        // Monthly trend (last 6 months)
        const monthlyMap = new Map<string, { amount: number; count: number }>();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyExpenses = await ExpenseEntry.find({
            clerkUserId: userId,
            expenseDate: { $gte: sixMonthsAgo },
            isDeleted: { $ne: true }
        }).lean() as unknown as IExpenseEntry[];

        monthlyExpenses.forEach(expense => {
            const monthKey = expense.expenseDate.toISOString().substring(0, 7); // YYYY-MM
            const existing = monthlyMap.get(monthKey) || { amount: 0, count: 0 };
            monthlyMap.set(monthKey, {
                amount: existing.amount + expense.amount,
                count: existing.count + 1
            });
        });

        return {
            totalExpenses,
            totalAmount,
            averageAmount,
            expensesByCategory: Array.from(categoryMap.entries()).map(([category, data]) => ({
                category,
                amount: data.amount,
                count: data.count
            })),
            recentActivity,
            monthlyTrend: Array.from(monthlyMap.entries()).map(([month, data]) => ({
                month,
                amount: data.amount,
                count: data.count
            })).sort((a, b) => a.month.localeCompare(b.month))
        };
    }

    /**
     * Export expenses to CSV format
     */
    static async exportExpensesToCSV(filters: ExpenseReportInput): Promise<string> {
        const report = await this.generateReport(filters);
        
        const headers = [
            'Date',
            'Category',
            'Description',
            'Vendor',
            'Amount',
            'Currency',
            'User ID',
            'Receipts Count',
            'Created At',
            'Last Modified',
            'Audit Trail Count'
        ];

        const rows = report.expenses.map(expense => [
            expense.expenseDate.toISOString().split('T')[0],
            (expense.category as any)?.name || 'Unknown',
            expense.description || '',
            expense.vendor || '',
            expense.amount.toString(),
            expense.currency,
            expense.clerkUserId,
            (expense.receipts?.length || 0).toString(),
            expense.createdAt?.toISOString() || '',
            expense.auditTrail[expense.auditTrail.length - 1]?.performedAt.toISOString() || '',
            expense.auditTrail.length.toString()
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
            .join('\n');

        return csvContent;
    }

    /**
     * Get expense analytics dashboard data
     */
    static async getDashboardAnalytics(days: number = 30): Promise<{
        totalExpenses: number;
        totalAmount: number;
        averageExpense: number;
        topCategories: Array<{ category: string; amount: number; percentage: number }>;
        topUsers: Array<{ userId: string; amount: number; count: number }>;
        dailyTrend: Array<{ date: string; amount: number; count: number }>;
        monthlyComparison: { currentMonth: number; previousMonth: number; percentageChange: number };
    }> {
        await connectDB();

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get expenses for the period
        const expenses = await ExpenseEntry.find({
            expenseDate: { $gte: startDate, $lte: endDate },
            isDeleted: { $ne: true }
        })
        .populate('category')
        .lean() as unknown as IExpenseEntry[];

        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalExpenses = expenses.length;
        const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

        // Top categories
        const categoryMap = new Map<string, number>();
        expenses.forEach(expense => {
            const categoryName = (expense.category as any)?.name || 'Unknown';
            categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + expense.amount);
        });

        const topCategories = Array.from(categoryMap.entries())
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // Top users
        const userMap = new Map<string, { amount: number; count: number }>();
        expenses.forEach(expense => {
            const existing = userMap.get(expense.clerkUserId) || { amount: 0, count: 0 };
            userMap.set(expense.clerkUserId, {
                amount: existing.amount + expense.amount,
                count: existing.count + 1
            });
        });

        const topUsers = Array.from(userMap.entries())
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // Daily trend
        const dailyMap = new Map<string, { amount: number; count: number }>();
        expenses.forEach(expense => {
            const dateKey = expense.expenseDate.toISOString().split('T')[0];
            const existing = dailyMap.get(dateKey) || { amount: 0, count: 0 };
            dailyMap.set(dateKey, {
                amount: existing.amount + expense.amount,
                count: existing.count + 1
            });
        });

        const dailyTrend = Array.from(dailyMap.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Monthly comparison
        const currentMonth = new Date();
        const previousMonth = new Date();
        previousMonth.setMonth(previousMonth.getMonth() - 1);

        const currentMonthExpenses = await ExpenseEntry.find({
            expenseDate: {
                $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
                $lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
            },
            isDeleted: { $ne: true }
        }).lean();

        const previousMonthExpenses = await ExpenseEntry.find({
            expenseDate: {
                $gte: new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1),
                $lt: new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 1)
            },
            isDeleted: { $ne: true }
        }).lean();

        const currentMonthAmount = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const previousMonthAmount = previousMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const percentageChange = previousMonthAmount > 0 
            ? ((currentMonthAmount - previousMonthAmount) / previousMonthAmount) * 100 
            : 0;

        return {
            totalExpenses,
            totalAmount,
            averageExpense,
            topCategories,
            topUsers,
            dailyTrend,
            monthlyComparison: {
                currentMonth: currentMonthAmount,
                previousMonth: previousMonthAmount,
                percentageChange
            }
        };
    }
}