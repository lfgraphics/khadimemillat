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
    SignOutButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton,
    useUser
} from '@clerk/nextjs'
import ThemeChanger from "./ThemeChanger"
import Loading from "@/app/loading"

export function AppSidebar() {
    const { isLoaded, isSignedIn, user } = useUser()
    if (!isLoaded || !isSignedIn) {
        return <Loading />
    }
    return (
        <Sidebar>
            <SidebarHeader>
                <SignedOut>
                    <SignInButton />
                    {/* <SignUpButton>
                        <button className="bg-[#6c47ff] text-ceramic-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                            Sign Up
                        </button>
                    </SignUpButton> */}
                </SignedOut>
                <SignedIn>
                    <div className="flex gap-2 items-center">
                        <UserButton />
                        <h3>Welcome, {user.firstName}!</h3>
                        <p>Email: {user.primaryEmailAddress?.emailAddress}</p>
                        <p>User ID: {user.id}</p>
                        {/* Display metadata */}
                        <div>
                            <h4>Public Metadata:</h4>
                            <pre>{JSON.stringify(user.publicMetadata, null, 2)}</pre>
                        </div>

                        <div>
                            <h4>Unsafe Metadata:</h4>
                            <pre>{JSON.stringify(user.unsafeMetadata, null, 2)}</pre>
                        </div>
                    </div>
                </SignedIn>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup />
                <SidebarGroup />
            </SidebarContent>
            <SidebarFooter>
                <ThemeChanger />
                <SignedIn>
                    <SignOutButton />
                </SignedIn>
            </SidebarFooter>
        </Sidebar>
    )
}