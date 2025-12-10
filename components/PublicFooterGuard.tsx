'use client'
import { useUser } from '@clerk/nextjs'
import { Roles } from '@/types/globals'

interface PublicFooterGuardProps {
    children: React.ReactNode
}

export default function PublicFooterGuard({ children }: PublicFooterGuardProps) {
    const { isLoaded, isSignedIn, user } = useUser()

    // Show loading state while checking auth
    if (!isLoaded) {
        return <>{children}</>
    }

    // Show footer for signed out users
    if (!isSignedIn) {
        return <>{children}</>
    }

    // For signed in users, check their role
    const userRole = user?.publicMetadata?.role as Roles | undefined

    // Show footer for users with 'user' role or no role
    if (!userRole || userRole === 'user') {
        return <>{children}</>
    }

    // Hide footer for other roles (admin, moderator, etc.)
    return null
}