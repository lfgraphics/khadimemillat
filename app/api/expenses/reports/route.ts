import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { ExpenseService } from '@/lib/services/expense.service';
import { expenseReportSchema } from '@/lib/validators/expense.validator';

export async function POST(request: NextRequest) {
    try {
        // Check permissions - only admin andaccountant, auditor can generate reports
        const authResult = await checkUserPermissionsAPI(['admin', 'accountant', 'auditor']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user, userRole } = authResult;
        const body = await request.json();

        // Convert date strings to Date objects
        if (body.startDate) {
            body.startDate = new Date(body.startDate);
        }
        if (body.endDate) {
            body.endDate = new Date(body.endDate);
        }

        // Validate request body
        const validationResult = expenseReportSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Invalid report parameters',
                details: validationResult.error.issues
            }, { status: 400 });
        }

        const reportData = validationResult.data;

        // Handle different export formats
        if (reportData.format === 'csv') {
            const csvData = await ExpenseService.exportExpensesToCSV(reportData);
            
            return new NextResponse(csvData, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="expense-report-${reportData.startDate.toISOString().split('T')[0]}-to-${reportData.endDate.toISOString().split('T')[0]}.csv"`
                }
            });
        }

        // Default JSON format
        const report = await ExpenseService.generateReport(reportData);

        return NextResponse.json({
            message: 'Report generated successfully',
            report
        });

    } catch (error) {
        console.error('Error generating report:', error);
        
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