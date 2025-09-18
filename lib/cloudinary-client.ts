export function getCloudinaryUrl(publicId: string, opts: { width?: number; height?: number; crop?: string } = {}) {
  if (!publicId) return ''
  if (publicId.startsWith('data:') || publicId.startsWith('http')) return publicId
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) return publicId
  const t: string[] = []
  if (opts.width) t.push(`w_${opts.width}`)
  if (opts.height) t.push(`h_${opts.height}`)
  if (opts.crop) t.push(`c_${opts.crop}`)
  const base = `https://res.cloudinary.com/${cloudName}/image/upload${t.length ? '/' + t.join(',') : ''}`
  return `${base}/${publicId}`
}
