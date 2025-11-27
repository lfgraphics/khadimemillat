import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/marketplace(.*)',
    '/campaigns(.*)',
    '/welfare-programs(.*)',
    '/donors',
    '/about',
    '/activities(.*)',
    '/programs',
    '/contribute',
    '/sponsorship',
    '/transparency',
    '/contact',
    '/thank-you(.*)',
    '/thank-you',
    '/donate(.*)',
    '/our-services(.*)',
    '/api/public(.*)',
    '/api/receipts(.*)',
    '/api/upload/cloudinary(.*)',
    '/api/razorpay(.*)',
    '/workflow'
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
    {
        matcher: createRouteMatcher(['admin/money-donations']),
        allowedRoles: ['admin', 'moderator', 'accountant'],
        routeName: 'Verify Requests'
    },
    // Main Admin Dashboard accessible to admin and moderator
    {
        matcher: createRouteMatcher(['/admin']),
        allowedRoles: ['admin', 'moderator'],
        routeName: 'Admin Dashboard'
    },
    // All other admin routes (catch-all). We removed the unsupported negative lookahead pattern.
    {
        matcher: createRouteMatcher(['/admin(.*)']),
        allowedRoles: ['admin'],
        routeName: 'Admin Level'
    },
    {
        matcher: createRouteMatcher(['/admin/navigation(.*)']),
        allowedRoles: ['admin', 'moderator'],
        routeName: 'Admin Level'
    },
    {
        matcher: createRouteMatcher(['/api/protected/users(.*)']),
        allowedRoles: ['admin', 'moderator', 'user', 'field_executive', 'accountant', 'surveyor'],
        routeName: 'User Management'
    },
    {
        matcher: createRouteMatcher(['/moderator(.*)', '/manage(.*)']),
        allowedRoles: ['admin', 'moderator'],
        routeName: 'Moderator'
    },
    {
        matcher: createRouteMatcher(['/field-executive(.*)']),
        allowedRoles: ['admin', 'field_executive', 'moderator'],
        routeName: 'Scrap Management'
    },
    {
        matcher: createRouteMatcher(['/list-donation(.*)']),
        allowedRoles: ['admin', 'field_executive', 'moderator'],
        routeName: 'List Donation'
    },
    {
        matcher: createRouteMatcher(['/dashboard(.*)']),
        allowedRoles: ['admin', 'moderator', 'user', 'field_executive'],
        routeName: 'Dashboard'
    },
    {
        matcher: createRouteMatcher(['/surveyor(.*)', '/api/sponsorship(.*)', '/api/sponsorship/survey/draft']),
        allowedRoles: ['admin', 'moderator', 'surveyor'],
        routeName: 'Dashboard'
    },
    {
        matcher: createRouteMatcher(['/admin/expenses(.*)', '/api/expenses(.*)']),
        allowedRoles: ['admin', 'moderator', 'accountant'],
        routeName: 'Expense Management'
    },
    {
        matcher: createRouteMatcher(['/admin/gullak(.*)', '/api/expenses(.*)']),
        allowedRoles: ['admin', 'moderator', 'accountant'],
        routeName: 'Expense Management'
    },
    {
        matcher: createRouteMatcher(['/api/cash-intake(.*)', '/cash-intake']),
        allowedRoles: ['admin', 'moderator', 'accountant', 'auditor'],
        routeName: 'Cash Intake'
    },
    {
        matcher: createRouteMatcher(['/gullak-caretaker(.*)']),
        allowedRoles: ['admin', 'moderator', 'neki_bank_manager', 'gullak_caretaker'],
        routeName: 'Gullak Caretaker'
    }
]

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth()

    if (!isPublicRoute(req) && !userId) {
        if (req.nextUrl.pathname.startsWith('/api/')) {
            // Return JSON error for API routes instead of redirecting
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            )
        }

        // Only redirect non-API routes to sign-in
        const signInUrl = new URL('/sign-in', req.url)
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
        authorizedParties: ['http://localhost:3000', 'http://192.168.19.223:3000', 'https://localhost:3000', 'https://khadimemillat.org', 'https://www.khadimemillat.org']
    }
)

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
}
