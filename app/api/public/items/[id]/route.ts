import { NextResponse } from "next/server";
import { getItemById } from "@/lib/services/scrapItem.service";

export async function GET(req: Request, { params }: any) {
    const { id } = params;
    const item = await getItemById(id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
}
