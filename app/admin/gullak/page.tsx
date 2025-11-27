import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getGullaks } from '@/actions/gullak-actions'
import { 
    MapPin, 
    Plus, 
    Users, 
    DollarSign, 
    Calendar,
    Eye,
    Edit,
    Trash2,
    AlertCircle,
    CheckCircle,
    Clock,
    Wrench
} from 'lucide-react'
import { GullakList } from './components/GullakList'
import { GullakStats } from './components/GullakStats'
import type { GullakListResponse } from '@/types/gullak'

export default async function GullakManagementPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string; status?: string }>
}) {
    const params = await searchParams
    const page = parseInt(params.page || '1')
    const status = params.status || 'all'
    
    const result = await getGullaks(page, 10, status) as GullakListResponse

    if (!result.success || !result.data) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <p className="text-red-800">{result.message}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { gullaks, pagination } = result.data

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Gullak Management</h1>
                    <p className="text-muted-foreground">
                        Manage Neki Bank (Gullak) locations and caretakers
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/gullak/create">
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Gullak
                    </Link>
                </Button>
            </div>

            {/* Stats */}
            <Suspense fallback={<div>Loading stats...</div>}>
                <GullakStats />
            </Suspense>

            {/* Status Filter */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Gullak Locations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-6">
                        {[
                            { value: 'all', label: 'All Status', count: pagination.total },
                            { value: 'active', label: 'Active', icon: CheckCircle },
                            { value: 'inactive', label: 'Inactive', icon: Clock },
                            { value: 'maintenance', label: 'Maintenance', icon: Wrench },
                            { value: 'full', label: 'Full', icon: AlertCircle }
                        ].map((filter) => (
                            <Button
                                key={filter.value}
                                variant={status === filter.value ? 'default' : 'outline'}
                                size="sm"
                                asChild
                            >
                                <Link href={`/admin/gullak?status=${filter.value}`}>
                                    {filter.icon && <filter.icon className="w-4 h-4 mr-1" />}
                                    {filter.label}
                                    {filter.count && (
                                        <Badge variant="secondary" className="ml-2">
                                            {filter.count}
                                        </Badge>
                                    )}
                                </Link>
                            </Button>
                        ))}
                    </div>

                    <GullakList 
                        gullaks={gullaks} 
                        pagination={pagination}
                        currentStatus={status}
                    />
                </CardContent>
            </Card>
        </div>
    )
}