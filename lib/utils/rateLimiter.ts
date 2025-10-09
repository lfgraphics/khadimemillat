type Key = string

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<Key, Bucket>()

// Simple token bucket rate limiter
// limit: max tokens per windowMs
export function rateLimit({ key, limit, windowMs }: { key: string; limit: number; windowMs: number }) {
  const now = Date.now()
  const bucket = buckets.get(key) || { tokens: limit, lastRefill: now }
  // Refill based on elapsed time
  const elapsed = now - bucket.lastRefill
  if (elapsed > 0) {
    const tokensToAdd = Math.floor((elapsed / windowMs) * limit)
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(limit, bucket.tokens + tokensToAdd)
      bucket.lastRefill = now
    }
  }
  if (bucket.tokens <= 0) {
    buckets.set(key, bucket)
    return { allowed: false, retryAfterMs: windowMs }
  }
  bucket.tokens -= 1
  buckets.set(key, bucket)
  return { allowed: true }
}

export function getClientKeyFromRequest(req: Request, extra?: string) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const ua = req.headers.get('user-agent') || 'ua'
  return `${ip}:${ua}${extra ? ':' + extra : ''}`
}
