import { Button } from "@/components/ui/button";
import { SidebarMenuButton, SidebarTrigger } from "./ui";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { UserCircle } from "lucide-react";
import Link from "next/link";

const navigationItems = [
    { name: "Marketplace", href: "/marketplace" },
    { name: "Donate", href: "/donate" },
    { name: "About Us", href: "/about" },
    { name: "Activities", href: "/activities" },
];

const TopNav = () => {
    return (
        <div className="h-15 fixed top-0 w-[80%] flex justify-between items-center p-4 bg-muted/65 backdrop-blur-lg shadow z-[999]">
            <nav className="hidden md:flex justify-center gap-4">
                {navigationItems.map((item, index) => (
                    <Link
                        key={index}
                        href={item.href}
                        className="font-medium"
                    >
                        {item.name}
                    </Link>
                ))}
            </nav>
            <SidebarTrigger className="fixed top-3 z-50 scale-150" />
            <Link href="/" className="left-10">
                <div className="flex items-center gap-2">
                    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                        <img className="rounded-md w-[60px]" src="/android-chrome-512x512.png" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight h-max">
                        <span className="font-medium">Khadim-e-Millat Welfare Foundation</span>
                    </div>
                </div>
            </Link>
            <SignedOut>
                <SignInButton>
                    <div className="flex gap-2 items-center">
                        <UserCircle className="h-4 w-4" />
                        <span>Login / Signup</span>
                    </div>
                </SignInButton>
            </SignedOut>
            <SignedIn>
                <SignedIn>
                    <UserButton />
                </SignedIn>
            </SignedIn>
        </div >
    )
}

export default TopNav
