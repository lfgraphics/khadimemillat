'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const reportFormSchema = z.object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    categories: z.array(z.string()),
    users: z.array(z.string()),
    includeDeleted: z.boolean(),
    format: z.enum(['json', 'csv', 'pdf'])
}).refine(data => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
}, {
    message: 'Start date cannot be after end date',
    path: ['startDate']
});

type ReportFormData = z.infer<typeof reportFormSchema>;

interface ExpenseReport {
    summary: {
        totalExpenses: number;
        totalAmount: number;
        expenseCount: number;
        averageAmount: number;
    };
    breakdown: {
        byCategory: Array<{ category: string; amount: number; count: number }>;
        byUser: Array<{ user: string; userId: string; userName: string; userEmail?: string; amount: number; count: number }>;
        byDate: Array<{ date: string; amount: number; count: number }>;
    };
}

interface ExpenseReportsProps {
    categories?: Array<{ _id: string; name: string }>;
    users?: Array<{ id: string; name: string }>;
}

export default function ExpenseReports({ categories = [], users = [] }: ExpenseReportsProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [report, setReport] = useState<ExpenseReport | null>(null);

    const form = useForm<ReportFormData>({
        resolver: zodResolver(reportFormSchema),
        defaultValues: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            categories: [],
            users: [],
            includeDeleted: false,
            format: 'json'
        }
    });

    const onSubmit = async (data: ReportFormData) => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/expenses/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate)
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate report');
            }

            if (data.format === 'csv') {
                // Handle CSV download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `expense-report-${data.startDate}-to-${data.endDate}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Report downloaded successfully');
            } else {
                // Handle JSON report
                const result = await response.json();
                setReport(result.report);
                toast.success('Report generated successfully');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to generate report');
        } finally {
            setIsGenerating(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Generate Expense Report
                    </CardTitle>
                    <CardDescription>
                        Create detailed expense reports with filtering and export options
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>End Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="categories"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Categories (Optional)</FormLabel>
                                            <div className="space-y-2">
                                                {categories.map((category) => (
                                                    <div key={category._id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`category-${category._id}`}
                                                            checked={field.value?.includes(category._id)}
                                                            onCheckedChange={(checked) => {
                                                                const current = field.value || [];
                                                                if (checked) {
                                                                    field.onChange([...current, category._id]);
                                                                } else {
                                                                    field.onChange(current.filter(id => id !== category._id));
                                                                }
                                                            }}
                                                        />
                                                        <label
                                                            htmlFor={`category-${category._id}`}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                        >
                                                            {category.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="format"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Export Format</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select format" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="json">JSON (View Online)</SelectItem>
                                                        <SelectItem value="csv">CSV (Download)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="includeDeleted"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>Include Deleted Expenses</FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <Button type="submit" disabled={isGenerating} className="w-full">
                                {isGenerating ? (
                                    <>Generating Report...</>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Generate Report
                                    </>
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {report && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{report.summary.totalExpenses}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(report.summary.totalAmount)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(report.summary.averageAmount)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{report.breakdown.byCategory.length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Breakdown by Category */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Expenses by Category</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {report.breakdown.byCategory.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{item.category}</Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {item.count} expense{item.count !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="font-medium">{formatCurrency(item.amount)}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Breakdown by User */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Expenses by User</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {report.breakdown.byUser.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col">
                                                <Badge variant="secondary">{item.userName}</Badge>
                                                {item.userEmail && (
                                                    <span className="text-xs text-muted-foreground mt-1">
                                                        {item.userEmail}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {item.count} expense{item.count !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="font-medium">{formatCurrency(item.amount)}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}