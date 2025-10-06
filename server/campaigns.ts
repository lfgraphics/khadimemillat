import connectDB from "@/lib/db"
import { Campaign, CampaignDonation } from "@/models"

export interface CampaignWithDetails {
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

export interface DonationWithPagination {
  donations: Array<{
    donorName: string
    amount: number
    message?: string
    createdAt: string
  }>
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export async function getCampaignBySlug(slug: string): Promise<CampaignWithDetails | null> {
  try {
    await connectDB()
    
    const campaign = await Campaign.findOne({ 
      slug, 
      isActive: true 
    })
    .populate('programId', 'title slug icon iconColor')
    .lean()
    
    if (!campaign) return null
    
    // Get donation stats
    const donations = await CampaignDonation.find({ 
      campaignId: (campaign as any)._id, 
      status: 'completed' 
    })
    .sort({ createdAt: -1 })
    .lean()
    
    const raised = donations.reduce((sum, donation) => sum + donation.amount, 0)
    // Count unique supporters properly
    const uniqueSupporters = new Set()
    donations.forEach(d => {
      if (d.donorName) {
        uniqueSupporters.add(d.donorName)
      } else {
        uniqueSupporters.add(d.donorEmail)
      }
    })
    const supportersCount = uniqueSupporters.size
    const progress = (campaign as any).goal > 0 ? (raised / (campaign as any).goal) * 100 : 0
    
    // Get recent donations for display
    const recentDonations = donations
      .slice(0, 10)
      .map(d => ({
        donorName: d.donorName,
        amount: d.amount,
        message: d.message,
        createdAt: d.createdAt.toISOString()
      }))
    
    return {
      ...(campaign as any),
      _id: (campaign as any)._id.toString(),
      programId: {
        _id: (campaign as any).programId._id.toString(),
        title: (campaign as any).programId.title,
        slug: (campaign as any).programId.slug,
        icon: (campaign as any).programId.icon,
        iconColor: (campaign as any).programId.iconColor
      },
      raised,
      supportersCount,
      progress,
      recentDonations
    }
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return null
  }
}

export async function getCampaignDonations(
  slug: string, 
  page = 1, 
  limit = 20
): Promise<DonationWithPagination | null> {
  try {
    await connectDB()
    
    const campaign = await Campaign.findOne({ 
      slug, 
      isActive: true 
    }).lean()
    
    if (!campaign) return null
    
    const skip = (page - 1) * limit
    
    const donations = await CampaignDonation.find({ 
      campaignId: (campaign as any)._id, 
      status: 'completed',
      isAnonymous: false
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('donorName amount message createdAt')
    .lean()
    
    const total = await CampaignDonation.countDocuments({ 
      campaignId: (campaign as any)._id, 
      status: 'completed',
      isAnonymous: false
    })
    
    return {
      donations: donations.map(d => ({
        donorName: d.donorName,
        amount: d.amount,
        message: d.message,
        createdAt: d.createdAt.toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching donations:', error)
    return null
  }
}

export async function getCampaigns() {
  try {
    await connectDB()
    
    const campaigns = await Campaign.find({})
      .populate('programId', 'title slug')
      .sort({ createdAt: -1 })
      .lean()
    
    // Get donation stats for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const donations = await CampaignDonation.find({ 
          campaignId: (campaign as any)._id, 
          status: 'completed' 
        }).lean()
        
        const raised = donations.reduce((sum, donation) => sum + donation.amount, 0)
        const uniqueSupporters = new Set()
        donations.forEach(d => {
          if (d.donorName) {
            uniqueSupporters.add(d.donorName)
          } else {
            uniqueSupporters.add(d.donorEmail)
          }
        })
        const supportersCount = uniqueSupporters.size
        
        return {
          ...(campaign as any),
          _id: (campaign as any)._id.toString(),
          programId: (campaign as any).programId ? {
            _id: (campaign as any).programId._id.toString(),
            title: (campaign as any).programId.title,
            slug: (campaign as any).programId.slug
          } : null,
          welfareProgram: (campaign as any).programId,
          raised,
          supportersCount
        }
      })
    )
    
    return campaignsWithStats
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return []
  }
}

export async function getCampaignById(id: string) {
  try {
    await connectDB()
    
    const campaign = await Campaign.findById(id)
      .populate('programId', 'title slug')
      .lean()
    
    if (!campaign) return null
    
    // Properly serialize all ObjectIds to strings
    const serializedCampaign = {
      ...(campaign as any),
      _id: (campaign as any)._id.toString(),
      programId: (campaign as any).programId ? (campaign as any).programId._id.toString() : '',
      supporters: (campaign as any).supporters?.map((id: any) => id.toString()) || [],
      welfareProgram: (campaign as any).programId ? {
        ...(campaign as any).programId,
        _id: (campaign as any).programId._id.toString()
      } : null
    }
    
    return serializedCampaign
  } catch (error) {
    console.error('Error fetching campaign by ID:', error)
    return null
  }
}