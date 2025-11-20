import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseService } from '@/lib/services/expense.service';
import {
    expenseEntryUpdateSchema,
    expenseEntryDeleteSchema
} from '@/lib/validators/expense.validator';
import { handleExpenseApiError } from '@/lib/utils/expense-error-handling';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check permissions - only admin, moderator, andaccountant, auditor can view expenses
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant', 'auditor']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user, userRole } = authResult;
        const { id } = await params;
        const expense = await ExpenseService.getExpenseById(id, userRole);

        if (!expense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        // For non-admin users, only allow viewing their own expenses unless they're accountant or auditor
        if (userRole !== 'admin' && userRole !== 'accountant' && userRole !== 'auditor' && expense.clerkUserId !== user.clerkUserId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({ expense });

    } catch (error) {
        console.error('Error fetching expense:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check permissions - only admin and moderator can update expenses
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user, userRole } = authResult;
        const body = await request.json();

        // Convert date string to Date object if provided
        if (body.expenseDate) {
            body.expenseDate = new Date(body.expenseDate);
        }

        // Validate request body
        const validationResult = expenseEntryUpdateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid expense data',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        // Get existing expense to check ownership
        const { id } = await params;
        const existingExpense = await ExpenseService.getExpenseById(id, userRole);
        if (!existingExpense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        // For non-admin users, only allow editing their own expenses
        if (userRole !== 'admin' && existingExpense.clerkUserId !== user.clerkUserId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const updatedExpense = await ExpenseService.updateExpense(
            id,
            validationResult.data,
            user.clerkUserId,
            userRole
        );

        return NextResponse.json({
            message: 'Expense updated successfully',
            expense: updatedExpense
        });

    } catch (error) {
        console.error('Error updating expense:', error);
        
        if (error instanceof Error) {
            // Handle specific business logic errors
            if (error.message.includes('Cannot edit deleted expense')) {
                return NextResponse.json(
                    { error: 'This expense has been deleted and cannot be edited.' },
                    { status: 400 }
                );
            }
            if (error.message.includes('30 days')) {
                return NextResponse.json(
                    { error: 'Expenses older than 30 days cannot be edited without admin approval.' },
                    { status: 403 }
                );
            }
            if (error.message.includes('only edit your own')) {
                return NextResponse.json(
                    { error: 'You can only edit your own expenses.' },
                    { status: 403 }
                );
            }
            if (error.message.includes('Category not found')) {
                return NextResponse.json(
                    { error: 'The selected category is no longer available.' },
                    { status: 400 }
                );
            }
            if (error.message.includes('inactive category')) {
                return NextResponse.json(
                    { error: 'The selected category has been deactivated.' },
                    { status: 400 }
                );
            }
            
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { 
                error: 'Failed to update expense. Please try again.',
                retryable: true
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check permissions - only admin and moderator can delete expenses
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user, userRole } = authResult;
        const body = await request.json();

        // Validate request body
        const validationResult = expenseEntryDeleteSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid delete request',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        // Get existing expense to check ownership
        const { id: expenseId } = await params;
        const existingExpense = await ExpenseService.getExpenseById(expenseId, userRole);
        if (!existingExpense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        // For non-admin users, only allow deleting their own expenses
        if (userRole !== 'admin' && existingExpense.clerkUserId !== user.clerkUserId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        await ExpenseService.deleteExpense(expenseId, user.clerkUserId, validationResult.data.reason);

        return NextResponse.json({
            message: 'Expense deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting expense:', error);
        
        if (error instanceof Error) {
            // Handle specific business logic errors
            if (error.message.includes('already deleted')) {
                return NextResponse.json(
                    { error: 'This expense has already been deleted.' },
                    { status: 400 }
                );
            }
            if (error.message.includes('Expense not found')) {
                return NextResponse.json(
                    { error: 'The expense could not be found.' },
                    { status: 404 }
                );
            }
            
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { 
                error: 'Failed to delete expense. Please try again.',
                retryable: true
            },
            { status: 500 }
        );
    }
}