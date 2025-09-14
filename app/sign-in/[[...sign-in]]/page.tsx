import { SignIn } from '@clerk/nextjs'

export default function Page() {
    return (<div className='w-full h-screen flex justify-center items-center'>
        <SignIn afterSignInUrl={typeof window !== "undefined" ? window.location.pathname : "/"} />
    </div>)
}