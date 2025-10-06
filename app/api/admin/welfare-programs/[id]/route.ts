import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import connectDB from "@/lib/db"
import WelfareProgram from "@/models/WelfareProgram"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    await connectDB()
    
    const program = await WelfareProgram.findById(id)
    if (!program) {
      return NextResponse.json(
        { error: "Welfare program not found" },
        { status: 404 }
      )
    }
    
    const body = await request.json()
    const { title, description, coverImage, icon, iconColor, donationLink, displayOrder, isActive } = body
    
    if (!title || !description || !coverImage || !icon || !iconColor) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }
    
    // Update program
    program.title = title
    program.description = description
    program.coverImage = coverImage
    program.icon = icon
    program.iconColor = iconColor
    program.donationLink = donationLink || program.donationLink
    program.displayOrder = displayOrder ?? program.displayOrder
    program.isActive = isActive ?? program.isActive
    
    await program.save()
    
    return NextResponse.json(program)
  } catch (error) {
    console.error("Error updating welfare program:", error)
    return NextResponse.json(
      { error: "Failed to update welfare program" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    await connectDB()
    
    const program = await WelfareProgram.findById(id)
    if (!program) {
      return NextResponse.json(
        { error: "Welfare program not found" },
        { status: 404 }
      )
    }
    
    // Soft delete by setting isActive to false
    program.isActive = false
    await program.save()
    
    return NextResponse.json({ message: "Welfare program deleted successfully" })
  } catch (error) {
    console.error("Error deleting welfare program:", error)
    return NextResponse.json(
      { error: "Failed to delete welfare program" },
      { status: 500 }
    )
  }
}