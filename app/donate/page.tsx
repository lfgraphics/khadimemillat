"use client";
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import DonationForm from '@/components/DonationForm';
import { CollectionRequestForm } from '@/components/CollectionRequestForm';

type Tab = 'money' | 'scrap'

export default function DonationPage() {
  const [tab, setTab] = useState<Tab>('money')

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
                <CardContent>
                  <DonationForm campaignSlug="general-fund" />
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
                      console.log('Collection request submitted:', data)
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