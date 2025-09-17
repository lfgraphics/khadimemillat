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
    ChevronRight,
} from 'lucide-react'

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
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs"
import { TeamSwitcher } from "./team-switcher"
import ProfilePopover from "./profile-dropdown"
import RoleGuard from "./role-guard"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import NotificationBell from '@/components/NotificationBell'

// Removed sample data; focused navigation defined inline below.

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                    <SidebarMenuItem>
                        <NotificationBell intervalMs={20000} limit={8} />
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* Admin Section */}
                <RoleGuard allowedRoles={["admin"]}>
                    <SidebarGroup>
                        <SidebarGroupLabel>Admin</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip="Verify Requests">
                                    <Link href="/admin/verify-requests">
                                        <ClipboardCheck className="h-4 w-4" />
                                        <span>Verify Requests</span>
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
                        </SidebarMenu>
                    </SidebarGroup>
                </RoleGuard>

                {/* Scrapper Section */}
                <RoleGuard allowedRoles={["scrapper","admin"]}>
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
                <RoleGuard allowedRoles={["moderator","admin"]}>
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
                            <SidebarMenuButton asChild tooltip="Donate Scrap">
                                <Link href="/donate">
                                    <Heart className="h-4 w-4" />
                                    <span>Donate Scrap</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
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
            </SidebarContent>
            <SidebarFooter>
                <SignedIn>
                    <ProfilePopover />
                </SignedIn>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
