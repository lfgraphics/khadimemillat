"use client"

import React from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getCloudinaryUrl } from '@/lib/cloudinary-client'
import { DialogTitle } from '@radix-ui/react-dialog'

export type ClickableImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  caption?: string
  transform?: { width?: number; height?: number; crop?: string }
}

export function ClickableImage({ src, alt, className, caption, transform, ...rest }: ClickableImageProps) {
  const [open, setOpen] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const resolved = React.useMemo(() => {
    const s = typeof src === 'string' ? src : ''
    if (!s) return ''
    // small thumb for list view
    const thumb = getCloudinaryUrl(s, transform || { width: 256, height: 256, crop: 'fill' })
    return thumb
  }, [src, transform])

  const full = React.useMemo(() => {
    const s = typeof src === 'string' ? src : ''
    if (!s) return ''
    return getCloudinaryUrl(s)
  }, [src])

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved || (typeof src === 'string' ? src : '')}
        alt={alt}
        className={cn('cursor-zoom-in', className)}
        onClick={() => !error && setOpen(true)}
        onLoad={() => setLoaded(true)}
        onError={() => setError('Failed to load image')}
        {...rest}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 overflow-hidden">
            <DialogTitle />
          <div className="relative flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {full ? (
              <img src={full} alt={alt} className="max-h-[80vh] w-auto h-auto object-contain" />
            ) : (
              <div className="text-sm text-muted-foreground p-6">No image</div>
            )}
          </div>
          {caption && (
            <div className="px-4 py-2 text-sm text-muted-foreground border-t bg-background">{caption}</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ClickableImage
