import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createUserRobust } from '@/lib/services/user-create.service'

// Require phone; email optional
const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional()
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, phone, email } = parsed.data

    const created = await createUserRobust({
      name,
      phone,
      email,
      role: 'user',
      allowSynthEmail: true,
      notifyChannels: { email: !!email, whatsapp: true, sms: false }
    })

    return NextResponse.json({ 
      success: true, 
      userId: created.clerkUserId, 
      username: created.username, 
      emailUsed: created.emailUsed, 
      password: created.password, 
      identifier: created.username 
    })
  } catch (e: any) {
    console.error('[GUEST_SIGNUP_ERROR]', e)
    
    // Handle specific Clerk errors with user-friendly messages
    let userMessage = 'Failed to create account'
    
    if (e.message && e.message.includes('email_address')) {
      userMessage = 'Email configuration issue. Please try again or contact support.'
    } else if (e.message && e.message.includes('username')) {
      userMessage = 'Username already exists. Please try with different information.'
    } else if (e.message && e.message.includes('already exists')) {
      userMessage = 'An account with this information already exists. Please sign in instead.'
    } else if (e?.errors?.[0]?.message) {
      userMessage = e.errors[0].message
    } else if (e.message) {
      userMessage = e.message
    }
    
    return NextResponse.json({ 
      error: userMessage,
      code: e?.errors?.[0]?.code || 'unknown_error',
      details: process.env.NODE_ENV === 'development' ? e.message : undefined
    }, { status: 500 })
  }
}
