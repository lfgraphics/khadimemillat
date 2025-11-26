'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import { 
    MapPin, 
    User, 
    Calendar,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    Clock,
    Wrench,
    AlertCircle,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { deleteGullak } from '@/actions/gullak-actions'
import { toast } from 'sonner'
import { GULLAK_STATUS_CONFIG } from '@/utils/gullak-constants'
import type { GullakType } from '@/types/gullak'

interface GullakListProps {
    gullaks: GullakType[]
    pagination: {
        page: number
        limit: number
        total: number
        pages: number
    }
    currentStatus: string
}



export function GullakList({ gullaks, pagination, currentStatus }: GullakListProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = async (gullakId: string) => {
        setDeletingId(gullakId)
        try {
            const result = await deleteGullak(gullakId)
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.message)
            }
        } catch (error) {
            toast.error('Failed to delete Gullak')
        } finally {
            setDeletingId(null)
        }
    }

    if (gullaks.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Gullaks Found</h3>
                    <p className="text-muted-foreground mb-4">
                        {currentStatus === 'all' 
                            ? 'No Gullaks have been created yet.' 
                            : `No Gullaks with status "${currentStatus}" found.`
                        }
                    </p>
                    <Button asChild>
                        <Link href="/admin/gullak/create">
                            Create First Gullak
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Gullak ID</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Caretaker</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Collections</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Last Collection</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {gullaks.map((gullak) => {
                            const statusInfo = GULLAK_STATUS_CONFIG[gullak.status as keyof typeof GULLAK_STATUS_CONFIG]
                            const StatusIcon = statusInfo.icon
                            
                            return (
                                <TableRow key={gullak._id}>
                                    <TableCell className="font-medium">
                                        {gullak.gullakId}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{gullak.location.address}</p>
                                            {gullak.location.landmark && (
                                                <p className="text-sm text-muted-foreground">
                                                    {gullak.location.landmark}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{gullak.caretaker.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {gullak.caretaker.phone}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${statusInfo.bg} ${statusInfo.color} border-current`}>
                                            <StatusIcon className="w-3 h-3 mr-1" />
                                            {statusInfo.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{gullak.totalCollections}</TableCell>
                                    <TableCell>₹{gullak.totalAmountCollected.toLocaleString()}</TableCell>
                                    <TableCell>
                                        {gullak.lastCollectionDate 
                                            ? new Date(gullak.lastCollectionDate).toLocaleDateString()
                                            : 'Never'
                                        }
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/gullak/${gullak.gullakId}`}>
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/gullak/${gullak.gullakId}/edit`}>
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        disabled={deletingId === gullak.gullakId}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Gullak</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete Gullak {gullak.gullakId}? 
                                                            This action cannot be undone and will only work if there are no collection records.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(gullak.gullakId)}
                                                            className="bg-red-600 hover:bg-red-700"
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {gullaks.map((gullak) => {
                    const statusInfo = GULLAK_STATUS_CONFIG[gullak.status as keyof typeof GULLAK_STATUS_CONFIG]
                    const StatusIcon = statusInfo.icon
                    
                    return (
                        <Card key={gullak._id}>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold">{gullak.gullakId}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {gullak.location.address}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className={`${statusInfo.bg} ${statusInfo.color} border-current`}>
                                        <StatusIcon className="w-3 h-3 mr-1" />
                                        {statusInfo.label}
                                    </Badge>
                                </div>
                                
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">{gullak.caretaker.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            {gullak.totalCollections} collections • ₹{gullak.totalAmountCollected.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" asChild className="flex-1">
                                        <Link href={`/admin/gullak/${gullak.gullakId}`}>
                                            <Eye className="w-4 h-4 mr-1" />
                                            View
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild className="flex-1">
                                        <Link href={`/admin/gullak/${gullak.gullakId}/edit`}>
                                            <Edit className="w-4 h-4 mr-1" />
                                            Edit
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} results
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            asChild={pagination.page > 1}
                        >
                            {pagination.page > 1 ? (
                                <Link href={`/admin/gullak?page=${pagination.page - 1}&status=${currentStatus}`}>
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Previous
                                </Link>
                            ) : (
                                <>
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Previous
                                </>
                            )}
                        </Button>
                        <span className="text-sm">
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.pages}
                            asChild={pagination.page < pagination.pages}
                        >
                            {pagination.page < pagination.pages ? (
                                <Link href={`/admin/gullak?page=${pagination.page + 1}&status=${currentStatus}`}>
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Link>
                            ) : (
                                <>
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}