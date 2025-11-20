'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    BarChart3, 
    TrendingUp, 
    TrendingDown, 
    Users, 
    Calendar,
    DollarSign,
    Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
    totalExpenses: number;
    totalAmount: number;
    averageExpense: number;
    topCategories: Array<{ category: string; amount: number; percentage: number }>;
    topUsers: Array<{ userId: string; amount: number; count: number }>;
    dailyTrend: Array<{ date: string; amount: number; count: number }>;
    monthlyComparison: { 
        currentMonth: number; 
        previousMonth: number; 
        percentageChange: number 
    };
}

export default function ExpenseAnalytics() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('30');

    const fetchAnalytics = async (days: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/expenses/analytics?days=${days}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch analytics');
            }
            const result = await response.json();
            setAnalytics(result.analytics);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to fetch analytics');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics(selectedPeriod);
    }, [selectedPeriod]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatPercentage = (percentage: number) => {
        const sign = percentage >= 0 ? '+' : '';
        return `${sign}${percentage.toFixed(1)}%`;
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Expense Analytics</h2>
                    <div className="w-32 h-10 bg-muted animate-pulse rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="h-16 bg-muted animate-pulse rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">No analytics data available</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Expense Analytics</h2>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="365">Last year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalExpenses}</div>
                        <p className="text-xs text-muted-foreground">
                            Last {selectedPeriod} days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analytics.totalAmount)}</div>
                        <p className="text-xs text-muted-foreground">
                            Last {selectedPeriod} days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(analytics.averageExpense)}</div>
                        <p className="text-xs text-muted-foreground">
                            Per expense entry
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Change</CardTitle>
                        {analytics.monthlyComparison.percentageChange >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${
                            analytics.monthlyComparison.percentageChange >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                        }`}>
                            {formatPercentage(analytics.monthlyComparison.percentageChange)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            vs previous month
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Categories */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Top Categories
                        </CardTitle>
                        <CardDescription>
                            Highest spending categories in the selected period
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.topCategories.map((category, index) => (
                                <div key={index} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">#{index + 1}</Badge>
                                            <span className="font-medium">{category.category}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium">{formatCurrency(category.amount)}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {category.percentage.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                    <Progress value={category.percentage} className="h-2" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Users */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Top Users
                        </CardTitle>
                        <CardDescription>
                            Users with highest expense activity
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.topUsers.map((user, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">#{index + 1}</Badge>
                                        <div>
                                            <div className="font-medium">{user.userId}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {user.count} expense{user.count !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium">{formatCurrency(user.amount)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Monthly Comparison
                    </CardTitle>
                    <CardDescription>
                        Current month vs previous month spending
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {formatCurrency(analytics.monthlyComparison.currentMonth)}
                            </div>
                            <p className="text-sm text-muted-foreground">Current Month</p>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">
                                {formatCurrency(analytics.monthlyComparison.previousMonth)}
                            </div>
                            <p className="text-sm text-muted-foreground">Previous Month</p>
                        </div>
                        <div className="text-center">
                            <div className={`text-2xl font-bold ${
                                analytics.monthlyComparison.percentageChange >= 0 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                            }`}>
                                {formatPercentage(analytics.monthlyComparison.percentageChange)}
                            </div>
                            <p className="text-sm text-muted-foreground">Change</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Daily Trend */}
            {analytics.dailyTrend.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Daily Trend
                        </CardTitle>
                        <CardDescription>
                            Daily expense amounts over the selected period
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {analytics.dailyTrend.slice(-7).map((day, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="text-sm">
                                        {new Date(day.date).toLocaleDateString('en-IN', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{day.count}</Badge>
                                        <div className="font-medium">{formatCurrency(day.amount)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}