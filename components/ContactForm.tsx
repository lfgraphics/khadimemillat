'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

type Props = {
  // Full Formspree endpoint, e.g. "https://formspree.io/f/xxxxx". If not provided,
  // the component will use the placeholder string and you should set
  // NEXT_PUBLIC_FORMSPREE_ENDPOINT in your environment.
  formEndpoint?: string
}

export default function ContactForm({ formEndpoint }: Props) {
  const endpoint = formEndpoint || (process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT as string) || 'https://formspree.io/f/YOUR_FORM_ID'
  const [status, setStatus] = useState<FormStatus>('idle')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json'
        }
      })

      console.log('Formspree response', res)

      if (res.ok) {
        setStatus('success')
        toast.success('Message sent — we will get back to you soon')
        form.reset()
        setTimeout(() => setStatus('idle'), 4000)
      } else {
        setStatus('error')
        const json = await res.json().catch(() => null)
        console.error('Formspree error', json)
        toast.error('Failed to send message — please try again')
        setTimeout(() => setStatus('idle'), 4000)
      }
    } catch (err) {
      console.error('Submission failed', err)
      setStatus('error')
      toast.error('Network error — please try again')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Your Name *</Label>
          <Input id="name" name="name" required placeholder="Enter your name" className="bg-input-background border-border" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="email" name="email" type="email" placeholder="your.email@example.com (optional)" className="bg-input-background border-border" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+91-XXXXXXXXXX" className="bg-input-background border-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input id="subject" name="subject" required placeholder="What is this about?" className="bg-input-background border-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <Textarea id="message" name="message" required rows={6} placeholder="Tell us how we can help..." className="bg-input-background border-border resize-none" />
      </div>

      <Button type="submit" size="lg" className="w-full bg-primary hoact:bg-primary/90" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending...' : (
          <>
            Send Message
            <Send className="ml-2 w-5 h-5" />
          </>
        )}
      </Button>

      {status === 'success' && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm">
          Thank you! Your message has been sent successfully. We'll get back to you soon.
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          Sorry, there was an error sending your message. Please try again or contact us directly via email.
        </div>
      )}
    </form>
  )
}
