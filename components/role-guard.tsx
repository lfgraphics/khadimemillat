'use client'
import { useUser } from '@clerk/nextjs'
import { Roles } from '@/types/globals'

interface RoleGuardProps {
    allowedRoles: Roles[]
    children: React.ReactNode
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
    const { isLoaded, isSignedIn, user } = useUser()

    if (!isLoaded) {
        return null // or loading spinner
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