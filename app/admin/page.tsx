import { ImageModalProvider } from '@/components/marketplace/ImageModalProvider'
import AdminDashboardClient from './AdminDashboardClient'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return (
    <ImageModalProvider>
      <AdminDashboardClient />
    </ImageModalProvider>
  )
}
