import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
    try {
        requireUser(req);
        // Expect JSON body with base64 data or an image URL
        const { imageBase64 } = await req.json();
        if (!imageBase64) return NextResponse.json({ error: "No image" }, { status: 400 });

        const result = await uploadImage(imageBase64, { transformation: [] });
        return NextResponse.json({ success: true, url: result.secure_url, raw: result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
