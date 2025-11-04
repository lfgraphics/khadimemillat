"use client"

import React, { useEffect, useState } from "react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    LogOut,
    Bell,
    UserCog,
    ChevronsUpDown,
} from "lucide-react"
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs"
import ThemeChanger from "./ThemeChanger"
import { Separator } from "./ui/separator"
import Link from "next/link"

// --- same placement type ---
type Placement = {
    side: "right" | "bottom"
    align: "end" | "center"
}

export default function ProfilePopover() {
    const { user } = useUser()

    const [placement, setPlacement] = useState<Placement>({
        side: "right",
        align: "end",
    })

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 640px)")
        const onChange = () => {
            setPlacement(
                mq.matches
                    ? { side: "bottom", align: "center" }
                    : { side: "right", align: "end" }
            )
        }

        onChange()
        mq.addEventListener?.("change", onChange)
        // @ts-ignore fallback
        if (!mq.addEventListener && mq.addListener) mq.addListener(onChange)

        return () => {
            mq.removeEventListener?.("change", onChange)
            // @ts-ignore fallback
            if (!mq.removeEventListener && mq.removeListener) mq.removeListener(onChange)
        }
    }, [])

    // --- NavUser style trigger ---
    const triggerContent = (
        <div className="flex items-center gap-2 p-1 cursor-pointer rounded-md hoact:bg-secondary w-full">
            <UserButton />
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                    {user?.fullName || "shadcn"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    {String(user?.publicMetadata?.role) !== "undefined"
                        ? String(user?.publicMetadata.role)
                        : "User"}
                </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
        </div>
    )

    // --- ProfilePopover internal menu (kept same styling but wrapped like NavUser) ---
    const menuContent = (
        <Popover>
            {/* Header */}
            <div className="flex items-center gap-2 px-1 py-1.5 text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.imageUrl || ""} alt={user?.fullName || "User"} />
                    <AvatarFallback className="rounded-lg">U</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user?.fullName || "shadcn"}</span>
                    <span className="truncate text-xs text-muted-foreground">
                        {user?.primaryEmailAddress?.emailAddress || "m@example.com"}
                    </span>
                </div>
            </div>

            <Separator />

            {/* Items */}
            <Link
                href="/account"
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hoact:bg-muted text-sm"
            >
                <UserCog className="h-4 w-4" />
                Account
            </Link>

            <Link
                href="/notifications"
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hoact:bg-muted text-sm"
            >
                <Bell className="h-4 w-4" />
                Notifications
            </Link>

            <Separator />
            <div className="px-2 py-1.5">
                <ThemeChanger />
            </div>
            <Separator />

            {/* Logout */}
            <SignOutButton>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hoact:bg-muted text-sm text-red-600 w-full">
                    <LogOut className="h-4 w-4" />
                    Log out
                </button>
            </SignOutButton>
        </Popover>
    )

    // responsive class for width & rounding
    const contentClass =
        placement.side === "bottom"
            ? "w-[calc(100%-32px)] max-w-md p-3 rounded-t-xl shadow-lg"
            : "w-56 p-2 rounded-md shadow-lg"

    return (
        <Popover>
            <PopoverTrigger asChild>{triggerContent}</PopoverTrigger>
            <PopoverContent
                className={contentClass}
                side={placement.side}
                align={placement.align}
                sideOffset={placement.side === "right" ? 8 : 6}
            >
                {menuContent}
            </PopoverContent>
        </Popover>
    )
}