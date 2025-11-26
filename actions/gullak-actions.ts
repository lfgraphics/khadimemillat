'use server'

import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import Gullak from '@/models/Gullak'
import GullakCollection from '@/models/GullakCollection'
import User from '@/models/User'
import { revalidatePath } from 'next/cache'

type ActionState = { success: boolean; message: string; data?: any }

// Check if user has permission for Gullak operations
async function checkGullakPermission(): Promise<{ authorized: boolean; user: any }> {
    const { userId, sessionClaims } = await auth()

    if (!userId) {
        return { authorized: false, user: null }
    }

    const userRole = sessionClaims?.metadata?.role
    const authorizedRoles = ['admin', 'moderator', 'neki_bank_manager']

    if (!userRole || !authorizedRoles.includes(userRole)) {
        return { authorized: false, user: null }
    }

    await connectDB()
    const user = await User.findOne({ clerkUserId: userId })

    if (!user) {
        return { authorized: false, user: null }
    }

    return { authorized: true, user }
}

// Create new Gullak
export async function createGullak(formData: FormData): Promise<ActionState> {
    try {
        const { authorized, user } = await checkGullakPermission()

        if (!authorized) {
            return { success: false, message: 'Not authorized to create Gullaks' }
        }

        await connectDB()

        // Generate unique Gullak ID
        const gullakId = await (Gullak as any).generateGullakId()

        // Get caretaker details
        const caretakerUserId = formData.get('caretakerUserId') as string
        const caretaker = await User.findById(caretakerUserId)

        if (!caretaker || caretaker.role !== 'gullak_caretaker') {
            return { success: false, message: 'Invalid caretaker selected' }
        }

        const gullakData = {
            gullakId,
            location: {
                address: formData.get('address') as string,
                coordinates: {
                    type: 'Point',
                    coordinates: [
                        parseFloat(formData.get('longitude') as string), // longitude first
                        parseFloat(formData.get('latitude') as string)   // latitude second
                    ]
                },
                landmark: formData.get('landmark') as string || undefined
            },
            caretaker: {
                userId: caretaker._id,
                name: caretaker.name,
                phone: caretaker.phone || '',
                assignedAt: new Date()
            },
            installationDate: new Date(formData.get('installationDate') as string),
            description: formData.get('description') as string || undefined,
            notes: formData.get('notes') as string || undefined,
            createdBy: user._id
        }

        const newGullak = new Gullak(gullakData)
        await newGullak.save()

        revalidatePath('/admin/gullak')
        return {
            success: true,
            message: `Gullak ${gullakId} created successfully`,
            data: { gullakId: newGullak.gullakId }
        }

    } catch (error: any) {
        console.error('Error creating Gullak:', error)
        return { success: false, message: error.message || 'Failed to create Gullak' }
    }
}

// Update Gullak
export async function updateGullak(gullakId: string, formData: FormData): Promise<ActionState> {
    try {
        const { authorized, user } = await checkGullakPermission()

        if (!authorized) {
            return { success: false, message: 'Not authorized to update Gullaks' }
        }

        await connectDB()

        const gullak = await Gullak.findOne({ gullakId })
        if (!gullak) {
            return { success: false, message: 'Gullak not found' }
        }

        // Update caretaker if changed
        const caretakerUserId = formData.get('caretakerUserId') as string
        if (caretakerUserId && caretakerUserId !== gullak.caretaker.userId.toString()) {
            const caretaker = await User.findById(caretakerUserId)
            if (!caretaker || caretaker.role !== 'gullak_caretaker') {
                return { success: false, message: 'Invalid caretaker selected' }
            }

            gullak.caretaker = {
                userId: caretaker._id,
                name: caretaker.name,
                phone: caretaker.phone || '',
                assignedAt: new Date()
            }
        }

        // Update other fields
        if (formData.get('address')) {
            gullak.location.address = formData.get('address') as string
        }
        if (formData.get('latitude') && formData.get('longitude')) {
            gullak.location.coordinates = {
                type: 'Point',
                coordinates: [
                    parseFloat(formData.get('longitude') as string), // longitude first
                    parseFloat(formData.get('latitude') as string)   // latitude second
                ]
            }
        }
        if (formData.get('landmark')) {
            gullak.location.landmark = formData.get('landmark') as string
        }
        if (formData.get('status')) {
            gullak.status = formData.get('status') as any
        }
        if (formData.get('description')) {
            gullak.description = formData.get('description') as string
        }
        if (formData.get('notes')) {
            gullak.notes = formData.get('notes') as string
        }

        gullak.updatedBy = user._id
        await gullak.save()

        revalidatePath('/admin/gullak')
        return { success: true, message: `Gullak ${gullakId} updated successfully` }

    } catch (error: any) {
        console.error('Error updating Gullak:', error)
        return { success: false, message: error.message || 'Failed to update Gullak' }
    }
}

// Delete Gullak
export async function deleteGullak(gullakId: string): Promise<ActionState> {
    try {
        const { authorized } = await checkGullakPermission()

        if (!authorized) {
            return { success: false, message: 'Not authorized to delete Gullaks' }
        }

        await connectDB()

        // Check if Gullak has any collections
        const collectionsCount = await GullakCollection.countDocuments({ gullakReadableId: gullakId })
        if (collectionsCount > 0) {
            return {
                success: false,
                message: `Cannot delete Gullak ${gullakId}. It has ${collectionsCount} collection records.`
            }
        }

        const result = await Gullak.deleteOne({ gullakId })
        if (result.deletedCount === 0) {
            return { success: false, message: 'Gullak not found' }
        }

        revalidatePath('/admin/gullak')
        return { success: true, message: `Gullak ${gullakId} deleted successfully` }

    } catch (error: any) {
        console.error('Error deleting Gullak:', error)
        return { success: false, message: error.message || 'Failed to delete Gullak' }
    }
}

// Get all Gullaks with pagination
export async function getGullaks(page: number = 1, limit: number = 10, status?: string) {
    try {
        const { authorized } = await checkGullakPermission()

        if (!authorized) {
            return { success: false, message: 'Not authorized', data: null }
        }

        await connectDB()

        const filter: any = {}
        if (status && status !== 'all') {
            filter.status = status
        }

        const skip = (page - 1) * limit

        const [gullaks, total] = await Promise.all([
            Gullak.find(filter)
                .populate('caretaker.userId', 'name phone email')
                .populate('createdBy', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Gullak.countDocuments(filter)
        ])

        // Serialize the data to ensure proper JSON serialization
        const serializedGullaks = JSON.parse(JSON.stringify(gullaks))

        return {
            success: true,
            data: {
                gullaks: serializedGullaks,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        }

    } catch (error: any) {
        console.error('Error fetching Gullaks:', error)
        return { success: false, message: error.message || 'Failed to fetch Gullaks', data: null }
    }
}

// Get Gullak by ID
export async function getGullakById(gullakId: string) {
    try {
        const { authorized } = await checkGullakPermission()

        if (!authorized) {
            return { success: false, message: 'Not authorized', data: null }
        }

        await connectDB()

        const gullak = await Gullak.findOne({ gullakId })
            .populate('caretaker.userId', 'name phone email')
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .lean()

        if (!gullak) {
            return { success: false, message: 'Gullak not found', data: null }
        }

        // Get collection statistics
        const collections = await GullakCollection.find({ gullakReadableId: gullakId })
            .sort({ collectionDate: -1 })
            .limit(5)
            .lean()

        // Serialize the data to ensure proper JSON serialization
        const serializedGullak = JSON.parse(JSON.stringify(gullak))
        const serializedCollections = JSON.parse(JSON.stringify(collections))

        return {
            success: true,
            data: {
                gullak: serializedGullak,
                recentCollections: serializedCollections
            }
        }

    } catch (error: any) {
        console.error('Error fetching Gullak:', error)
        return { success: false, message: error.message || 'Failed to fetch Gullak', data: null }
    }
}

// Get available caretakers
export async function getAvailableCaretakers() {
    try {
        const { authorized } = await checkGullakPermission()

        if (!authorized) {
            return { success: false, message: 'Not authorized', data: null }
        }

        await connectDB()

        const caretakers = await User.find({
            role: 'gullak_caretaker'
        }).select('_id name phone email').lean()

        // Serialize the data to ensure proper JSON serialization
        const serializedCaretakers = JSON.parse(JSON.stringify(caretakers))

        return {
            success: true,
            data: serializedCaretakers
        }

    } catch (error: any) {
        console.error('Error fetching caretakers:', error)
        return { success: false, message: error.message || 'Failed to fetch caretakers', data: null }
    }
}