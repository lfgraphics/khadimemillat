import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, Target } from "lucide-react"
import { getDynamicIcon } from "@/lib/iconUtils"
import { getWelfareProgramBySlug, getCampaignsByProgramSlug } from "@/server/welfare-programs"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import type { CampaignWithStats } from "@/server/welfare-programs"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const program = await getWelfareProgramBySlug(slug)
  
  if (!program) {
    return {
      title: "Program Not Found | Khadim-Millat Welfare Foundation"
    }
  }

  return {
    title: `${program.title} | Khadim-Millat Welfare Foundation`,
    description: program.description,
    openGraph: {
      title: "Khadim-e-Millat Welfare Foundation",
      description: "A community welfare platform facilitating sustainable scrap collection and redistribution to support welfare programs.",
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.khadimemillat.org'}/${slug}`,
      siteName: "Khadim-e-Millat Welfare Foundation",
      images: [
        {
          url: program.coverImage,
          width: 1080,
          height: 1920,
          alt: "Welfare Program Cover Image",
        },
        {
          url: program.coverImage,
          width: 1080,
          height: 1920,
          alt: "Welfare Program Cover Image",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Khadim-e-Millat Welfare Foundation",
      description: "A community welfare platform facilitating sustainable scrap collection and redistribution to support welfare programs.",
      images: [program.coverImage],
    }
  }
}

export default async function WelfareProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [program, campaigns] = await Promise.all([
    getWelfareProgramBySlug(slug),
    getCampaignsByProgramSlug(slug, true)
  ])

  if (!program) {
    notFound()
  }

  const IconComponent = getDynamicIcon(program.icon)
  const featuredCampaigns = campaigns.filter(c => c.isFeatured)
  const regularCampaigns = campaigns.filter(c => !c.isFeatured)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative">
        <div
          className="relative h-96 overflow-hidden bg-fixed bg-bottom-left bg-cover"
          style={{ backgroundImage: `url(${program.coverImage})` }}
        >
          <span className="sr-only">{program.title}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        </div>
        
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center mb-6"
                style={{ backgroundColor: `${program.iconColor}20`, backdropFilter: 'blur(10px)' }}
              >
                <IconComponent 
                  className="h-8 w-8" 
                  style={{ color: program.iconColor }}
                />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                {program.title}
              </h1>
              <div className="text-xl text-white/90 mb-8">
                <MarkdownRenderer 
                  content={program.description} 
                  className="text-white/90"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-foreground mb-2">
                ₹{program.totalRaised.toLocaleString()}
              </div>
              <div className="text-muted-foreground">Total Raised</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground mb-2">
                {program.totalCampaigns}
              </div>
              <div className="text-muted-foreground">Active Campaigns</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground mb-2">
                {program.totalSupporters}
              </div>
              <div className="text-muted-foreground">Total Supporters</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Campaigns */}
      {featuredCampaigns.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-foreground mb-8">Featured Campaigns</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredCampaigns.map((campaign) => (
                <CampaignCard key={campaign._id} campaign={campaign} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Campaigns */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-8">All Campaigns</h2>
          {regularCampaigns.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularCampaigns.map((campaign) => (
                <CampaignCard key={campaign._id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Campaigns Yet</h3>
              <p className="text-muted-foreground">
                New campaigns for this program will appear here soon.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function CampaignCard({ campaign, featured = false }: { campaign: CampaignWithStats; featured?: boolean }) {
  return (
    <div className={`group ${featured ? 'md:col-span-1' : ''}`}>
      <Link href={`/campaigns/${campaign.slug}`} className="block">
        <div className="bg-background rounded-xl overflow-hidden shadow-sm hoact:shadow-lg transition-all duration-300 group-hoact:scale-[1.02]">
          {/* Cover Image */}
          <div className={`relative overflow-hidden ${featured ? 'h-64' : 'h-48'}`}>
            <img
              src={campaign.coverImage}
              alt={campaign.title}
              className="object-cover group-hoact:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {campaign.isFeatured && (
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                Featured
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="p-6">
            <h3 className={`font-semibold mb-3 text-foreground group-hoact:text-primary transition-colors ${featured ? 'text-2xl' : 'text-xl'}`}>
              {campaign.title}
            </h3>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{campaign.progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(campaign.progress, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <div className="font-semibold text-foreground">₹{(campaign.raised / 1000).toFixed(0)}K</div>
                <div className="text-xs text-muted-foreground">Raised</div>
              </div>
              <div>
                <div className="font-semibold text-foreground">₹{(campaign.goal / 1000).toFixed(0)}K</div>
                <div className="text-xs text-muted-foreground">Goal</div>
              </div>
              <div>
                <div className="font-semibold text-foreground">{campaign.supportersCount}</div>
                <div className="text-xs text-muted-foreground">Supporters</div>
              </div>
            </div>
            
            {/* Date */}
            <div className="flex items-center text-sm text-muted-foreground mb-4">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Started {new Date(campaign.startDate).toLocaleDateString()}</span>
            </div>
            
            {/* CTA */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary font-medium">View Campaign</span>
              <ArrowRight className="h-4 w-4 text-primary group-hoact:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}