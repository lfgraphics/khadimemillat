import { NextResponse } from "next/server";
import { getItemById } from "@/lib/services/scrapItem.service";

export async function GET(req: Request, { params }: any) {
    const { id } = await params;
    const item = await getItemById(id);
    if (!item) return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    return NextResponse.json({ success: true, item });
}
