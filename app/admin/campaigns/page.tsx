import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Plus, Edit, Trash2, Eye, Calendar, Target, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCampaigns } from "@/server/campaigns"

export const metadata: Metadata = {
  title: "Manage Campaigns | Admin",
  description: "Manage all campaigns and their settings"
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns()

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Manage all campaigns and their settings
          </p>
        </div>
        <Link href="/admin/campaigns/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Campaigns Yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first campaign to start raising funds for welfare programs.
            </p>
            <Link href="/admin/campaigns/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign._id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  )
}

function CampaignCard({ campaign }: { campaign: any }) {
  const progress = campaign.goal > 0 ? (campaign.raised / campaign.goal) * 100 : 0
  const isActive = new Date(campaign.endDate || '2099-12-31') > new Date()

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {/* Cover Image */}
        <div className="relative w-48 h-32 flex-shrink-0">
          <Image
            src={campaign.coverImage}
            alt={campaign.title}
            fill
            className="object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold text-foreground">
                  {campaign.title}
                </h3>
                {campaign.isFeatured && (
                  <Badge variant="secondary">Featured</Badge>
                )}
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Active" : "Ended"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {campaign.welfareProgram?.title || 'No Program'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Link href={`/campaigns/${campaign.slug}`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/admin/campaigns/${campaign._id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="font-semibold text-foreground">₹{(campaign.raised / 1000).toFixed(0)}K</div>
              <div className="text-xs text-muted-foreground">Raised</div>
            </div>
            <div>
              <div className="font-semibold text-foreground">₹{(campaign.goal / 1000).toFixed(0)}K</div>
              <div className="text-xs text-muted-foreground">Goal</div>
            </div>
            <div>
              <div className="font-semibold text-foreground">{campaign.supportersCount || 0}</div>
              <div className="text-xs text-muted-foreground">Supporters</div>
            </div>
            <div>
              <div className="font-semibold text-foreground">
                {Math.ceil((new Date(campaign.endDate || '2099-12-31').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-xs text-muted-foreground">Days Left</div>
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Started: {new Date(campaign.startDate).toLocaleDateString()}
            </div>
            {campaign.endDate && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Ends: {new Date(campaign.endDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}