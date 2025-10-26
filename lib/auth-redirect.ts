import { redirect } from 'next/navigation'

/**
 * Redirects to sign-in page while preserving the current URL for post-auth redirect
 * @param currentPath - The current path to redirect back to after sign-in
 */
export function redirectToSignIn(currentPath?: string) {
  if (currentPath) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(currentPath)}`)
  } else {
    redirect('/sign-in')
  }
}