import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { UserCircle } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "./mobile-nav";
import ThemeChanger from "./ThemeChanger";

const navigationItems = [
    { name: "Marketplace", href: "/marketplace" },
    { name: "Donate", href: "/donate" },
    { name: "About Us", href: "/about" },
    { name: "Activities", href: "/activities" },
];

const TopNav = () => {
    return (
        <div className="h-15 sticky top-0 w-full flex justify-between items-center p-4 bg-muted/65 backdrop-blur-lg shadow z-[999]">
            <div className="flex items-center gap-4">
                <MobileNav />
                <Link href="/" className="flex items-center gap-2">
                    <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                        <img className="rounded-md w-[32px]" src="/android-chrome-512x512.png" alt="Logo" />
                    </div>
                    <span className="font-medium text-sm">Khadim-e-Millat Welfare Foundation</span>
                </Link>
            </div>

            <nav className="hidden md:flex justify-center gap-6">
                {navigationItems.map((item, index) => (
                    <Link
                        key={index}
                        href={item.href}
                        className="font-medium hover:text-primary transition-colors"
                    >
                        {item.name}
                    </Link>
                ))}
            </nav>

            <div className="flex items-center gap-2">
                {/* <ThemeChanger /> */}
                <SignedOut>
                    <SignInButton>
                        <Button variant="ghost" size="sm">
                            <UserCircle className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Login / Signup</span>
                        </Button>
                    </SignInButton>
                </SignedOut>
                <SignedIn>
                    <UserButton />
                </SignedIn>
            </div>
        </div >
    )
}

export default TopNav
