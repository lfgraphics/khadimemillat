import { Metadata } from "next"
import { notFound } from "next/navigation"
import CampaignEditForm from "@/components/admin/CampaignEditForm"
import { getCampaignById } from "@/server/campaigns"

interface EditCampaignPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditCampaignPageProps): Promise<Metadata> {
  const { id } = await params
  const campaign = await getCampaignById(id)
  
  return {
    title: campaign ? `Edit ${campaign.title} | Admin` : "Campaign Not Found | Admin",
    description: campaign ? `Edit campaign: ${campaign.title}` : "Campaign not found"
  }
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const { id } = await params
  const campaign = await getCampaignById(id)

  if (!campaign) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Campaign</h1>
        <CampaignEditForm campaign={campaign} />
      </div>
    </div>
  )
}