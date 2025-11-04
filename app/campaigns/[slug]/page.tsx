import { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Calendar, Target, Users, ArrowLeft, Heart } from "lucide-react"
import { getDynamicIcon } from "@/lib/iconUtils"
import DonationForm from "@/components/DonationForm"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import RecentDonations from "@/components/RecentDonations"
import { getCampaignBySlug } from "@/server/campaigns"

interface Campaign {
  _id: string
  programId: {
    _id: string
    title: string
    slug: string
    icon: string
    iconColor: string
  }
  title: string
  slug: string
  description: string
  coverImage: string
  goal: number
  raised: number
  supportersCount: number
  progress: number
  startDate: string
  endDate?: string
  recentDonations: Array<{
    donorName: string
    amount: number
    message?: string
    createdAt: string
  }>
}



export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const campaign = await getCampaignBySlug(slug)

  if (!campaign) {
    return {
      title: "Campaign Not Found | Khadim-Millat Welfare Foundation"
    }
  }

  return {
    title: `${campaign.title} | ${campaign.programId.title} | Khadim-Millat Welfare Foundation`,
    description: campaign.description.substring(0, 160) + "...",
    openGraph: {
      title: campaign.title,
      description: campaign.description.substring(0, 160) + "...",
      images: [campaign.coverImage]
    }
  }
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const campaign = await getCampaignBySlug(slug)

  if (!campaign) {
    notFound()
  }

  const IconComponent = getDynamicIcon(campaign.programId.icon)
  const progressPercentage = Math.min(campaign.progress, 100)
  const isCompleted = campaign.raised >= campaign.goal
  const daysLeft = campaign.endDate ? Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : null

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href={`/welfare-programs/${campaign.programId.slug}`}
            className="inline-flex items-center text-muted-foreground hoact:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {campaign.programId.title}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Hero Image */}
            <div className="relative h-96 rounded-xl overflow-hidden mb-8">
              <Image
                src={campaign.coverImage}
                alt={campaign.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <div className="flex items-center mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                    style={{ backgroundColor: `${campaign.programId.iconColor}20` }}
                  >
                    <IconComponent
                      className="h-4 w-4"
                      style={{ color: campaign.programId.iconColor }}
                    />
                  </div>
                  <span className="text-white/80 text-sm">{campaign.programId.title}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {campaign.title}
                </h1>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="bg-card rounded-xl p-6 mb-8">
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-1">
                    ₹{campaign.raised.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Raised</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-1">
                    ₹{campaign.goal.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Goal</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {campaign.supportersCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Supporters</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Campaign Info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Started {new Date(campaign.startDate).toLocaleDateString()}</span>
                </div>
                {daysLeft !== null && (
                  <div className="flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Campaign ended'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-card rounded-xl p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">About This Campaign</h2>
              <MarkdownRenderer content={campaign.description} />
            </div>
          </div>
          {/* Sidebar */}
          <div className="lg:col-span-1 sticky top-2">
            {/* Donation Form */}
            <div className="bg-card rounded-xl p-6 mb-8">
              <div className="text-center mb-6">
                <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Support This Cause</h3>
                <p className="text-muted-foreground text-sm">
                  Every contribution makes a difference in someone's life
                </p>
              </div>

              <DonationForm campaignSlug={campaign.slug} />
            </div>

            {/* Recent Donations */}
            <div className="bg-card rounded-xl p-6 sticky">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Recent Supporters
              </h3>
              <RecentDonations
                donations={campaign.recentDonations}
                campaignSlug={campaign.slug}
                totalSupporters={campaign.supportersCount}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}