import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import WelfareProgram from "@/models/WelfareProgram"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    
    const body = await request.json()
    const { title, slug, description, coverImage, icon, iconColor, donationLink, displayOrder } = body
    
    if (!title || !slug || !description || !coverImage || !icon || !iconColor) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }
    
    // Check if slug already exists
    const existingProgram = await WelfareProgram.findOne({ slug })
    if (existingProgram) {
      return NextResponse.json(
        { error: "A program with this slug already exists" },
        { status: 400 }
      )
    }
    
    const program = new WelfareProgram({
      title,
      slug,
      description,
      coverImage,
      icon,
      iconColor,
      donationLink: donationLink || `/welfare-programs/${slug}`,
      displayOrder: displayOrder || 0
    })
    
    await program.save()
    
    return NextResponse.json(program, { status: 201 })
  } catch (error) {
    console.error("Error creating welfare program:", error)
    return NextResponse.json(
      { error: "Failed to create welfare program" },
      { status: 500 }
    )
  }
}