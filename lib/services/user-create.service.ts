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

async function getClerkClient() {
  return typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient
}

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
  const siteHost = (() => { try { return new URL(baseUrl).host } catch { return 'guests.khadimemillat.org' } })()
  const emailUsed = (input.email && input.email.trim()) || (input.allowSynthEmail ? `${username}@${siteHost}` : '')
  if (!emailUsed) throw new Error('Email missing and synthesizing disabled')

  const client: any = await getClerkClient()
  const clerkUser = await client.users.createUser({
    firstName,
    lastName,
    username,
    password,
    emailAddress: [emailUsed], // ← Correct field name
    publicMetadata: { role: input.role || 'user', ...(input.address && { address: input.address }) },
    privateMetadata: { phone: input.phone }
  })

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
}

export default { createUserRobust }
