import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { clerkClient } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[CLERK_WEBHOOK_SECRET_MISSING]');
      return new NextResponse('Config error', { status: 500 })
    }

  const hdrsObj: any = headers();
  const svixId = hdrsObj.get('svix-id') as string | null
  const svixTimestamp = hdrsObj.get('svix-timestamp') as string | null
  const svixSignature = hdrsObj.get('svix-signature') as string | null
    if (!svixId || !svixTimestamp || !svixSignature) {
      return new NextResponse('Missing signature headers', { status: 400 })
    }

    const body = await req.text(); // raw body for verification
    let event: any
    try {
      const wh = new Webhook(webhookSecret)
      event = wh.verify(body, { 'svix-id': svixId, 'svix-timestamp': svixTimestamp, 'svix-signature': svixSignature })
    } catch (err) {
      console.error('[WEBHOOK_VERIFY_FAILED]', err)
      return new NextResponse('Invalid signature', { status: 400 })
    }

    if (event.type === 'user.created' || event.type === 'user.updated') {
      const data = event.data
      const clerkUserId = data.id
      await connectDB()
      let userDoc = await User.findOne({ clerkUserId })
      if (!userDoc) {
        userDoc = await User.create({
          clerkUserId,
          name: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : (data.username || 'Unnamed User'),
          email: data.email_addresses?.[0]?.email_address,
          role: 'user'
        })
      }
      // Backfill publicMetadata.mongoUserId if absent
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(clerkUserId)
        const currentMongoLink = (clerkUser.publicMetadata as any)?.mongoUserId
        if (!currentMongoLink) {
          await client.users.updateUser(clerkUserId, { publicMetadata: { ...clerkUser.publicMetadata, mongoUserId: userDoc._id.toString() } })
        }
      } catch (err) {
        console.warn('[CLERK_BACKFILL_FAILED]', err)
      }
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error(e)
    return new NextResponse('Server error', { status: 500 })
  }
}
