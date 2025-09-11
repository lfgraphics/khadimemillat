"use client"

import React, { useEffect, useState } from "react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    LogOut,
    Bell,
    UserCog,
    ChevronsUpDown,
} from "lucide-react"
import { SignOutButton, useUser } from "@clerk/nextjs"
import ThemeChanger from "./ThemeChanger"
import { Separator } from "./ui/separator"
import Link from "next/link"

type Placement = {
    side: "right" | "bottom"
    align: "end" | "center"
}

export default function ProfilePopover() {
    const { user } = useUser()

    // Default to desktop placement; update on mount using matchMedia
    const [placement, setPlacement] = useState<Placement>({
        side: "right",
        align: "end",
    })

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 640px)") // <-> sm breakpoint
        const onChange = () => {
            setPlacement(mq.matches ? { side: "bottom", align: "center" } : { side: "right", align: "end" })
        }

        onChange() // set initial value
        // modern browsers: addEventListener (MediaQueryListEvent)
        mq.addEventListener?.("change", onChange)
        // fallback for older browsers:
        // @ts-ignore
        if (!mq.addEventListener && mq.addListener) mq.addListener(onChange)

        return () => {
            mq.removeEventListener?.("change", onChange)
            // @ts-ignore
            if (!mq.removeEventListener && mq.removeListener) mq.removeListener(onChange)
        }
    }, [])

    const triggerContent = (
        <div className="flex items-center justify-between gap-2 cursor-pointer rounded-md p-1 hover:bg-secondary w-full">
            <div className="flex gap-2 items-center">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.imageUrl || ""} alt={user?.fullName || "User"} />
                    <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left">
                    <span className="text-sm font-medium">{user?.fullName || "shadcn"}</span>
                    <span className="text-xs text-muted-foreground">{String(user?.publicMetadata.role) || "user"}</span>
                </div>
            </div>
            <ChevronsUpDown size={20} className="text-muted-foreground" />
        </div>
    )

    const menuContent = (
        <div className="flex flex-col gap-1">
            {/* Header */}
            <div className="flex flex-col px-2 py-1.5">
                <span className="text-sm font-medium">{user?.fullName || "shadcn"}</span>
                <span className="text-xs text-muted-foreground truncate">
                    {user?.primaryEmailAddress?.emailAddress || "m@example.com"}
                </span>
            </div>

            <Separator />

            {/* Items */}
            <Link href="/account" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm">
                <UserCog className="h-4 w-4" />
                Account
            </Link>

            <Link href="/notifications" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm">
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
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm text-red-600 w-full">
                    <LogOut className="h-4 w-4" />
                    Log out
                </button>
            </SignOutButton>
        </div>
    )

    // responsive class for width & rounding: bottom -> full-ish, right -> fixed width
    const contentClass =
        placement.side === "bottom"
            ? "w-[calc(100%-32px)] max-w-md p-3 rounded-t-xl shadow-lg" // mobile-friendly bottom popover
            : "w-56 p-2 rounded-md shadow-lg" // desktop sidebar popover

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