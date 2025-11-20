'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    User, 
    Activity, 
    TrendingUp, 
    Calendar,
    BarChart3,
    Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface UserActivityData {
    totalExpenses: number;
    totalAmount: number;
    averageAmount: number;
    expensesByCategory: Array<{ category: string; amount: number; count: number }>;
    recentActivity: Array<{ date: string; action: string; description: string }>;
    monthlyTrend: Array<{ month: string; amount: number; count: number }>;
}

interface UserActivityStatsProps {
    userId?: string;
    showUserSelector?: boolean;
}

export default function UserActivityStats({ userId, showUserSelector = false }: UserActivityStatsProps) {
    const [activityData, setActivityData] = useState<UserActivityData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('30');
    const [selectedUserId, setSelectedUserId] = useState(userId || '');

    const fetchUserActivity = async (days: string, targetUserId?: string) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ days });
            if (targetUserId) {
                params.append('userId', targetUserId);
            }

            const response = await fetch(`/api/expenses/user-activity?${params}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch user activity');
            }
            const result = await response.json();
            setActivityData(result.stats);
        } catch (error) {
            console.error('Error fetching user activity:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to fetch user activity');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUserActivity(selectedPeriod, selectedUserId);
    }, [selectedPeriod, selectedUserId]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatMonth = (monthString: string) => {
        return new Date(monthString + '-01').toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">User Activity</h2>
                    <div className="w-32 h-10 bg-muted animate-pulse rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
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

    if (!activityData) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">No activity data available</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <User className="h-6 w-6" />
                    User Activity
                </h2>
                <div className="flex gap-2">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activityData.totalExpenses}</div>
                        <p className="text-xs text-muted-foreground">
                            Last {selectedPeriod} days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(activityData.totalAmount)}</div>
                        <p className="text-xs text-muted-foreground">
                            Last {selectedPeriod} days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(activityData.averageAmount)}</div>
                        <p className="text-xs text-muted-foreground">
                            Per expense
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expenses by Category */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Expenses by Category
                        </CardTitle>
                        <CardDescription>
                            Breakdown of expenses by category
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {activityData.expensesByCategory.length > 0 ? (
                                activityData.expensesByCategory.map((category, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{category.category}</Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {category.count} expense{category.count !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="font-medium">{formatCurrency(category.amount)}</div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No expenses in this period
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Recent Activity
                        </CardTitle>
                        <CardDescription>
                            Latest expense-related actions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {activityData.recentActivity.length > 0 ? (
                                activityData.recentActivity.map((activity, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Badge 
                                                variant={
                                                    activity.action === 'created' ? 'default' :
                                                    activity.action === 'updated' ? 'secondary' :
                                                    'destructive'
                                                }
                                            >
                                                {activity.action}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(activity.date)}
                                            </span>
                                        </div>
                                        <p className="text-sm">{activity.description}</p>
                                        {index < activityData.recentActivity.length - 1 && (
                                            <Separator className="mt-2" />
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No recent activity
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Trend */}
            {activityData.monthlyTrend.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Monthly Trend
                        </CardTitle>
                        <CardDescription>
                            Expense activity over the last 6 months
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {activityData.monthlyTrend.map((month, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{formatMonth(month.month)}</span>
                                        <Badge variant="outline">
                                            {month.count} expense{month.count !== 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                    <div className="font-medium">{formatCurrency(month.amount)}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}