import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AdminExpensesDashboard, ModeratorExpensesView, AuditorReportsView } from '@/components/expenses'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const { sessionClaims } = await auth()
  
  if (!sessionClaims?.metadata?.role) {
    redirect('/unauthorized')
  }

  const userRole = sessionClaims.metadata.role as string

  // Check if user has permission to access expense management
  const allowedRoles = ['admin', 'moderator', 'accountant']
  if (!allowedRoles.includes(userRole)) {
    redirect('/unauthorized')
  }

  // Render appropriate dashboard based on role
  if (userRole === 'admin') {
    return <AdminExpensesDashboard className="container mx-auto py-6" />
  }
  
  if (userRole === 'moderator') {
    return <ModeratorExpensesView className="container mx-auto py-6" />
  }
  
  if (userRole === 'accountant') {
    return <AuditorReportsView className="container mx-auto py-6" />
  }

  // Fallback - should not reach here
  redirect('/unauthorized')
}