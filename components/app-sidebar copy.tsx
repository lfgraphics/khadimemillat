'use client'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
    SignInButton,
    SignedIn,
    SignedOut,
    useUser
} from '@clerk/nextjs'
import Loading from "@/app/loading"
import ProfileDropdown from "./profile-dropdown"
import Link from "next/link"
import { Heart, List, UserCircle } from "lucide-react"
import RoleGuard from "./role-guard"

export function AppSidebar() {
    const { isLoaded, isSignedIn, user } = useUser()

    if (!isLoaded) {
        return <Loading />
    }

    return (
        <Sidebar>
            <SidebarHeader>
                <Link href="/" className="flex gap-2 items-center hover:bg-secondary transition-all p-1 rounded-md">
                    <img className="rounded-md w-[60px]" src="/android-chrome-512x512.png" />
                    <div className="branding flex flex-col items-start">
                        <h1 className="font-bold text-xl">KMWF</h1>
                        <h6 className="font-semibold text-sm">Khadim-e-Millat Welfare Foundation</h6>
                    </div>
                </Link>
            </SidebarHeader>

            <SidebarContent className="p-4">
                {/* Administrative rights pages */}
                <SidebarGroup>
                    <RoleGuard allowedRoles={["admin", "scrapper"]}>
                        <div className="flex gap2">
                            <List />
                            <Link href="/list-donation">List Donation</Link>
                        </div>
                    </RoleGuard>
                </SidebarGroup>

                {/* Public Pages pages */}
                <SignedIn>
                    <SidebarGroup>
                        <SidebarGroupLabel>Public routes</SidebarGroupLabel>
                        <SidebarMenuItem>
                            <Link href="/donate" data-testid="donate-button">
                                <Heart className="mr-2 h-5 w-5" />
                                Donate Scrap
                            </Link>
                        </SidebarMenuItem>
                    </SidebarGroup>
                </SignedIn>

            </SidebarContent>

            <SidebarFooter className="p-4">
                <SignedIn>
                    <ProfileDropdown />
                </SignedIn>
                <SignedOut>
                    <SignInButton>
                        <div className="flex gap-2 items-center cursor-pointer p-1 rounded-md hover:bg-secondary transition-all">
                            <UserCircle />
                            Login/ Signup
                        </div>
                    </SignInButton>
                </SignedOut>
            </SidebarFooter>
        </Sidebar>
    )
}