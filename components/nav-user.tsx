"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
  UserCog,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { UserResource } from "@clerk/types"
import { SignedIn, SignOutButton } from "@clerk/nextjs"
import { Button } from "./ui/button"
import ThemeChanger from "./ThemeChanger"
import Link from "next/link"


export function NavUser({ user }: { user: UserResource | undefined | null }) {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.imageUrl || ""} alt={user?.fullName || "User"} />
                <AvatarFallback className="rounded-lg">U</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.fullName}</span>
                <span className="truncate text-xs">{String(user?.publicMetadata?.role) !== "undefined" ? String(user?.publicMetadata.role) : "User"}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.imageUrl || ""} alt={user?.fullName || "User"} />
                  <AvatarFallback className="rounded-lg">U</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.fullName}</span>
                  <span className="truncate text-xs">{user?.primaryEmailAddress?.emailAddress || ""}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <SignedIn>
              <DropdownMenuGroup>
                <Link href="/account" className="flex items-center gap-2 py-1.5 rounded-md text-sm">
                  <DropdownMenuItem className="w-full h-full">
                    <UserCog className="h-4 w-4" />
                    Account
                  </DropdownMenuItem>
                </Link>
                <Link href="/notifications" className="flex items-center gap-2 py-1.5 rounded-md text-sm">
                  <DropdownMenuItem className="w-full h-full">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem>
                  <ThemeChanger />
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </SignedIn>

            <DropdownMenuSeparator />
            <SignOutButton>
              <DropdownMenuItem>
                <button className="flex items-center gap-2 rounded-md text-sm text-red-600 w-full">
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
