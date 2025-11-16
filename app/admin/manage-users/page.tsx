import { ROLES } from "@/utils/roles"
import { clerkClient } from "@clerk/nextjs/server"
import { SearchUsers } from "@/components/search-users"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { RoleForm } from "@/forms/roles-form"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import UserManagementClient from "@/components/admin/UserManagementClient"
import { 
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Phone, MapPin, Mail, Clipboard, UserCheck, Shield, AlertTriangle } from "lucide-react"

export default async function AdminDashboard(params: {
    searchParams: Promise<{ search?: string; page?: string }>
}) {

    const searchParams = await params.searchParams
    const query = searchParams.search
    const currentPage = parseInt(searchParams.page || '1', 10)
    const limit = 20
    const offset = (currentPage - 1) * limit

    // Get users with pagination
    let users: any[] = []
    let totalCount = 0

    try {
        const client = await clerkClient()

        if (query) {
            // Search with query
            const result = await client.users.getUserList({
                query,
                limit,
                offset
            })
            users = result.data || []
            totalCount = result.totalCount || 0
        } else {
            // Get all users with pagination when no search query
            // Use a more conservative approach to avoid API issues
            const result = await client.users.getUserList({
                limit: Math.min(limit, 10), // Start with smaller limit to avoid API issues
                offset,
                orderBy: '-created_at' // Order by newest first
            })
            users = result.data || []
            totalCount = result.totalCount || 0
        }
    } catch (error: any) {
        console.error('Failed to fetch users:', {
            error: error.message,
            status: error.status,
            clerkTraceId: error.clerkTraceId,
            errors: error.errors
        })

        // Try a fallback approach with minimal data
        try {
            const client = await clerkClient()
            if (!query) {
                // For initial load, try with very small limit as fallback
                const fallbackResult = await client.users.getUserList({
                    limit: 5,
                    offset: 0
                })
                users = fallbackResult.data || []
                totalCount = fallbackResult.totalCount || 0
                console.log('Fallback user fetch succeeded with', users.length, 'users')
            } else {
                users = []
                totalCount = 0
            }
        } catch (fallbackError: any) {
            console.error('Fallback user fetch also failed:', fallbackError)
            users = []
            totalCount = 0
        }
    }

    const effectiveLimit = query ? limit : Math.min(limit, 10)
    const totalPages = Math.ceil(totalCount / effectiveLimit)
    const hasNextPage = currentPage < totalPages
    const hasPrevPage = currentPage > 1

    return (
        <div className="space-y-6 p-6">
            <UserManagementClient>
                {/* Sponsorship Workflow Guide */}
                <Accordion type="single" collapsible className="mb-6">
                    <AccordionItem value="workflow-guide">
                        <AccordionTrigger className="text-lg font-semibold">
                            📋 Sponsorship Workflow & Role Guide
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="grid md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-blue-100 text-blue-800">
                                            <Clipboard className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-blue-900">Survey Officer</h3>
                                            <p className="text-xs text-blue-700">inquiry_officer role</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-blue-800">
                                        Conducts field surveys and assessments. Visits applicants' homes to verify information and collect detailed data.
                                    </p>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-purple-100 text-purple-800">
                                            <UserCheck className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-purple-900">Moderator</h3>
                                            <p className="text-xs text-purple-700">moderator role</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-purple-800">
                                        Reviews survey results and makes approval decisions. Can approve or reject sponsorship requests based on assessments.
                                    </p>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-red-100 text-red-800">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-red-900">Administrator</h3>
                                            <p className="text-xs text-red-700">admin role</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-red-800">
                                        Full system access. Can assign survey officers, manage all requests, and oversee the entire workflow.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                                    <div className="text-xs text-amber-800">
                                        <p className="font-medium">Workflow Process:</p>
                                        <p className="mt-1">
                                            1. User submits request → 2. Admin assigns Survey Officer → 3. Officer conducts survey → 4. Moderator reviews & approves → 5. Beneficiary card generated
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-foreground">
                            Search Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <SearchUsers />
                            {totalCount > 0 && (
                                <div className="text-sm text-muted-foreground">
                                    {query ?
                                        `Showing ${users.length} of ${totalCount} users matching "${query}"` :
                                        `Showing ${users.length} of ${totalCount} users (page ${currentPage} of ${totalPages})`
                                    }
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    {users.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-muted-foreground text-sm text-center">
                                    {query ? "No users found matching your search." : "No users found."}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {users.map((user) => (
                                <Card key={user.id} className="shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg text-foreground">
                                            {user.firstName} {user.lastName}
                                        </CardTitle>
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <Mail className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">
                                                        {
                                                            user.emailAddresses.find(
                                                                (email: any) => email.id === user.primaryEmailAddressId
                                                            )?.emailAddress
                                                        }
                                                    </span>
                                                </p>
                                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <Phone className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">
                                                        {user.privateMetadata?.phone ?
                                                            (user.privateMetadata.phone as string) :
                                                            <span className="italic text-muted-foreground/70">Not provided</span>
                                                        }
                                                    </span>
                                                </p>
                                                <p className="text-sm text-muted-foreground flex items-center gap-2 sm:col-span-2 lg:col-span-1">
                                                    <MapPin className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">
                                                        {user.publicMetadata?.address ?
                                                            (user.publicMetadata.address as string) :
                                                            <span className="italic text-muted-foreground/70">Not provided</span>
                                                        }
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <Separator className="mb-4" />
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div className="text-sm">
                                                <span className="font-medium">Role:</span>{" "}
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                                                    {user.publicMetadata.role as string || "None"}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {
                                                    ROLES.map((role, index) => (
                                                        <RoleForm key={index} userId={user.id} role={role} />
                                                    ))
                                                }
                                                {user.publicMetadata.role as string && <RoleForm userId={user.id} actionType="remove" />}
                                            </div>
                                        </div>
                
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-center mt-8">
                                    <Pagination>
                                        <PaginationContent>
                                            {hasPrevPage && (
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href={`?${new URLSearchParams({
                                                            ...(query && { search: query }),
                                                            page: (currentPage - 1).toString()
                                                        }).toString()}`}
                                                    />
                                                </PaginationItem>
                                            )}

                                            {/* Page numbers */}
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum: number
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i
                                                } else {
                                                    pageNum = currentPage - 2 + i
                                                }

                                                return (
                                                    <PaginationItem key={pageNum}>
                                                        <PaginationLink
                                                            href={`?${new URLSearchParams({
                                                                ...(query && { search: query }),
                                                                page: pageNum.toString()
                                                            }).toString()}`}
                                                            isActive={pageNum === currentPage}
                                                        >
                                                            {pageNum}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                )
                                            })}

                                            {totalPages > 5 && currentPage < totalPages - 2 && (
                                                <>
                                                    <PaginationItem>
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                    <PaginationItem>
                                                        <PaginationLink
                                                            href={`?${new URLSearchParams({
                                                                ...(query && { search: query }),
                                                                page: totalPages.toString()
                                                            }).toString()}`}
                                                        >
                                                            {totalPages}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                </>
                                            )}

                                            {hasNextPage && (
                                                <PaginationItem>
                                                    <PaginationNext
                                                        href={`?${new URLSearchParams({
                                                            ...(query && { search: query }),
                                                            page: (currentPage + 1).toString()
                                                        }).toString()}`}
                                                    />
                                                </PaginationItem>
                                            )}
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </UserManagementClient>
        </div>
    )
}

// Loading skeleton component
function UserListSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
                <Card key={i} className="shadow-sm">
                    <CardHeader className="pb-3">
                        <Skeleton className="h-6 w-48" />
                        <div className="space-y-2 mt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-40 sm:col-span-2 lg:col-span-1" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <Separator className="mb-4" />
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <Skeleton className="h-6 w-24" />
                            <div className="flex flex-wrap gap-2">
                                <Skeleton className="h-8 w-20" />
                                <Skeleton className="h-8 w-24" />
                                <Skeleton className="h-8 w-20" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
