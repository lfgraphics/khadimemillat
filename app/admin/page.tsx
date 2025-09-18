import React from 'react'

// Force this route to be dynamic (no prerender) because it depends on auth/role middleware
// and we observed a prerender PageNotFoundError during build.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">Admin</h1>
      <p className="text-sm text-muted-foreground">Admin page will be updated later.</p>
    </div>
  )
}
