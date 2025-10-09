// Prefer @zxing/browser APIs when available for better camera/image handling
let browserPkg: any = null

// Dynamic import to avoid build issues with server-side rendering
async function getBrowserPkg() {
    if (typeof window === 'undefined') return null // Server-side
    if (browserPkg !== null) return browserPkg // Already loaded
    
    try {
        browserPkg = await import('@zxing/browser')
        return browserPkg
    } catch (_) {
        browserPkg = false // Mark as failed to avoid repeated attempts
        return null
    }
}

import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
const codeReader = new BrowserMultiFormatReader()

export async function decodeBarcodeFromFile({ file }: { file: File }): Promise<string | null> {
    const img = new Image()
    const url = URL.createObjectURL(file)
    try {
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = url
        })
        
        const browser = await getBrowserPkg()
        if (browser?.BrowserMultiFormatReader) {
            const reader = new browser.BrowserMultiFormatReader()
            try {
                const result = await reader.decodeFromImage(img)
                reader.reset?.()
                return result?.getText?.() || null
            } catch (e) {
                if ((e as any)?.name === 'NotFoundException') return null
                throw e
            }
        }
        // Fallback to @zxing/library API
        const anyReader: any = codeReader as any
        if (typeof anyReader.decodeFromImageElement === 'function') {
            const result = await anyReader.decodeFromImageElement(img)
                    ;(codeReader as any).reset?.()
            return result?.getText?.() || null
        }
        return null
    } finally {
        URL.revokeObjectURL(url)
    }
}

export async function decodeBarcodeFromVideo({ videoElement }: { videoElement: HTMLVideoElement }): Promise<string | null> {
    // Try multiple short attempts then reset to keep performance high
    const attempts = 3
    for (let i = 0; i < attempts; i++) {
        try {
            const browser = await getBrowserPkg()
            if (browser?.BrowserMultiFormatReader) {
                const reader = new browser.BrowserMultiFormatReader()
                const result = await reader.decodeOnceFromVideoElement(videoElement)
                reader.reset?.()
                return result?.getText?.() || null
            } else {
                const result = await codeReader.decodeFromVideoElement(videoElement)
                ;(codeReader as any).reset?.()
                return result?.getText() || null
            }
        } catch (e) {
            if (e instanceof NotFoundException || (e as any)?.name === 'NotFoundException') {
                await new Promise(res => setTimeout(res, 200))
                continue
            }
            throw e
        }
    }
    return null
}

export function validateItemId({ decodedText }: { decodedText: string }): boolean {
    return /^[a-f\d]{24}$/i.test(decodedText)
}
