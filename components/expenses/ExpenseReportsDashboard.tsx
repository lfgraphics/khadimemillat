'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    BarChart3, 
    FileText, 
    User, 
    TrendingUp,
    Download,
    RefreshCw
} from 'lucide-react';
import ExpenseReports from './ExpenseReports';
import ExpenseAnalytics from './ExpenseAnalytics';
import UserActivityStats from './UserActivityStats';
import { toast } from 'sonner';

interface Category {
    _id: string;
    name: string;
    description?: string;
    isActive: boolean;
}

export default function ExpenseReportsDashboard() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);

    const fetchCategories = async () => {
        setIsLoadingCategories(true);
        try {
            const response = await fetch('/api/expenses/categories');
            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }
            const result = await response.json();
            setCategories(result.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setIsLoadingCategories(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Expense Reports & Analytics</h1>
                    <p className="text-muted-foreground">
                        Comprehensive reporting and analytics for expense management
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={fetchCategories}
                    disabled={isLoadingCategories}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCategories ? 'animate-spin' : ''}`} />
                    Refresh Data
                </Button>
            </div>

            <Tabs defaultValue="analytics" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="analytics" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Analytics Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Generate Reports
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        User Activity
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Expense Analytics Overview
                            </CardTitle>
                            <CardDescription>
                                Real-time analytics and insights into expense patterns and trends
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ExpenseAnalytics />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Expense Report Generation
                            </CardTitle>
                            <CardDescription>
                                Generate detailed expense reports with filtering and export options
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ExpenseReports 
                                categories={categories.filter(cat => cat.isActive)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                User Activity Statistics
                            </CardTitle>
                            <CardDescription>
                                Track individual user expense activity and patterns
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserActivityStats />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
                        <Badge variant="secondary">
                            {categories.filter(cat => cat.isActive).length}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {categories.filter(cat => cat.isActive).length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Available for expense classification
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Report Formats</CardTitle>
                        <Badge variant="outline">3</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">JSON, CSV</div>
                        <p className="text-xs text-muted-foreground">
                            Export formats available
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Analytics Period</CardTitle>
                        <Badge variant="default">Real-time</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Live Data</div>
                        <p className="text-xs text-muted-foreground">
                            Updated automatically
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}