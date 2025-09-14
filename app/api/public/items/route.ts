import { NextResponse } from "next/server";
import { listPublicItems, createScrapItem } from "@/lib/services/scrapItem.service";
import { scrapItemCreateSchema } from "@/lib/validators/scrapItem.validator";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") || "1");
    const limit = Number(url.searchParams.get("limit") || "20");
    const search = url.searchParams.get("q") || undefined;
    const condition = url.searchParams.get("condition") || undefined;

    const result = await listPublicItems({ page, limit, search, condition });
    return NextResponse.json(result);
}

// Optional: allow public creation? if yes, validate & upload images server-side
export async function POST(req: Request) {
    try {
        const json = await req.json();
        const parsed = scrapItemCreateSchema.parse(json);
        const created = await createScrapItem(parsed);
        return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || err }, { status: 400 });
    }
}
