import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import connectDB from '@/lib/db'
import CampaignDonation from '@/models/CampaignDonation'
import DonationThankYou from '@/components/DonationThankYou'
import Loading from '@/components/Loading'

interface ThankYouPageProps {
  searchParams: Promise<{
    donationId?: string
    paymentId?: string
  }>
}

async function getDonationDetails(donationId: string) {
  await connectDB()
  
  const donation = await CampaignDonation.findById(donationId)
    .populate('campaignId', 'name title')
    .populate('programId', 'name title')
    .lean()
  
  if (!donation) {
    return null
  }

  return {
    donationId: (donation as any)._id.toString(),
    donorName: (donation as any).donorName,
    amount: (donation as any).amount,
    currency: 'INR',
    receiptId: (donation as any)._id.toString().slice(-8),
    certificateNumber: (donation as any).certificate80G?.certificateNumber,
    wants80G: (donation as any).wants80GReceipt || false,
    campaignName: (donation as any).campaignId?.name || (donation as any).campaignId?.title,
    programName: (donation as any).programId?.title || (donation as any).programId?.name || 'General Donation',
    razorpayPaymentId: (donation as any).razorpayPaymentId,
    donationDate: new Date((donation as any).createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }),
    status: (donation as any).status
  }
}

export default async function ThankYouPage({ searchParams }: ThankYouPageProps) {
  const params = await searchParams
  const { donationId, paymentId } = params

  if (!donationId) {
    redirect('/donate')
  }

  const donationDetails = await getDonationDetails(donationId)

  if (!donationDetails) {
    redirect('/donate')
  }

  // Only show thank you page for completed donations
  if (donationDetails.status !== 'completed') {
    redirect('/donate')
  }

  return (
    <div>
      <Suspense fallback={<Loading />}>
        <DonationThankYou {...donationDetails} />
      </Suspense>
    </div>
  )
}

// Add metadata for better SEO
export const metadata = {
  title: 'Thank You for Your Donation - Khadim-e-Millat Welfare Foundation',
  description: 'Thank you for your generous donation. Your contribution makes a real difference.',
  robots: 'noindex, nofollow'
}