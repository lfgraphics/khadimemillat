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

    return NextResponse.json({ success: true, userId: created.clerkUserId, username: created.username, emailUsed: created.emailUsed, password: created.password, identifier: created.username })
  } catch (e: any) {
    console.error('[GUEST_SIGNUP_ERROR]', e)
    const message = e?.errors?.[0]?.message || e.message || 'Failed to create account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
