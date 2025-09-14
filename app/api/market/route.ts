import ScrapItem from '@/models/ScrapItem';
import { NextResponse } from "next/server"
import connectDB from "@/lib/db"

export async function GET(req:Request) {
    try{
        await connectDB()
        
    }catch(err){}
}

export async function POST(req: Request) {
    try {
        await connectDB()
        const body = await req.json()

        const { donorId, items } = body

        if (!donorId) return console.log('No doner id provider')

        // ensure donor exists
        const donor = await User.findById(donorId)
        if (!donor) return NextResponse.json({ error: "Donor not found" }, { status: 404 })

        const entry = await ScrapEntry.create({ donor: donorId, items: [] })

        return NextResponse.json(entry, { status: 201 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "Failed to create scrap entry" }, { status: 500 })
    }
}
