import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import User from '@/models/User'

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { phone, address, city, state, pincode } = body

    await connectDB()
    
    // Get Clerk client
    const client: any = typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient

    // Update Clerk user's private metadata for address info
    const updateData: any = {}
    if (address) updateData.address = address
    if (city) updateData.city = city
    if (state) updateData.state = state
    if (pincode) updateData.pincode = pincode

    if (Object.keys(updateData).length > 0) {
      try {
        await client.users.updateUser(userId, {
          privateMetadata: {
            ...updateData
          }
        })
      } catch (clerkError) {
        console.error('[CLERK_PROFILE_UPDATE_FAILED]', clerkError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }
    }

    // Update phone in Clerk if provided
    if (phone) {
      try {
        await client.users.updateUser(userId, {
          primaryPhoneNumberId: null // Clear existing
        })
        
        // Add new phone number
        await client.users.createPhoneNumber(userId, {
          phoneNumber: phone
        })
      } catch (phoneError) {
        console.warn('[CLERK_PHONE_UPDATE_FAILED]', phoneError)
        // Don't fail the entire request if phone update fails
      }
    }

    // Also update MongoDB user record if it exists
    try {
      const mongoUpdateData: any = {}
      if (phone) mongoUpdateData.phone = phone
      if (address) mongoUpdateData.address = address
      if (city) mongoUpdateData.city = city
      if (state) mongoUpdateData.state = state
      if (pincode) mongoUpdateData.pincode = pincode

      if (Object.keys(mongoUpdateData).length > 0) {
        await User.findOneAndUpdate(
          { clerkUserId: userId },
          { $set: mongoUpdateData },
          { upsert: false } // Don't create if doesn't exist
        )
      }
    } catch (mongoError) {
      console.warn('[MONGO_PROFILE_UPDATE_FAILED]', mongoError)
      // Don't fail the request if MongoDB update fails
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (error: any) {
    console.error('[PROFILE_UPDATE_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}