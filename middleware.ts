import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/marketplace(.*)',
    '/about-us',
    '/our-services(.*)',
    '/api/public(.*)',
])

// Define protected routes and their allowed roles
const protectedRoutes = [
    {
        matcher: createRouteMatcher(['/admin(.*)']),
        allowedRoles: ['admin'],
        routeName: 'Admin'
    },
    {
        matcher: createRouteMatcher(['/moderator(.*)', '/manage(.*)']),
        allowedRoles: ['admin', 'moderator'],
        routeName: 'Moderator'
    },
    {
        matcher: createRouteMatcher(['/dashboard(.*)']),
        allowedRoles: ['admin', 'moderator', 'user'],
        routeName: 'Dashboard'
    }
]

export default clerkMiddleware(async (auth, req) => {
    // First, protect all non-public routes (authentication check)
    if (!isPublicRoute(req)) {
        await auth.protect()
    }

    // Then check role-based authorization for protected routes
    for (const route of protectedRoutes) {
        if (route.matcher(req)) {
            const userRole = (await auth()).sessionClaims?.metadata?.role

            // In your middleware
            if (!userRole || !route.allowedRoles.includes(userRole)) {
                const errorUrl = new URL('/unauthorized', req.url)
                errorUrl.searchParams.set('message', `Access denied. ${route.routeName} area requires one of the following roles: ${route.allowedRoles.join(', ')}`)
                errorUrl.searchParams.set('userRole', userRole || 'No role assigned')
                errorUrl.searchParams.set('requiredRoles', route.allowedRoles.join(', '))
                errorUrl.searchParams.set('path', req.nextUrl.pathname)

                return NextResponse.redirect(errorUrl)
            }
            break // Exit loop once we find a matching route
        }
    }
})

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
}