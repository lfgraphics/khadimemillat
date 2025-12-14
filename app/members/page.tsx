import { Suspense } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Calendar, MapPin, ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Loading from '@/components/Loading'

interface Member {
  membershipId: string
  name: string
  profileImage: string | null
  location: string
  memberSince: string | null
  joinedYear: number | null
}

interface MembersResponse {
  success: boolean
  members: Member[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

async function getMembers(page: number = 1): Promise<MembersResponse> {
  try {
    // Import the API logic directly instead of making HTTP calls
    const connectDB = (await import('@/lib/db')).default
    const MembershipRequest = (await import('@/models/MembershipRequest')).default

    await connectDB()

    const limit = 12
    const skip = (page - 1) * limit

    // Get approved members with privacy protection
    const members = await MembershipRequest.find({
      status: 'approved'
    })
      .select('membershipId membershipStartDate fullName userId currentAddress')
      .sort({ membershipStartDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await MembershipRequest.countDocuments({ status: 'approved' })

    // Get profile images from Clerk for each member
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()

    const formattedMembers = await Promise.all(
      members.map(async (member: any) => {
        let profileImage = null

        try {
          // Get user profile from Clerk
          const clerkUser = await client.users.getUser(member.userId)
          profileImage = clerkUser.imageUrl || null
        } catch (clerkError) {
          console.warn(`Failed to get Clerk profile for user ${member.userId}:`, clerkError)
        }

        return {
          membershipId: member.membershipId,
          name: member.fullName,
          profileImage,
          location: `${member.currentAddress?.city || 'Unknown'}, ${member.currentAddress?.state || 'India'}`,
          memberSince: member.membershipStartDate?.toISOString() || null,
          joinedYear: member.membershipStartDate ? new Date(member.membershipStartDate).getFullYear() : null
        }
      })
    )

    return {
      success: true,
      members: formattedMembers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }

  } catch (error) {
    console.error('Error fetching members:', error)
    return {
      success: false,
      members: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        pages: 0,
        hasNext: false,
        hasPrev: false
      }
    }
  }
}

function MemberCard({ member }: { member: Member }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 pt-1">
      <CardContent>
        <CardHeader className='flex justify-end p-0 mb-2'>
          {/* Membership Badge */}
          <Badge className="bg-primary/10 text-primary border-primary/20">
            ID: {member.membershipId}
          </Badge>
        </CardHeader>
        <div className="flex flex-row items-start justify-between space-y-4">
          {/* Profile Image */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center overflow-hidden border-2 border-primary/10">
              {member.profileImage ? (
                <img
                  src={member.profileImage}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>

          {/* Member Info */}
          <div className="flex flex-col items-start">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
              {member.name}
            </h3>

            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{member.location}</span>
            </div>

            {member.memberSince && (
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Member since {member.joinedYear}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Pagination({ pagination, currentPage }: { pagination: any, currentPage: number }) {
  if (pagination.pages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {pagination.hasPrev && (
        <Link href={`/members?page=${currentPage - 1}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
        </Link>
      )}

      <div className="flex items-center gap-2">
        {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
          const pageNum = i + 1
          return (
            <Link key={pageNum} href={`/members?page=${pageNum}`}>
              <Button
                variant={pageNum === currentPage ? "default" : "outline"}
                size="sm"
                className="w-10 h-10"
              >
                {pageNum}
              </Button>
            </Link>
          )
        })}
      </div>

      {pagination.hasNext && (
        <Link href={`/members?page=${currentPage + 1}`}>
          <Button variant="outline" size="sm">
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      )}
    </div>
  )
}

async function MembersContent({ searchParams }: { searchParams: { page?: string } }) {
  const currentPage = parseInt((await searchParams).page || '1')
  const data = await getMembers(currentPage)

  if (!data.success) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Unable to load members</h3>
        <p className="text-muted-foreground">Please try again later</p>
      </div>
    )
  }

  if (data.members.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No members found</h3>
        <p className="text-muted-foreground">Be the first to join our community!</p>
        <Link href="/membership/request" className="mt-4 inline-block">
          <Button>Apply for Membership</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data.members.map((member) => (
          <MemberCard key={member.membershipId} member={member} />
        ))}
      </div>

      {/* Pagination */}
      <Pagination pagination={data.pagination} currentPage={currentPage} />
    </>
  )
}

export default function MembersPage({ searchParams }: { searchParams: { page?: string } }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">Our Members</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Meet our verified community members who are making a difference through their commitment to our mission
          </p>
          <Badge className="mt-4 bg-primary/10 text-primary border-primary/20">
            Verified Community
          </Badge>
        </div>

        {/* Members Content */}
        <Suspense fallback={
          <div className="flex justify-center py-12">
            <Loading />
          </div>
        }>
          <MembersContent searchParams={searchParams} />
        </Suspense>

        {/* Call to Action */}
        <div className="text-center mt-16 p-8 bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-2xl border border-primary/10">
          <h3 className="text-2xl font-semibold mb-4">Join Our Community</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Become a verified member and get access to exclusive reports, member benefits, and community features
          </p>
          <Link href="/membership/request">
            <Button size="lg" className="gap-2">
              <Users className="w-5 h-5" />
              Apply for Membership
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Our Members - Khadim-e-Millat Welfare Foundation',
  description: 'Meet our verified community members who are making a difference through their commitment to our mission',
}