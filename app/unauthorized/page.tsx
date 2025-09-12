'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Loading from '../loading'

function UnauthorizedContent() {
    const searchParams = useSearchParams()

    const message = searchParams.get('message')
    const userRole = searchParams.get('userRole')
    const requiredRoles = searchParams.get('requiredRoles')
    const path = searchParams.get('path')

    return (
        <div className="min-h-screen flex items-center justify-center">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle>
                        Access Denied
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center">

                    <div className="text-left space-y-3">
                        <div>
                            <strong>Message:</strong>
                            <p className="text-gray-700">{message}</p>
                        </div>

                        <div>
                            <strong>Your Role:</strong>
                            <p className="text-gray-700">{userRole}</p>
                        </div>

                        <div>
                            <strong>Required Roles:</strong>
                            <p className="text-gray-700">{requiredRoles}</p>
                        </div>

                        <div>
                            <strong>Attempted Path:</strong>
                            <p className="text-gray-700">{path}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="mt-6 gap-2 justify-between">
                    <Button
                        onClick={() => window.history.back()}
                        variant="default"
                    >
                        Go Back
                    </Button>

                    <Link
                        href="/"
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Home
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}

export default function UnauthorizedPage() {
    return (
        <Suspense fallback={<Loading />}>
            <UnauthorizedContent />
        </Suspense>
    )
}