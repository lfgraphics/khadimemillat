import { clerkClient } from '@clerk/nextjs/server'
import { syncNewUserToMongoDB } from '@/lib/services/user-sync.service'
import { emailService } from '@/lib/services/email.service'
import { whatsappService } from '@/lib/services/whatsapp.service'
import { smsService } from '@/lib/services/sms.service'

export interface CreateUserInput {
  firstName: string
  lastName: string // Required by Clerk
  name?: string // Deprecated: use firstName/lastName instead (kept for backward compatibility)
  phone: string
  email?: string
  role?: 'user' | 'admin' | 'moderator' | 'field_executive'
  address?: string
  skipPassword?: boolean // default: true (mobile-first OTP login)
  notifyChannels?: { email?: boolean; whatsapp?: boolean; sms?: boolean }
}

export interface CreatedUserResult {
  clerkUserId: string
  phoneNumber: string
  username?: string  // only if skipPassword=false
  emailUsed?: string // only if email provided
  password?: string  // only if skipPassword=false
}

// Remove the wrapper function - clerkClient is ready to use directly

export async function createUserRobust(input: CreateUserInput): Promise<CreatedUserResult> {
  // Backward compatibility: if 'name' is provided instead of firstName/lastName, split it
  let firstName = input.firstName
  let lastName = input.lastName

  if (!firstName && input.name) {
    const nameParts = input.name.trim().split(' ')
    firstName = nameParts[0] || input.name
    lastName = nameParts.slice(1).join(' ') || 'User' // Default lastName if not provided
  }

  if (!firstName || firstName.length < 1) {
    throw new Error('First name is required')
  }

  if (!lastName || lastName.length < 1) {
    throw new Error('Last name is required')
  }

  // Normalize phone number to E.164 format for Clerk
  const { normalizePhoneNumber, toE164Format } = await import('@/lib/utils/phone')
  const normalizedPhone = normalizePhoneNumber(input.phone)
  const e164Phone = toE164Format(input.phone)

  console.log('[USER_CREATE] Starting creation:', {
    firstName,
    lastName: lastName || '[empty]',
    phone: e164Phone,
    skipPassword: input.skipPassword !== false,
    hasEmail: !!input.email
  })

  // Check if Clerk is properly configured
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('Clerk is not properly configured. Missing CLERK_SECRET_KEY environment variable.')
  }

  const client = await clerkClient()
  const skipPassword = input.skipPassword !== false // Default to true (mobile-first)

  // Generate username/password only if not skipping password
  let username: string | undefined
  let password: string | undefined
  let emailUsed: string | undefined
  let hasRealEmail = false

  if (!skipPassword) {
  // Legacy mode: generate username and password
    const {
      sanitizeName,
      extractPhoneDigits,
      generateUniqueUsername,
      generateStrongPassword,
      validateUsername,
      validatePasswordStrength
    } = await import('@/lib/utils/username')

    const fullName = `${firstName} ${lastName || ''}`.trim()
    const sanitizedName = sanitizeName(fullName)
    const phoneDigits = extractPhoneDigits(input.phone)
    username = await generateUniqueUsername({ name: sanitizedName, phone: phoneDigits })

    if (!validateUsername(username)) throw new Error('Generated username invalid')

    password = generateStrongPassword(sanitizedName)
    if (!validatePasswordStrength(password)) throw new Error('Generated password not strong enough')

    // Need email for username/password mode
    if (input.email && input.email.trim()) {
      emailUsed = input.email.trim()
      hasRealEmail = true
    } else {
      // Synthesize email if not provided
      const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')
      const siteHost = (() => {
        try {
          const url = new URL(baseUrl)
          return url.host
        } catch {
          return 'guests.khadimemillat.org'
        }
      })()
      emailUsed = `${username}@${siteHost}`
      hasRealEmail = false
    }
  } else {
    // Phone-only mode: email is optional
    if (input.email && input.email.trim()) {
      emailUsed = input.email.trim()
      hasRealEmail = true
    }
  }

  try {
    // Build Clerk user data based on mode
    const clerkUserData: any = {
      firstName,
      lastName, // Required by Clerk
      phoneNumber: [e164Phone] // Phone number in E.164 format
    }

    if (!skipPassword) {
      // Username/password mode
      clerkUserData.username = username
      clerkUserData.password = password
      if (emailUsed) {
        clerkUserData.emailAddress = [emailUsed]
      }
    } else {
      // Phone-only mode with OTP
      clerkUserData.skipPasswordRequirement = true
      if (emailUsed) {
        clerkUserData.emailAddress = [emailUsed]
      }
    }

    console.log('[CLERK_CREATE] Creating user:', {
      firstName,
      lastName: lastName || '[empty]',
      phone: e164Phone,
      skipPassword,
      hasEmail: !!emailUsed,
      hasUsername: !!username
    })

    // Create user in Clerk
    const clerkUser = await client.users.createUser(clerkUserData)

    // Update metadata separately
    try {
      await client.users.updateUser(clerkUser.id, {
        publicMetadata: {
          role: input.role || 'user',
          ...(input.address && { address: input.address })
        },
        privateMetadata: { phone: normalizedPhone }
      })
    } catch (metadataError) {
      console.warn('[METADATA_UPDATE_FAILED]', metadataError)
    }

    // MongoDB sync (non-blocking)
    syncNewUserToMongoDB({
      clerkUserId: clerkUser.id,
      name: `${firstName} ${lastName || ''}`.trim(),
      email: hasRealEmail ? emailUsed : undefined,
      phone: normalizedPhone,
      address: input.address,
      role: input.role || 'user'
    }).catch(err => console.warn('[USER_SYNC_FAILED]', err))

    // Notifications
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.khadimemillat.org'
    const signInUrl = `${baseUrl}/sign-in`
    const wantEmail = input.notifyChannels?.email !== false
    const wantWhatsApp = input.notifyChannels?.whatsapp !== false
    const wantSMS = input.notifyChannels?.sms === true

    // Send WhatsApp notification via campaign
    if (wantWhatsApp) {
      try {
        if (skipPassword) {
          // Phone-only user: send account creation notification via campaign
          await whatsappService.sendAccountCreationNotification({
            phone: e164Phone,
            userName: firstName
          })
          console.log('[WHATSAPP_SENT] Account creation notification sent')
        } else {
          // Legacy user with password: send credentials
          await whatsappService.sendMessage({
            to: whatsappService.formatPhoneNumber(input.phone),
            message: `KM Welfare account created.\nUsername: ${username}\nPassword: ${password}\nSign in: ${signInUrl}`,
            userName: firstName
          })
        }
      } catch (whatsappError) {
        console.warn('[WHATSAPP_NOTIFICATION_FAILED]', whatsappError)
      }
    }

    // Email notification (only for users with real email)
    if (hasRealEmail && wantEmail && emailUsed) {
      try {
        if (skipPassword) {
          // Phone-only user
          const html = emailService.generateDefaultBrandedEmail({
            title: 'Welcome to KM Welfare',
            greetingName: firstName,
            message: `Your account has been created successfully.\n\nYou can sign in using your mobile number with OTP.\n\nSign in: <a href="${signInUrl}">${signInUrl}</a>`
          })
          await emailService.sendEmail({ to: emailUsed, subject: 'Welcome to KM Welfare', html })
        } else {
        // Legacy user with password
          const html = emailService.generateDefaultBrandedEmail({
            title: 'Your account has been created',
            greetingName: firstName,
            message: `Your account has been created.\n\nUsername: <b>${username}</b><br/>Password: <b>${password}</b><br/><br/>Sign in: <a href="${signInUrl}">${signInUrl}</a>`
          })
          await emailService.sendEmail({ to: emailUsed, subject: 'Welcome – Your account details', html })
        }
      } catch (emailError) {
        console.warn('[EMAIL_NOTIFICATION_FAILED]', emailError)
      }
    }

    // SMS notification (optional)
    if (wantSMS) {
      try {
        const smsMessage = skipPassword
          ? `KM Welfare: Welcome! Sign in with OTP at ${signInUrl}`
          : `KM Welfare: Username ${username}, Password ${password}. Sign in: ${signInUrl}`
        await smsService.sendSMS({ to: input.phone, message: smsMessage } as any)
      } catch (smsError) {
        console.warn('[SMS_NOTIFICATION_FAILED]', smsError)
      }
    }

    return {
      clerkUserId: clerkUser.id,
      phoneNumber: e164Phone,
      username,
      emailUsed,
      password
    }
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
