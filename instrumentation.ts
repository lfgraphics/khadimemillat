/**
 * Next.js Instrumentation
 * This file runs once when the server starts, not on every request
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeServer } = await import('./lib/server-startup')
    initializeServer()
  }
}