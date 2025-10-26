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
    
    // Log detailed error information for debugging
    if (e.errors && Array.isArray(e.errors)) {
      console.error('[CLERK_VALIDATION_ERRORS]', e.errors.map((err: any) => ({
        code: err.code,
        message: err.message,
        longMessage: err.longMessage,
        meta: err.meta
      })))
    }
    
    // Handle specific Clerk errors with user-friendly messages
    let userMessage = 'Failed to create account'
    let errorCode = 'unknown_error'
    
    if (e.errors && Array.isArray(e.errors) && e.errors.length > 0) {
      const firstError = e.errors[0]
      errorCode = firstError.code || 'clerk_error'
      
      // Handle specific error codes
      switch (firstError.code) {
        case 'form_param_format_invalid':
          if (firstError.meta?.paramName === 'email_address') {
            userMessage = 'Invalid email format. Please check your email address.'
          } else if (firstError.meta?.paramName === 'username') {
            userMessage = 'Invalid username format. Please try different information.'
          } else {
            userMessage = `Invalid ${firstError.meta?.paramName || 'input'} format.`
          }
          break
        case 'form_param_nil':
          userMessage = `Missing required field: ${firstError.meta?.paramName || 'unknown'}`
          break
        case 'form_identifier_exists':
          userMessage = 'An account with this email or username already exists. Please sign in instead.'
          break
        case 'form_password_pwned':
          userMessage = 'Password is too common. Please try again.'
          break
        case 'form_password_validation_failed':
          userMessage = 'Password does not meet security requirements.'
          break
        default:
          userMessage = firstError.longMessage || firstError.message || 'Account creation failed'
      }
    } else if (e.message && e.message.includes('email_address')) {
      userMessage = 'Email configuration issue. Please try again or contact support.'
    } else if (e.message && e.message.includes('username')) {
      userMessage = 'Username already exists. Please try with different information.'
    } else if (e.message && e.message.includes('already exists')) {
      userMessage = 'An account with this information already exists. Please sign in instead.'
    } else if (e.message) {
      userMessage = e.message
    }
    
    return NextResponse.json({ 
      error: userMessage,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? {
        originalError: e.message,
        errors: e.errors,
        clerkTraceId: e.clerkTraceId
      } : undefined
    }, { status: 500 })
  }
}
