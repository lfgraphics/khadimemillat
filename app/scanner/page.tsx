'use client'
import RoleGuard from '@/components/role-guard'
import dynamic from 'next/dynamic'

const BarcodeScanner = dynamic(() => import('@/components/scanner/BarcodeScanner'), { ssr: false })

export default function ScannerPage() {
  return (
    <RoleGuard allowedRoles={["admin", "moderator", "field_executive"]}>
      <div className="p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Barcode Scanner</h1>
        <p className="text-sm text-muted-foreground">Scan item barcodes to view details and donor information.</p>
        <BarcodeScanner />
      </div>
    </RoleGuard>
  )
}
