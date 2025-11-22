import { NextResponse } from "next/server";
import { listPublicItems, createScrapItem } from "@/lib/services/scrapItem.service";
import { scrapItemCreateSchema } from "@/lib/validators/scrapItem.validator";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") || "1");
    const limit = Number(url.searchParams.get("limit") || "20");
    const search = url.searchParams.get("q") || undefined;
    const condition = url.searchParams.get("condition") || undefined;
    const priceMin = url.searchParams.get("priceMin") ? Number(url.searchParams.get("priceMin")) : undefined;
    const priceMax = url.searchParams.get("priceMax") ? Number(url.searchParams.get("priceMax")) : undefined;
    const sortBy = url.searchParams.get("sortBy") as 'newest' | 'oldest' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc' | undefined;
    const availabilityParam = url.searchParams.get("availability");
    const availability = (availabilityParam === 'all' || availabilityParam === 'available' || availabilityParam === 'sold') 
        ? availabilityParam 
        : undefined;

    const result = await listPublicItems({ 
        page, 
        limit, 
        search, 
        condition, 
        priceMin, 
        priceMax, 
        sortBy, 
        availability 
    });
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
