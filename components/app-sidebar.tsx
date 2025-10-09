"use client"

import * as React from "react"
import {
    UserCircle,
    UserCog2 as UserCog2Icon,
    User as UserIcon,
    Bell as BellIcon,
    ClipboardCheck,
    Truck,
    FileCheck,
    List as ListIcon,
    Heart,
    LayoutDashboard,
    Plus,
    HandHeart,
    Store,
    Target,
    BellDot,
    MessageSquare,
    ScanLine as Scan,
    ShoppingBag
} from 'lucide-react'
import { usePathname } from 'next/navigation'

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { TeamSwitcher } from "./team-switcher"
import ProfilePopover from "./profile-dropdown"
import RoleGuard from "./role-guard"
import NotificationBell from '@/components/NotificationBell'

// Removed sample data; focused navigation defined inline below.

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <div className="flex items-center justify-between gap-2">
                    <TeamSwitcher />
                </div>
            </SidebarHeader>
            <SidebarContent>
                {/* Global quick action row */}
                <SidebarMenu>
                    <SidebarMenuItem className="mt-1">
                        <NotificationBell limit={8} />
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* Admin Section */}
                <RoleGuard allowedRoles={["admin", "moderator"]}>
                    <SidebarGroup>
                        <SidebarGroupLabel>Admin</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Admin Dashboard">
                                    <Link href="/admin">
                                        <LayoutDashboard className="h-4 w-4" />
                                        <span>Dashboard</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Verify Requests">
                                    <Link href="/admin/verify-requests">
                                        <ClipboardCheck className="h-4 w-4" />
                                        <span>Verify Requests</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton 
                                    asChild 
                                    tooltip="Create Collection Request"
                                    isActive={pathname === '/admin/create-collection-request'}
                                >
                                    <Link href="/admin/create-collection-request">
                                        <Plus className="h-4 w-4" />
                                        <span>Create Collection Request</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Manage Users">
                                    <Link href="/admin/manage-users">
                                        <UserCog2Icon className="h-4 w-4" />
                                        <span>Manage Users</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="All Donations">
                                    <Link href="/list-donation">
                                        <ListIcon className="h-4 w-4" />
                                        <span>List Donation</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Money Donations">
                                    <Link href="/admin/money-donations">
                                        <Heart className="h-4 w-4" />
                                        <span>Money Donations</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Welfare Programs">
                                    <Link href="/admin/welfare-programs">
                                        <HandHeart className="h-4 w-4" />
                                        <span>Welfare Programs</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Campaigns">
                                    <Link href="/admin/campaigns">
                                        <Target className="h-4 w-4" />
                                        <span>Campaigns</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Notifications">
                                    <Link href="/admin/notifications">
                                        <BellDot className="h-4 w-4" />
                                        <span>Manage Notifications</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                </RoleGuard>

                {/* Scrapper Section */}
                <RoleGuard allowedRoles={["scrapper", "admin"]}>
                    <SidebarGroup>
                        <SidebarGroupLabel>Scrapper</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Assigned">
                                    <Link href="/scrapper/assigned">
                                        <Truck className="h-4 w-4" />
                                        <span>Assigned</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="List Donation">
                                    <Link href="/list-donation">
                                        <ListIcon className="h-4 w-4" />
                                        <span>List Donation</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                </RoleGuard>

                {/* Moderator Section */}
                <RoleGuard allowedRoles={["moderator", "admin"]}>
                    <SidebarGroup>
                        <SidebarGroupLabel>Moderator</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Review">
                                    <Link href="/moderator/review">
                                        <FileCheck className="h-4 w-4" />
                                        <span>Review</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                </RoleGuard>

                {/* General Section */}
                <SidebarGroup>
                    <SidebarGroupLabel>General</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Donate">
                                <Link href="/donate">
                                    <Heart className="h-4 w-4" />
                                    <span>Donate</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Welfare Programs">
                                <Link href="/welfare-programs">
                                    <HandHeart className="h-4 w-4" />
                                    <span>Welfare Programs</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Marketplace">
                                <Link href="/marketplace">
                                    <Store className="h-4 w-4" />
                                    <span>Marketplace</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="My Donations">
                                <Link href="/my-donations">
                                    <Heart className="h-4 w-4" />
                                    <span>My Donations</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="My Purchases">
                                <Link href="/account#purchases">
                                    <ShoppingBag className="h-4 w-4" />
                                    <span>My Purchases</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="My Conversations">
                                <Link href="/conversations">
                                    <MessageSquare className="h-4 w-4" />
                                    <span>My Conversations</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <RoleGuard allowedRoles={["admin", "moderator", "scrapper"]}>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Barcode Scanner">
                                    <Link href="/scanner">
                                        <Scan className="h-4 w-4" />
                                        <span>Barcode Scanner</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </RoleGuard>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Account">
                                <Link href="/account">
                                    <UserIcon className="h-4 w-4" />
                                    <span>Account</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Notifications">
                                <Link href="/notifications">
                                    <BellIcon className="h-4 w-4" />
                                    <span>Notifications</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SignedOut>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <SignInButton>
                                    <div className="flex gap-2 items-center">
                                        <UserCircle className="h-4 w-4" />
                                        <span>Login / Signup</span>
                                    </div>
                                </SignInButton>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SignedOut>
                <SignedIn>
                    <ProfilePopover />
                </SignedIn>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
