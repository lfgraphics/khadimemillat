import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseCategoryService } from '@/lib/services/expense-category.service';
import {
    expenseCategoryCreateSchema,
    expenseCategoryFiltersSchema
} from '@/lib/validators/expense.validator';

export async function GET(request: NextRequest) {
    try {
        // Check permissions - all authenticated users can view categories
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant', 'auditor']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { searchParams } = new URL(request.url);

        // Parse and validate filters
        const filters = {
            includeInactive: searchParams.get('includeInactive') === 'true',
            parentCategory: searchParams.get('parentCategory') || undefined,
            search: searchParams.get('search') || undefined
        };

        // Validate filters
        const validationResult = expenseCategoryFiltersSchema.safeParse(filters);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid filters',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        const categories = await ExpenseCategoryService.getCategories(validationResult.data);

        return NextResponse.json({ categories });

    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Check permissions - only admin can create categories
        const authResult = await checkUserPermissionsAPI(['admin']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;
        const body = await request.json();

        // Validate request body
        const validationResult = expenseCategoryCreateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid category data',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        const category = await ExpenseCategoryService.createCategory(validationResult.data, user.clerkUserId);

        return NextResponse.json({
            message: 'Category created successfully',
            category
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating category:', error);
        
        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}