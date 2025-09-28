"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn, safeJson } from '@/lib/utils'
import { toast } from 'sonner'

export type ImageUploaderProps = {
    value?: string[]
    onChange?: (publicIds: string[]) => void
    accept?: string
    maxFiles?: number
    maxSizeMB?: number
    className?: string
    multiple?: boolean
    label?: string
}

export function ImageUploader({ value = [], onChange, accept = 'image/*', maxFiles = 6, maxSizeMB = 8, className, multiple = true, label = 'Upload images' }: ImageUploaderProps) {
    const [dragOver, setDragOver] = React.useState(false)
    const [uploading, setUploading] = React.useState(false)
    const [progress, setProgress] = React.useState<number>(0)
    const inputRef = React.useRef<HTMLInputElement | null>(null)

    // Replace existing set with new uploads (verification requirement: "add or replace")
    const replaceIds = (ids: string[]) => {
        onChange?.(ids)
    }

    const validate = (files: File[]) => {
        const problems: string[] = []
        if (files.length > maxFiles) problems.push(`You can upload up to ${maxFiles} images.`)
        for (const f of files) {
            if (!f.type.startsWith('image/')) problems.push(`${f.name}: not an image`)
            if (f.size > maxSizeMB * 1024 * 1024) problems.push(`${f.name}: exceeds ${maxSizeMB}MB`)
        }
        if (problems.length) toast.error(problems.join('\n'))
        return problems.length === 0
    }

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return
        const arr = Array.from(files)
        if (!validate(arr)) return
        setUploading(true); setProgress(0)
        try {
            const ids: string[] = []
            let done = 0
            for (const f of arr) {
                // read as base64
                const base64 = await new Promise<string>((resolve, reject) => {
                    const fr = new FileReader(); fr.onload = () => resolve(fr.result as string); fr.onerror = reject; fr.readAsDataURL(f)
                })
                const res = await fetch('/api/protected/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64 }) })
                if (!res.ok) throw new Error(await res.text())
                const json = await safeJson<any>(res)
                const publicId = json?.raw?.public_id || ''
                if (publicId) ids.push(publicId)
                done += 1
                setProgress(Math.round((done / arr.length) * 100))
            }
            if (ids.length) {
                replaceIds(ids)
                toast.success(`${ids.length} image(s) uploaded (replaced previous set)`)
            }
        } catch (e: any) {
            toast.error(e.message || 'Upload failed')
        } finally { setUploading(false) }
    }

    const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault(); e.stopPropagation(); setDragOver(false)
        handleFiles(e.dataTransfer.files)
    }

    const onPick = () => inputRef.current?.click()

    return (
        <div className={cn('border rounded-md p-3', dragOver && 'ring-2 ring-primary/40', className)}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
            onDrop={onDrop}
            role="button"
            aria-label={label}
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onPick() }}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                    {label} {multiple ? '(drag & drop or click to select)' : ''}
                </div>
                <Button size="sm" onClick={onPick} disabled={uploading}>Select</Button>
            </div>
            <input ref={inputRef} type="file" accept={accept} multiple={multiple} hidden onChange={e => handleFiles(e.target.files)} />
            {uploading && (
                <div className="pt-3">
                    <Progress value={progress} />
                    <div className="text-xs text-muted-foreground mt-1">Uploading… {progress}%</div>
                </div>
            )}
            {!uploading && value.length > 0 && (
                <div className="pt-3">
                    <div className="flex flex-wrap gap-2">
                        {value.map((id, i) => (
                            <div key={id + i} className="relative group w-16 h-16 rounded border overflow-hidden bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={id.startsWith('http') || id.startsWith('data:') ? id : `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_128,h_128,c_fill/${id}`} alt={id} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); const next = value.filter((_, idx) => idx !== i); onChange?.(next) }}
                                    className="absolute top-0 right-0 m-0.5 bg-black/60 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                    aria-label="Remove image"
                                >×</button>
                            </div>
                        ))}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Selecting new files will replace all current images.</div>
                </div>
            )}
        </div>
    )
}

export default ImageUploader
