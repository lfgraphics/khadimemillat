"use client"

import * as React from "react"
import {
    AudioWaveform,
    BookOpen,
    Bot,
    ChevronRight,
    Command,
    Frame,
    GalleryVerticalEnd,
    List,
    Map,
    PieChart,
    Settings2,
    SquareTerminal,
    UserCircle,
    UserCog2Icon,
    UserStar,
} from "lucide-react"

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

// This is sample data.
const data = {
    teams: [
        {
            name: "Acme Inc",
            logo: GalleryVerticalEnd,
            plan: "Enterprise",
        },
        {
            name: "Acme Corp.",
            logo: AudioWaveform,
            plan: "Startup",
        },
        {
            name: "Evil Corp.",
            logo: Command,
            plan: "Free",
        },
    ],
    navMain: [
        {
            title: "Playground",
            url: "#",
            icon: SquareTerminal,
            isActive: true,
            items: [
                {
                    title: "History",
                    url: "#",
                },
                {
                    title: "Starred",
                    url: "#",
                },
                {
                    title: "Settings",
                    url: "#",
                },
            ],
        },
        {
            title: "Models",
            url: "#",
            icon: Bot,
            items: [
                {
                    title: "Genesis",
                    url: "#",
                },
                {
                    title: "Explorer",
                    url: "#",
                },
                {
                    title: "Quantum",
                    url: "#",
                },
            ],
        },
        {
            title: "Documentation",
            url: "#",
            icon: BookOpen,
            items: [
                {
                    title: "Introduction",
                    url: "#",
                },
                {
                    title: "Get Started",
                    url: "#",
                },
                {
                    title: "Tutorials",
                    url: "#",
                },
                {
                    title: "Changelog",
                    url: "#",
                },
            ],
        },
        {
            title: "Settings",
            url: "#",
            icon: Settings2,
            items: [
                {
                    title: "General",
                    url: "#",
                },
                {
                    title: "Team",
                    url: "#",
                },
                {
                    title: "Billing",
                    url: "#",
                },
                {
                    title: "Limits",
                    url: "#",
                },
            ],
        },
    ],
    projects: [
        {
            name: "Design Engineering",
            url: "#",
            icon: Frame,
        },
        {
            name: "Sales & Marketing",
            url: "#",
            icon: PieChart,
        },
        {
            name: "Travel",
            url: "#",
            icon: Map,
        },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { user } = useUser()
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher />
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>For Staff</SidebarGroupLabel>
                    <SidebarMenu>
                        <Collapsible
                            // key={item.title}
                            asChild
                            // defaultOpen={item.isActive}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton tooltip={"Admin Routes"}>
                                        {/* {item.icon && <item.icon />} */}
                                        <UserStar />
                                        <span>Admin Managed</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        <RoleGuard allowedRoles={["admin", "scrapper"]}>
                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton asChild>
                                                    <Link href="/list-donation">
                                                        <SidebarMenuButton>
                                                            <List />
                                                            <span>
                                                                List Donation
                                                            </span>
                                                        </SidebarMenuButton>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        </RoleGuard>
                                        <RoleGuard allowedRoles={["admin"]}>
                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton asChild>
                                                    <Link href="/admin/manage-users">
                                                        <SidebarMenuButton>
                                                            <UserCog2Icon />
                                                            <span>
                                                                Manage Users
                                                            </span>
                                                        </SidebarMenuButton>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        </RoleGuard>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    </SidebarMenu>
                    <SignedOut>
                        <SidebarMenuButton>
                            <span>Login as an staff to see the navs</span>
                        </SidebarMenuButton>
                    </SignedOut>
                </SidebarGroup>
                {/* <NavMain items={data.navMain} />
                <NavProjects projects={data.projects} /> */}
            </SidebarContent>
            <SidebarFooter>
                <SignedIn>
                    {/* <NavUser user={user} /> */}
                    <ProfilePopover />
                </SignedIn>
                <SignedOut>
                    <SignInButton>
                        <SidebarMenuButton className="flex gap-2 items-center cursor-pointer p-1 rounded-md hover:bg-secondary transition-all">
                            <UserCircle />
                            <span>Login/ Signup</span>
                        </SidebarMenuButton>
                    </SignInButton>
                </SignedOut>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
