import { clerkClient } from '@clerk/nextjs/server'
import { syncNewUserToMongoDB } from '@/lib/services/user-sync.service'
import { emailService } from '@/lib/services/email.service'
import { whatsappService } from '@/lib/services/whatsapp.service'
import { smsService } from '@/lib/services/sms.service'

export interface CreateUserInput {
  name: string
  phone: string
  email?: string
  role?: 'user' | 'admin' | 'moderator' | 'scrapper'
  address?: string
  notifyChannels?: { email?: boolean; whatsapp?: boolean; sms?: boolean }
  allowSynthEmail?: boolean // when true, synthesize email if missing
}

export interface CreatedUserResult {
  clerkUserId: string
  username: string
  emailUsed: string
  password: string
}

// Remove the wrapper function - clerkClient is ready to use directly

export async function createUserRobust(input: CreateUserInput): Promise<CreatedUserResult> {
  const {
    sanitizeName,
    extractPhoneDigits,
    generateUniqueUsername,
    generateStrongPassword,
    validateUsername,
    validatePasswordStrength
  } = await import('@/lib/utils/username')

  const name = input.name.trim()
  const firstName = name.split(' ')[0] || name
  const lastName = name.split(' ').slice(1).join(' ')
  const sanitizedName = sanitizeName(name)
  const phoneDigits = extractPhoneDigits(input.phone)
  const username = await generateUniqueUsername({ name: sanitizedName, phone: phoneDigits })
  if (!validateUsername(username)) throw new Error('Generated username invalid')

  const password = generateStrongPassword(sanitizedName)
  if (!validatePasswordStrength(password)) throw new Error('Generated password not strong enough')

  // email resolution
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')
  const siteHost = (() => {
    try {
      const url = new URL(baseUrl)
      return url.host
    } catch {
      return 'guests.khadimemillat.org'
    }
  })()

  let emailUsed = ''
  if (input.email && input.email.trim()) {
    emailUsed = input.email.trim()
  } else if (input.allowSynthEmail) {
    // Use a more standard email format for synthesized emails
    emailUsed = `${username}@${siteHost}`

    // Validate the synthesized email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailUsed)) {
      // Fallback to a known good domain if the synthesized email is invalid
      emailUsed = `${username}@example.com`
    }
  }

  if (!emailUsed) throw new Error('Email missing and synthesizing disabled')

  // Final email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailUsed)) {
    throw new Error(`Invalid email format: ${emailUsed}`)
  }

  // Additional validation for Clerk requirements
  if (!firstName || firstName.length < 1) throw new Error('First name is required')
  if (username.length < 3 || username.length > 20) throw new Error('Username must be 3-20 characters')
  if (password.length < 8) throw new Error('Password must be at least 8 characters')

  console.log('[DEBUG] Validated user data:', {
    firstName,
    lastName: lastName || '[empty]',
    username,
    emailUsed,
    passwordLength: password.length
  })

  // Check if Clerk is properly configured
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('Clerk is not properly configured. Missing CLERK_SECRET_KEY environment variable.')
  }

  const client = await clerkClient()

  try {
    // Try with minimal required fields first
    const minimalUserData = {
      firstName,
      lastName: lastName || undefined, // Don't send empty string
      username,
      password,
      emailAddress: [emailUsed]
    }

    // Create user with minimal required fields

    const clerkUser = await client.users.createUser(minimalUserData)

    // Update metadata separately if user creation succeeds
    if (input.role || input.address || input.phone) {
      try {
        await client.users.updateUser(clerkUser.id, {
          publicMetadata: {
            role: input.role || 'user',
            ...(input.address && { address: input.address })
          },
          privateMetadata: { phone: input.phone }
        })
      } catch (metadataError) {
        console.warn('[METADATA_UPDATE_FAILED]', metadataError)
        // Don't fail the entire operation if metadata update fails
      }
    }

    // mongo sync (non-blocking)
    syncNewUserToMongoDB({
      clerkUserId: clerkUser.id,
      name,
      email: emailUsed,
      phone: input.phone,
      address: input.address,
      role: input.role || 'user'
    }).catch(err => console.warn('[USER_SYNC_FAILED]', err))

    // notifications
    const signInUrl = `${baseUrl || 'https://www.khadimemillat.org'}/sign-in`
    const wantEmail = input.notifyChannels?.email !== false
    const wantWhatsApp = input.notifyChannels?.whatsapp !== false
    const wantSMS = input.notifyChannels?.sms === true

    if (input.email && wantEmail) {
      const html = emailService.generateDefaultBrandedEmail({
        title: 'Your account has been created',
        greetingName: firstName,
        message: `Your account has been created.\n\nUsername: <b>${username}</b><br/>Password: <b>${password}</b><br/><br/>Sign in: <a href="${signInUrl}">${signInUrl}</a>`
      })
      await emailService.sendEmail({ to: emailUsed, subject: 'Welcome – Your account details', html })
    }

    if (wantWhatsApp) {
      try { await whatsappService.sendMessage({ to: input.phone, message: `KM Welfare account created.\nUsername: ${username}\nPassword: ${password}\nSign in: ${signInUrl}` }) } catch { }
    }

    if (wantSMS) {
      try { await smsService.sendSMS({ to: input.phone, message: `KM Welfare: Username ${username}, Password ${password}. Sign in: ${signInUrl}` } as any) } catch { }
    }

    return { clerkUserId: clerkUser.id, username, emailUsed, password }
  } catch (clerkError: any) {
    console.error('[CLERK_ERROR_DETAILS]', {
      message: clerkError.message,
      status: clerkError.status,
      errors: clerkError.errors,
      clerkTraceId: clerkError.clerkTraceId,
      longMessage: clerkError.longMessage
    })

    // Log individual error details
    if (clerkError.errors && Array.isArray(clerkError.errors)) {
      clerkError.errors.forEach((err: any, index: number) => {
        console.error(`[CLERK_ERROR_${index}]`, {
          code: err.code,
          message: err.message,
          longMessage: err.longMessage,
          meta: err.meta
        })
      })
    }

    throw clerkError
  }
}

export default { createUserRobust }
