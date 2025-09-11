'use client'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
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
import { UserCircle } from "lucide-react"
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
                        
                        <Link href="/list-donation">List Donation</Link>
                    </RoleGuard>
                </SidebarGroup>

                {/* Public Pages pages */}
                <SidebarGroup>
                </SidebarGroup>

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