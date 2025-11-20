import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseService } from '@/lib/services/expense.service';
import {
    expenseEntryCreateSchema,
    expenseEntryFiltersSchema
} from '@/lib/validators/expense.validator';
import { handleExpenseApiError } from '@/lib/utils/expense-error-handling';

export async function GET(request: NextRequest) {
    try {
        // Check permissions - only admin, moderator, andaccountant, auditor can view expenses
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant', 'auditor']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user, userRole } = authResult;
        const { searchParams } = new URL(request.url);

        // Parse and validate filters
        const filters = {
            startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
            endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
            category: searchParams.get('category') || undefined,
            minAmount: searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined,
            maxAmount: searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined,
            clerkUserId: searchParams.get('clerkUserId') || undefined,
            includeDeleted: searchParams.get('includeDeleted') === 'true',
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '20')
        };

        // Validate filters
        const validationResult = expenseEntryFiltersSchema.safeParse(filters);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid filters',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        // For non-admin users, restrict to their own expenses unless they'reaccountant, auditor
        if (userRole !== 'admin' && userRole !== 'accountant' && userRole !== 'auditor') {
            validationResult.data.clerkUserId = user.clerkUserId;
        }

        const result = await ExpenseService.getExpenses(validationResult.data, userRole);

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error fetching expenses:', error);
        
        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('Database')) {
                return NextResponse.json(
                    { error: 'Database connection error. Please try again.' },
                    { status: 503 }
                );
            }
            if (error.message.includes('timeout')) {
                return NextResponse.json(
                    { error: 'Request timeout. Please try again.' },
                    { status: 408 }
                );
            }
        }
        
        return NextResponse.json(
            { 
                error: 'Failed to fetch expenses. Please try again.',
                retryable: true
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Check permissions - only admin and moderator can create expenses
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;
        const body = await request.json();

        // Convert date string to Date object if provided
        if (body.expenseDate) {
            body.expenseDate = new Date(body.expenseDate);
        }

        // Validate request body
        const validationResult = expenseEntryCreateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid expense data',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        const expense = await ExpenseService.createExpense(validationResult.data, user.clerkUserId);

        return NextResponse.json({
            message: 'Expense created successfully',
            expense
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating expense:', error);
        
        if (error instanceof Error) {
            // Handle specific business logic errors
            if (error.message.includes('Category not found')) {
                return NextResponse.json(
                    { error: 'The selected category is no longer available. Please select a different category.' },
                    { status: 400 }
                );
            }
            if (error.message.includes('inactive category')) {
                return NextResponse.json(
                    { error: 'The selected category has been deactivated. Please select an active category.' },
                    { status: 400 }
                );
            }
            if (error.message.includes('Database')) {
                return NextResponse.json(
                    { 
                        error: 'Database error occurred while creating expense. Please try again.',
                        retryable: true
                    },
                    { status: 503 }
                );
            }
            
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { 
                error: 'Failed to create expense. Please try again.',
                retryable: true
            },
            { status: 500 }
        );
    }
}