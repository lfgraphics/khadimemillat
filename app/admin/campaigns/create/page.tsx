import { Metadata } from "next"
import CampaignForm from "@/components/admin/CampaignForm"

export const metadata: Metadata = {
  title: "Create Campaign | Admin",
  description: "Create a new campaign for a welfare program"
}

export default function CreateCampaignPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create New Campaign</h1>
        <CampaignForm />
      </div>
    </div>
  )
}