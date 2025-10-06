import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import WelfareProgram from "@/models/WelfareProgram"
import Campaign from "@/models/Campaign"
import CampaignDonation from "@/models/CampaignDonation"

const samplePrograms = [
  {
    title: "Education Support",
    slug: "education-support",
    description: "Providing school supplies, books, and educational resources to underprivileged children in rural and urban areas.",
    coverImage: "https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&h=600&fit=crop",
    icon: "GraduationCap",
    iconColor: "#3B82F6",
    donationLink: "/welfare-programs/education-support",
    displayOrder: 1
  },
  {
    title: "Healthcare Access",
    slug: "healthcare-access",
    description: "Medical equipment and supplies distribution to local healthcare facilities and free medical camps.",
    coverImage: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop",
    icon: "Stethoscope",
    iconColor: "#10B981",
    donationLink: "/welfare-programs/healthcare-access",
    displayOrder: 2
  },
  {
    title: "Emergency Relief",
    slug: "emergency-relief",
    description: "Rapid response support during natural disasters and emergency situations affecting communities.",
    coverImage: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&h=600&fit=crop",
    icon: "Shield",
    iconColor: "#F59E0B",
    donationLink: "/welfare-programs/emergency-relief",
    displayOrder: 3
  }
]

const sampleCampaigns = [
  {
    title: "Back to School Initiative 2024",
    description: `# Supporting Education for All

## Our Mission
Every child deserves access to quality education. This campaign aims to provide essential school supplies, uniforms, and books to 200 underprivileged children in Gorakhpur and surrounding areas.

## What We Provide
- **School bags and stationery** for daily learning needs
- **Textbooks and notebooks** for the academic year
- **School uniforms** to ensure dignity and belonging
- **Digital learning tools** for modern education

## Impact Goals
- Support 200 children with complete school kits
- Partner with 10 local schools
- Provide scholarships for exceptional students
- Create sustainable education support systems

Your contribution will directly impact a child's educational journey and future opportunities.`,
    coverImage: "https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&h=600&fit=crop",
    goal: 500000,
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-06-30'),
    isFeatured: true
  },
  {
    title: "Mobile Health Clinic Project",
    description: `# Bringing Healthcare to Remote Areas

## The Challenge
Many rural communities lack access to basic healthcare services. Our mobile health clinic project aims to bridge this gap by bringing medical care directly to underserved areas.

## Our Approach
- **Mobile medical units** equipped with essential equipment
- **Qualified medical staff** including doctors and nurses
- **Free health checkups** and basic treatments
- **Health awareness programs** for preventive care

## Expected Outcomes
- Serve 50+ villages monthly
- Conduct 1000+ health checkups
- Provide free medications
- Train local health volunteers

Together, we can ensure healthcare reaches every corner of our community.`,
    coverImage: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop",
    goal: 750000,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-12-31'),
    isFeatured: true
  },
  {
    title: "Flood Relief Fund 2024",
    description: `# Emergency Response for Flood Victims

## Immediate Need
Recent floods have affected hundreds of families in our region. This emergency fund provides immediate relief and long-term rehabilitation support.

## Relief Efforts
- **Emergency shelter** and temporary housing
- **Food and clean water** distribution
- **Medical aid** for affected families
- **Rehabilitation support** for damaged homes

## Distribution Plan
- Phase 1: Immediate relief (food, water, shelter)
- Phase 2: Medical support and sanitation
- Phase 3: Rehabilitation and rebuilding
- Phase 4: Long-term community resilience

Every donation helps a family rebuild their life after this devastating natural disaster.`,
    coverImage: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&h=600&fit=crop",
    goal: 1000000,
    startDate: new Date('2024-03-01'),
    isFeatured: false
  }
]

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // For security, you might want to check if user is admin here
    // const user = await User.findOne({ clerkUserId: userId })
    // if (user?.role !== 'admin') {
    //   return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    // }

    await connectDB()

    console.log('🌱 Starting to seed welfare programs...')

    // Clear existing data
    await WelfareProgram.deleteMany({})
    await Campaign.deleteMany({})
    await CampaignDonation.deleteMany({})

    console.log('🧹 Cleared existing data')

    // Create programs
    const createdPrograms = await WelfareProgram.insertMany(samplePrograms)
    console.log(`✅ Created ${createdPrograms.length} welfare programs`)

    // Update donation links with actual IDs
    for (const program of createdPrograms) {
      await WelfareProgram.findByIdAndUpdate(program._id, {
        donationLink: `/welfare-programs/${program._id}`
      })
    }

    // Create campaigns for each program
    for (let i = 0; i < createdPrograms.length; i++) {
      const program = createdPrograms[i]
      const campaignData = sampleCampaigns[i]

      if (campaignData) {
        const slug = campaignData.title.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()

        const campaign = new Campaign({
          programId: program._id,
          ...campaignData,
          slug,
          createdBy: userId,
          lastUpdatedBy: userId
        })

        await campaign.save()
        console.log(`✅ Created campaign: ${campaign.title}`)

        // Add some sample donations
        const sampleDonations = [
          {
            campaignId: campaign._id,
            programId: program._id,
            donorName: 'Amit Patel',
            donorEmail: 'amit@example.com',
            donorPhone: '+91 9876543210',
            amount: 5000,
            message: 'Great initiative! Happy to support.',
            paymentMethod: 'online' as const,
            status: 'completed' as const
          },
          {
            campaignId: campaign._id,
            programId: program._id,
            donorName: 'Rajesh Kumar',
            donorEmail: 'rajesh@example.com',
            donorPhone: '+91 9876543211',
            amount: 2500,
            message: 'Keep up the good work!',
            paymentMethod: 'online' as const,
            status: 'completed' as const
          },
          {
            campaignId: campaign._id,
            programId: program._id,
            donorName: 'Priya Sharma',
            donorEmail: 'priya@example.com',
            donorPhone: '+91 9876543212',
            amount: 1000,
            paymentMethod: 'cash' as const,
            status: 'completed' as const
          }
        ]

        await CampaignDonation.insertMany(sampleDonations)
        console.log(`✅ Added sample donations for: ${campaign.title}`)
      }
    }

    console.log('🎉 Seeding completed successfully!')

    return NextResponse.json({
      success: true,
      message: "Welfare programs seeded successfully!",
      programsCreated: createdPrograms.length,
      campaignsCreated: sampleCampaigns.length
    })

  } catch (error) {
    console.error('❌ Error seeding welfare programs:', error)
    return NextResponse.json(
      { error: "Failed to seed welfare programs" },
      { status: 500 }
    )
  }
}