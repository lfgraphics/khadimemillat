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
    ShoppingBag,
    Info,
    Image as ImageIcon,
    Menu,
    HeartPlus,
    BookOpenCheck
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from "next/link"
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { TeamSwitcher } from "./team-switcher"
import ProfilePopover from "./profile-dropdown"
import RoleGuard from "./role-guard"

export function MobileNav() {
    const [open, setOpen] = React.useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Menu className="h-10 w-10 md:h-5 md:w-5" />
                {/* <span className="sr-only">Toggle navigation menu</span> */}
                {/* <Button variant="ghost" className="text-lg">
                </Button> */}
            </SheetTrigger>
            <SheetContent side="left" className="w-70 p-0">
                <SheetHeader className="border-b p-4">
                    <SheetTitle />
                    <SheetDescription />
                    <TeamSwitcher />
                </SheetHeader>

                <div className="flex-1 overflow-auto p-4">
                    <Link
                        href="/notifications"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                        onClick={() => setOpen(false)}
                    >
                        <BellIcon className="h-4 w-4" />
                        Notifications
                    </Link>

                    {/* Admin Section */}
                    <RoleGuard allowedRoles={["admin", "moderator"]}>
                        <div className="mb-6">
                            <h3 className="mb-2 px-2 text-sm font-semibold text-muted-foreground">Admin</h3>
                            <div className="space-y-1">
                                <Link
                                    href="/admin"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <LayoutDashboard className="h-4 w-4" />
                                    Dashboard
                                </Link>
                                <Link
                                    href="/admin/verify-requests"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <ClipboardCheck className="h-4 w-4" />
                                    Verify Requests
                                </Link>
                                <Link
                                    href="/admin/create-collection-request"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <Plus className="h-4 w-4" />
                                    Create Collection Request
                                </Link>
                                <Link
                                    href="/admin/manage-users"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <UserCog2Icon className="h-4 w-4" />
                                    Manage Users
                                </Link>
                                <Link
                                    href="/list-donation"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <ListIcon className="h-4 w-4" />
                                    List Donation
                                </Link>
                                <Link
                                    href="/admin/money-donations"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <Heart className="h-4 w-4" />
                                    Money Donations
                                </Link>
                                <Link
                                    href="/admin/welfare-programs"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <HandHeart className="h-4 w-4" />
                                    Welfare Programs
                                </Link>
                                <Link
                                    href="/admin/campaigns"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <Target className="h-4 w-4" />
                                    Campaigns
                                </Link>
                                <Link
                                    href="/admin/notifications"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <BellDot className="h-4 w-4" />
                                    Manage Notifications
                                </Link>
                                <Link
                                    href="/admin/activities"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <ImageIcon className="h-4 w-4" />
                                    Manage Activities
                                </Link>
                            </div>
                        </div>
                    </RoleGuard>

                    {/* Scrapper Section */}
                    <RoleGuard allowedRoles={["scrapper", "admin"]}>
                        <div className="mb-6">
                            <h3 className="mb-2 px-2 text-sm font-semibold text-muted-foreground">Scrapper</h3>
                            <div className="space-y-1">
                                <Link
                                    href="/scrapper/assigned"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <Truck className="h-4 w-4" />
                                    Assigned
                                </Link>
                                <Link
                                    href="/list-donation"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <ListIcon className="h-4 w-4" />
                                    List Donation
                                </Link>
                            </div>
                        </div>
                    </RoleGuard>

                    {/* Moderator Section */}
                    <RoleGuard allowedRoles={["moderator", "admin"]}>
                        <div className="mb-6">
                            <h3 className="mb-2 px-2 text-sm font-semibold text-muted-foreground">Moderator</h3>
                            <div className="space-y-1">
                                <Link
                                    href="/moderator/review"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <FileCheck className="h-4 w-4" />
                                    Review
                                </Link>
                            </div>
                        </div>
                    </RoleGuard>

                    {/* General Section */}
                    <div className="mb-6">
                        <h3 className="mb-2 px-2 text-sm font-semibold text-muted-foreground">General</h3>
                        <div className="space-y-1">
                            <Link
                                href="/about"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                onClick={() => setOpen(false)}
                            >
                                <Info className="h-4 w-4" />
                                About Us
                            </Link>
                            <Link
                                href="/transparency"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                onClick={() => setOpen(false)}
                            >
                                <BookOpenCheck className="h-4 w-4" />
                                Transparency
                            </Link>
                            <Link
                                href="/contribute"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                onClick={() => setOpen(false)}
                            >
                                <HeartPlus className="h-4 w-4" />
                                Ways To Contribute
                            </Link>
                            <Link
                                href="/donate"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                onClick={() => setOpen(false)}
                            >
                                <Heart className="h-4 w-4" />
                                Donate
                            </Link>
                            <Link
                                href="/welfare-programs"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                onClick={() => setOpen(false)}
                            >
                                <HandHeart className="h-4 w-4" />
                                Welfare Programs
                            </Link>
                            <Link
                                href="/marketplace"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                onClick={() => setOpen(false)}
                            >
                                <Store className="h-4 w-4" />
                                Marketplace
                            </Link>
                            <Link
                                href="/activities"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                onClick={() => setOpen(false)}
                            >
                                <ImageIcon className="h-4 w-4" />
                                Activities
                            </Link>
                            <Link
                                href="/my-donations"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                onClick={() => setOpen(false)}
                            >
                                <Heart className="h-4 w-4" />
                                My Donations
                            </Link>
                            <Link
                                href="/account#purchases"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                onClick={() => setOpen(false)}
                            >
                                <ShoppingBag className="h-4 w-4" />
                                My Purchases
                            </Link>
                            <Link
                                href="/conversations"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                onClick={() => setOpen(false)}
                            >
                                <MessageSquare className="h-4 w-4" />
                                My Conversations
                            </Link>
                            <RoleGuard allowedRoles={["admin", "moderator", "scrapper"]}>
                                <Link
                                    href="/scanner"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                    onClick={() => setOpen(false)}
                                >
                                    <Scan className="h-4 w-4" />
                                    Barcode Scanner
                                </Link>
                            </RoleGuard>
                            <Link
                                href="/account"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hoact:bg-accent"
                                onClick={() => setOpen(false)}
                            >
                                <UserIcon className="h-4 w-4" />
                                Account
                            </Link>
                            {/* <div className="z-[2200]">
                                <ThemeChanger />
                            </div> */}
                        </div>
                    </div>
                </div>

                <SheetFooter className="border-t p-4">
                    <SignedOut>
                        <SignInButton>
                            <Button variant="outline" className="w-full">
                                <UserCircle className="mr-2 h-4 w-4" />
                                Login / Signup
                            </Button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <ProfilePopover />
                    </SignedIn>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}