import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
import { requireUser } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary-server";

export async function POST(req: NextRequest) {
    try {
        // AuthN
        try { requireUser(req) } catch (e: any) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        }

        // Validate Cloudinary server envs early for clearer errors
        const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env as Record<string, string | undefined>
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
            return NextResponse.json({ error: 'Cloudinary server credentials missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.' }, { status: 500 })
        }

        // Expect JSON body with base64 Data URL or an image URL
        let imageBase64: string | undefined
        try {
            const body = await req.json()
            imageBase64 = body?.imageBase64
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
        }
        if (!imageBase64 || typeof imageBase64 !== 'string') {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 })
        }

        // Basic size/type guard for data URLs (approximate)
        if (imageBase64.startsWith('data:')) {
            const meta = imageBase64.substring(5, imageBase64.indexOf(',')) // e.g., image/png;base64
            const base64Data = imageBase64.split(',')[1] || ''
            const bytes = Math.ceil(base64Data.length * 3 / 4)
            const maxBytes = 8 * 1024 * 1024 // 8MB
            if (!/^image\//.test(meta)) {
                return NextResponse.json({ error: 'Unsupported data URL; must be image/*' }, { status: 400 })
            }
            if (bytes > maxBytes) {
                return NextResponse.json({ error: 'Image exceeds 8MB limit' }, { status: 413 })
            }
        }

        const result = await uploadImage(imageBase64, { transformation: [] });
        return NextResponse.json({ success: true, url: result.secure_url, raw: result });
    } catch (err: any) {
        console.error('[UPLOAD_IMAGE_FAILED]', err)
        const msg = typeof err?.message === 'string' ? err.message : 'Upload failed'
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
