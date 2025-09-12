'use client'
import { useUser } from '@clerk/nextjs'
import { Roles } from '@/types/globals'
import { Loader2 } from 'lucide-react'

interface RoleGuardProps {
    allowedRoles: Roles[]
    children: React.ReactNode
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
    const { isLoaded, isSignedIn, user } = useUser()

    if (!isLoaded) {
        return <Loader2 size={18} className="text-foreground animate-spin" />
    }

    if (!isSignedIn) {
        return null
    }

    const userRole = user?.publicMetadata?.role

    if (!userRole || !allowedRoles.includes(userRole as Roles)) {
        return null
    }

    return <>{children}</>
}