import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Explicitly listed public routes
const PUBLIC_PATHS = [
    '/',
    '/shop',
    '/privacy-policy',
    '/refund-policy',
    '/return-policy',
    '/about-us',
]

export default clerkMiddleware((auth, req) => {
    const { pathname } = req.nextUrl

    // ✅ Public pages
    if (PUBLIC_PATHS.includes(pathname)) {
        return NextResponse.next()
    }

    // ✅ our-services/*
    if (pathname.startsWith('/our-services')) {
        return NextResponse.next()
    }

    // ✅ API GET endpoints
    if (pathname.startsWith('/api') && pathname.endsWith('/get')) {
        return NextResponse.next()
    }

    // 🔒 Require auth for everything else
    auth.protect()
})

export const config = {
    matcher: [
        // Skip Next.js internals & static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}
