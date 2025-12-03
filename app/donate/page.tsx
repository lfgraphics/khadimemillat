"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import DonationForm from '@/components/DonationForm';
import { CollectionRequestForm } from '@/components/CollectionRequestForm';
import { toast } from 'sonner';

type Tab = 'money' | 'scrap'

interface DonationCause {
  value: string;
  label: string;
  description?: string;
}

export default function DonationPage() {
  const [tab, setTab] = useState<Tab>('money')
  const searchParams = useSearchParams()
  const [selectedCause, setSelectedCause] = useState('sadqa') // Default to first cause
  const [donationCauses, setDonationCauses] = useState<DonationCause[]>([])
  const [causesLoading, setCausesLoading] = useState(true)

  // Fetch dynamic causes from welfare programs
  useEffect(() => {
    const fetchCauses = async () => {
      try {
        setCausesLoading(true)
        const res = await fetch('/api/public/welfare-programs?format=simple')
        if (!res.ok) {
          throw new Error('Failed to fetch welfare programs')
        }
        const data = await res.json()
        if (data.programs && Array.isArray(data.programs)) {
          setDonationCauses(data.programs)
          // Set default selected cause to the first available program
          if (data.programs.length > 0 && !selectedCause) {
            setSelectedCause(data.programs[0].value)
          }
        }
      } catch (error) {
        console.error('[FETCH_CAUSES_ERROR]', error)
        toast.error('Failed to load donation causes')
        // Fallback to sadqa if API fails
        setDonationCauses([
          { value: 'sadqa', label: 'Sadqa' },
          { value: 'zakat', label: 'Zakat' },
          { value: 'education', label: 'Education Support' },
          { value: 'healthcare', label: 'Healthcare Access' },
          { value: 'emergency', label: 'Emergency Relief' }
        ])
        setSelectedCause('sadqa')
      } finally {
        setCausesLoading(false)
      }
    }

    fetchCauses()
  }, [])

  // Pre-populate cause from URL 'program' parameter
  useEffect(() => {
    const programParam = searchParams?.get('program')
    if (!programParam || donationCauses.length === 0) return

    const lower = programParam.toLowerCase()

    // Try to find exact match first
    const exactMatch = donationCauses.find(cause => cause.value === lower)
    if (exactMatch) {
      setSelectedCause(exactMatch.value)
      return
    }

    // Fallback to partial matching
    if (lower.includes('zakat')) {
      const zakatCause = donationCauses.find(c => c.value.includes('zakat'))
      if (zakatCause) setSelectedCause(zakatCause.value)
    } else if (lower.includes('sadqa') || lower.includes('sadaq')) {
      const sadqaCause = donationCauses.find(c => c.value.includes('sadqa'))
      if (sadqaCause) setSelectedCause(sadqaCause.value)
    } else if (lower.includes('health')) {
      const healthCause = donationCauses.find(c => c.value.includes('health'))
      if (healthCause) setSelectedCause(healthCause.value)
    } else if (lower.includes('educ')) {
      const educCause = donationCauses.find(c => c.value.includes('education'))
      if (educCause) setSelectedCause(educCause.value)
    } else if (lower.includes('emerg')) {
      const emergCause = donationCauses.find(c => c.value.includes('emergency'))
      if (emergCause) setSelectedCause(emergCause.value)
    }
  }, [searchParams, donationCauses])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Donate
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Contribute via scrap pickup or monetary support.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="money" className="text-sm font-medium">
                Money
              </TabsTrigger>
              <TabsTrigger value="scrap" className="text-sm font-medium">
                Scrap
              </TabsTrigger>
            </TabsList>

            <TabsContent value="money">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-center">
                    Monetary Donation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Campaign/Program Selection */}
                  <div>
                    <Label htmlFor="cause-select" className="text-sm font-medium text-foreground mb-2 block">
                      Select Cause/Program
                    </Label>
                    <Select
                      value={selectedCause}
                      onValueChange={setSelectedCause}
                      disabled={causesLoading}
                    >
                      <SelectTrigger id="cause-select">
                        <SelectValue placeholder={causesLoading ? "Loading causes..." : "Select a cause"} />
                      </SelectTrigger>
                      <SelectContent>
                        {donationCauses.map((cause) => (
                          <SelectItem key={cause.value} value={cause.value}>
                            <div>
                              <div className="font-medium">{cause.label}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <DonationForm campaignSlug={selectedCause} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scrap">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-center">
                    Scrap Collection Request
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CollectionRequestForm
                    submitLabel="Submit Request"
                    showFileUpload={true}
                    onSuccess={(data) => {
                      toast.success('Collection request submitted successfully!')
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
