'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'

export default function SeedPage() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)

  const handleSeed = async () => {
    setIsSeeding(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/seed-welfare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: 'Database seeded successfully!',
          details: data
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to seed database'
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error occurred while seeding database'
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Database Seeding</span>
          </CardTitle>
          <CardDescription>
            Seed the database with sample welfare programs, campaigns, and donations.
            This will clear existing welfare data and create fresh sample data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Warning</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  This will delete all existing welfare programs, campaigns, and donations. 
                  Only use this in development or when you want to reset the welfare data.
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSeed} 
            disabled={isSeeding}
            className="w-full"
            size="lg"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding Database...
              </>
            ) : (
              'Seed Welfare Programs Database'
            )}
          </Button>

          {result && (
            <div className={`rounded-lg p-4 ${
              result.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div>
                  <h4 className={`font-medium ${
                    result.success 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {result.success ? 'Success!' : 'Error'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    result.success 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {result.message}
                  </p>
                  {result.success && result.details && (
                    <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                      <p>Programs created: {result.details.programsCreated}</p>
                      <p>Campaigns created: {result.details.campaignsCreated}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {result?.success && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Next steps:</p>
              <div className="space-y-1 text-sm">
                <p>• Visit <a href="/welfare-programs" className="text-primary hover:underline">/welfare-programs</a> to see the programs</p>
                <p>• Visit <a href="/" className="text-primary hover:underline">home page</a> to see them in the programs section</p>
                <p>• Visit <a href="/admin/welfare-programs" className="text-primary hover:underline">/admin/welfare-programs</a> to manage them</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}