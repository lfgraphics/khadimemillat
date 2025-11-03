import connectDB from "@/lib/db"
import WelfareProgram from "@/models/WelfareProgram"
import Campaign from "@/models/Campaign"
import CampaignDonation from "@/models/CampaignDonation"

export interface WelfareProgramWithStats {
  _id: string
  title: string
  slug: string
  description: string
  coverImage: string
  icon: string
  iconColor: string
  donationLink: string
  isActive: boolean
  totalRaised: number
  totalCampaigns: number
  totalSupporters: number
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface CampaignWithStats {
  _id: string
  programId: string
  title: string
  slug: string
  description: string
  coverImage: string
  goal: number
  raised: number
  supportersCount: number
  progress: number
  isActive: boolean
  isFeatured: boolean
  startDate: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

export async function getWelfarePrograms(includeStats = false, limit?: number, skip?: number): Promise<WelfareProgramWithStats[]> {
  try {
    await connectDB()

    let query = WelfareProgram.find({ isActive: true, slug: { $nin: ['default-campaign', 'test-campaign', 'sadqa', 'zakat', 'organization-support'] } })
      .sort({ displayOrder: 1, createdAt: -1 })

    if (skip !== undefined) {
      query = query.skip(skip)
    }

    if (limit !== undefined) {
      query = query.limit(limit)
    }

    const programs = await query.lean()

    if (!includeStats) {
      return programs.map(program => ({
        ...(program as any),
        _id: (program as any)._id.toString(),
        totalRaised: 0,
        totalCampaigns: 0,
        totalSupporters: 0
      }))
    }

    // Get aggregated stats for each program
    const programsWithStats = await Promise.all(
      programs.map(async (program) => {
        const campaigns = await Campaign.find({
          programId: (program as any)._id,
          isActive: true,
          slug: { $nin: ['default-campaign', 'test-campaign', 'sadqa', 'zakar', 'organization-support'] }
        }).lean()

        const donations = await CampaignDonation.find({
          programId: (program as any)._id,
          status: 'completed'
        }).lean()

        const totalRaised = donations.reduce((sum, donation) => sum + donation.amount, 0)
        // Count unique supporters by donorId (for logged in users) and donorEmail (for logged out users)
        const uniqueSupporters = new Set()
        donations.forEach(d => {
          if (d.donorName) {
            uniqueSupporters.add(d.donorName)
          } else {
            uniqueSupporters.add(d.donorEmail)
          }
        })
        const totalSupporters = uniqueSupporters.size

        return {
          ...(program as any),
          _id: (program as any)._id.toString(),
          totalRaised,
          totalCampaigns: campaigns.length,
          totalSupporters
        }
      })
    )

    return programsWithStats
  } catch (error) {
    console.error('Error fetching welfare programs:', error)
    return []
  }
}

export async function getTotalWelfareProgramsCount(): Promise<number> {
  try {
    await connectDB()
    return await WelfareProgram.countDocuments({ isActive: true })
  } catch (error) {
    console.error('Error counting welfare programs:', error)
    return 0
  }
}

export async function getWelfareProgramBySlug(slug: string): Promise<WelfareProgramWithStats | null> {
  try {
    await connectDB()

    const program = await WelfareProgram.findOne({ slug, isActive: true }).lean()
    if (!program) return null

    // Get stats
    const campaigns = await Campaign.find({
      programId: (program as any)._id,
      isActive: true
    }).lean()

    const donations = await CampaignDonation.find({
      programId: (program as any)._id,
      status: 'completed'
    }).lean()

    const totalRaised = donations.reduce((sum, donation) => sum + donation.amount, 0)
    // Count unique supporters by donorId (for logged in users) and donorEmail (for logged out users)
    const uniqueSupporters = new Set()
    donations.forEach(d => {
      if (d.donorId) {
        uniqueSupporters.add(d.donorId)
      } else {
        uniqueSupporters.add(d.donorEmail)
      }
    })
    const totalSupporters = uniqueSupporters.size

    return {
      ...(program as any),
      _id: (program as any)._id.toString(),
      totalRaised,
      totalCampaigns: campaigns.length,
      totalSupporters
    }
  } catch (error) {
    console.error('Error fetching welfare program:', error)
    return null
  }
}

export async function getCampaignsByProgramSlug(programSlug: string, includeStats = false): Promise<CampaignWithStats[]> {
  try {
    await connectDB()

    // First find the program by slug
    const program = await WelfareProgram.findOne({ slug: programSlug, isActive: true }).lean()
    if (!program) return []

    const campaigns = await Campaign.find({
      programId: (program as any)._id,
      isActive: true
    })
      .sort({ isFeatured: -1, startDate: -1 })
      .lean()

    if (!includeStats) {
      return campaigns.map(campaign => ({
        ...(campaign as any),
        _id: (campaign as any)._id.toString(),
        programId: campaign.programId.toString(),
        raised: 0,
        supportersCount: 0,
        progress: 0
      }))
    }

    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const donations = await CampaignDonation.find({
          campaignId: (campaign as any)._id,
          status: 'completed'
        }).lean()

        const raised = donations.reduce((sum, donation) => sum + donation.amount, 0)
        // Count unique supporters properly
        const uniqueSupporters = new Set()
        donations.forEach(d => {
          if (d.donorId) {
            uniqueSupporters.add(d.donorId)
          } else {
            uniqueSupporters.add(d.donorEmail)
          }
        })
        const supportersCount = uniqueSupporters.size
        const progress = campaign.goal > 0 ? (raised / campaign.goal) * 100 : 0

        return {
          ...(campaign as any),
          _id: (campaign as any)._id.toString(),
          programId: campaign.programId.toString(),
          raised,
          supportersCount,
          progress
        }
      })
    )

    return campaignsWithStats
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return []
  }
}