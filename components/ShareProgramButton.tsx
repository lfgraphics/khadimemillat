'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  slug: string
  title: string
}

export default function ShareProgramButton({ slug, title }: Props) {
  const handleShare = async () => {
    const url = `${window.location.origin}/welfare-programs/${slug}`
    const shareData = {
      title: `${title} - Khadim-Millat Welfare Foundation`,
      text: `Support our ${title} program. Together we can make a difference.`,
      url
    }

    try {
      // Prefer native share when available
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }

      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url)
      toast.success('Program URL copied to clipboard')
    } catch (err) {
      try {
        await navigator.clipboard.writeText(url)
        toast.success('Program URL copied to clipboard')
      } catch (e) {
        toast.error('Failed to share program URL')
      }
    }
  }

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      size="icon"
      title="Share this program"
    >
      <Share2 className="w-4 h-4" />
    </Button>
  )
}
