// lib/utils/phone.ts
// Centralized helpers for phone number formatting, validation, and WhatsApp URL generation.

export function getDefaultCountryCode(): string {
  return (process.env.DEFAULT_COUNTRY_CODE || process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE || '91').toString()
}

export function normalizePhoneNumber(input: string, defaultCountryCode = getDefaultCountryCode()): string {
  if (!input) return ''
  // Keep digits only
  let digits = ('' + input).replace(/[^0-9]/g, '')
  // If starts with 00 (international prefix), drop it
  if (digits.startsWith('00')) digits = digits.slice(2)
  
  // Special case: If it's a 12-digit number starting with 91 (Indian country code)
  // and default country code is 91, strip the 91 prefix to get the 10-digit number
  if (digits.length === 12 && digits.startsWith('91') && defaultCountryCode === '91') {
    digits = digits.slice(2) // Remove the first two digits (91)
    console.log('[PHONE_NORMALIZE] stripped 91 prefix from 12-digit number')
  }
  
  // Special case: If it's an 11-digit number starting with 0 (Indian local format), strip the 0
  if (digits.length === 11 && digits.startsWith('0') && defaultCountryCode === '91') {
    digits = digits.slice(1) // Remove the leading 0
    console.log('[PHONE_NORMALIZE] stripped leading 0 from 11-digit Indian number')
  }
  
  // If looks like an E.164-ish number (11-15 digits), assume it's already with country code; do not prefix
  if (digits.length >= 11 && digits.length <= 15) {
    // prevent leading zero immediately after country code (e.g., 91 0xxxxxxxxx)
    const cc = digits.slice(0, digits.length - 10)
    const rest = digits.slice(digits.length - 10)
    if (rest.startsWith('0')) {
      const cleaned = cc + rest.replace(/^0+/, '')
      console.warn('[PHONE_NORMALIZE] stripping leading zero after country code')
      return cleaned
    }
    return digits
  }
  // If looks like a local 10-digit number, prefix with default country code
  if (digits.length === 10) return defaultCountryCode + digits
  return digits
}

export function validatePhoneNumber(input: string): boolean {
  if (!input) return false
  const digits = input.replace(/[^0-9]/g, '')
  // Basic sanity: 10-15 digits typical for E.164 range
  if (digits.length < 10 || digits.length > 15) return false
  // if includes country code (>=11), ensure last 10 digits don't start with 0
  if (digits.length >= 11) {
    const rest = digits.slice(digits.length - 10)
    if (rest.startsWith('0')) return false
  }
  return true
}

export function formatForWhatsApp(input: string, defaultCountryCode = getDefaultCountryCode()): string {
  const normalized = normalizePhoneNumber(input, defaultCountryCode)
  return normalized
}

export function generateWhatsAppUrl(phone: string, message: string, defaultCountryCode = getDefaultCountryCode()): string {
  const target = formatForWhatsApp(phone, defaultCountryCode)
  const text = encodeURIComponent(message)
  return `https://wa.me/${target}?text=${text}`
}
