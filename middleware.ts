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
// Order matters: more specific routes MUST come before broader catch-alls.
const protectedRoutes = [
    // Verification page accessible to admin and moderator (placed first so it matches before general /admin)
    {
        matcher: createRouteMatcher(['/admin/verify-requests']),
        allowedRoles: ['admin', 'moderator'],
        routeName: 'Verify Requests'
    },
    // All other admin routes (catch-all). We removed the unsupported negative lookahead pattern.
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
        matcher: createRouteMatcher(['/scrapper(.*)']),
        allowedRoles: ['admin', 'scrapper'],
        routeName: 'Scrapper'
    },
    {
        matcher: createRouteMatcher(['/list-donation(.*)']),
        allowedRoles: ['admin', 'scrapper'],
        routeName: 'List Donation'
    },
    {
        matcher: createRouteMatcher(['/dashboard(.*)']),
        allowedRoles: ['admin', 'moderator', 'user', 'scrapper'],
        routeName: 'Dashboard'
    }
]

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth()
    
    if (!isPublicRoute(req) && !userId) {
        console.log('User not authenticated, redirecting to sign-in')
        console.log('userId:', userId)
        console.log('Request URL:', req.url)

        const signInUrl = new URL('/sign-in', req.url)

        // Store last attempted URL in a cookie
        const res = NextResponse.redirect(signInUrl)
        res.cookies.set('redirectTo', req.nextUrl.pathname + req.nextUrl.search, {
            path: '/',
            httpOnly: true,
        })
        return res
    }


    // Then check role-based authorization for protected routes
    for (const route of protectedRoutes) {
        if (route.matcher(req)) {
            const userRole = ((await auth()).sessionClaims?.metadata as { role?: string } | undefined)?.role

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
},
    {
        authorizedParties: ['http://localhost:3000', 'https://localhost:3000', 'https://khadimemillat.org', 'https://www.khadimemillat.org']
    }
)

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
}