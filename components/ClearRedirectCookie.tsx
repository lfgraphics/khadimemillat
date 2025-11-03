'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export default function ClearRedirectCookie() {
  const { isSignedIn } = useUser()

  useEffect(() => {
    if (isSignedIn) {
      // Clear the redirect cookie after successful sign-in
      if (typeof document !== 'undefined') {
        document.cookie = 'redirectTo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    }
  }, [isSignedIn])

  return null
}