import { SignIn } from '@clerk/nextjs'
import { cookies } from 'next/headers'

interface PageProps {
    searchParams: Promise<{ redirectTo?: string }>
}

export default async function Page({ searchParams }: PageProps) {
    const cookieStore = await cookies()
    const params = await searchParams
    
    // Priority: URL parameter > Cookie > Default dashboard
    const redirectTo = params.redirectTo || cookieStore.get('redirectTo')?.value || '/dashboard'
    
    return (
        <div className='w-full h-screen flex justify-center items-center'>
            <SignIn afterSignInUrl={redirectTo} />
        </div>
    )
}