'use client'

import React, { useState } from 'react'
import { SimpleReceiptUpload } from './index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReceiptFile {
  url: string
  publicId: string
  fileName: string
  fileSize: number
  uploadedAt: Date
  fileType: string
}

export function ReceiptUploadTest() {
  const [receipts, setReceipts] = useState<ReceiptFile[]>([])

  const handleReceiptsChange = (newReceipts: ReceiptFile[]) => {
    console.log('Receipts updated:', newReceipts)
    setReceipts(newReceipts)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Receipt Upload Test</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleReceiptUpload
            expenseId={undefined} // Test without expense ID
            existingReceipts={[]}
            onReceiptsChange={handleReceiptsChange}
            disabled={false}
            maxReceipts={5}
          />
        </CardContent>
      </Card>

      {/* Debug info */}
      {receipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Debug: Current Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
              {JSON.stringify(receipts, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ReceiptUploadTest