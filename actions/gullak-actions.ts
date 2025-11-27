'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import connectDB from '@/lib/db'
import Gullak from '@/models/Gullak'
import GullakCollection from '@/models/GullakCollection'
import User from '@/models/User'
import { revalidatePath } from 'next/cache'
import { notificationService } from '@/lib/services/notification.service'

type ActionState = { success: boolean; message: string; data?: any }

// Check if user has permission for Gullak operations
async function checkGullakPermission(): Promise<{ authorized: boolean; userId: string }> {
    const { userId, sessionClaims } = await auth()

    if (!userId) {
        return { authorized: false, userId: '' }
    }

    const userRole = sessionClaims?.metadata?.role as string
    const userRoles = (sessionClaims?.metadata as any)?.roles as string[] || []
    const allRoles = [...(userRoles || []), ...(userRole ? [userRole] : [])]
    const authorizedRoles = ['admin', 'moderator', 'neki_bank_manager', 'gullak_caretaker']

    if (!allRoles.some(role => authorizedRoles.includes(role))) {
        return { authorized: false, userId: '' }
    }

    return { authorized: true, userId }
}

// Create new Gullak
export async function createGullak(formData: FormData): Promise<ActionState> {
    try {
        const { authorized, userId } = await checkGullakPermission()

        if (!authorized) {
            return { success: false, message: 'Not authorized to create Gullaks' }
        }

        await connectDB()

        // Generate unique Gullak ID
        const gullakId = await (Gullak as any).generateGullakId()

        // Get caretaker details from Clerk
        const caretakerUserId = formData.get('caretakerUserId') as string
        
        const client = await clerkClient()
        const caretaker = await client.users.getUser(caretakerUserId)
        
        if (!caretaker) {
            return { success: false, message: 'Invalid caretaker selected' }
        }

        // Verify caretaker has the right role
        const roles = caretaker.publicMetadata?.roles as string[] || []
        const singleRole = caretaker.publicMetadata?.role as string
        const allRoles = [...roles, ...(singleRole ? [singleRole] : [])]
        
        if (!allRoles.includes('gullak_caretaker')) {
            return { success: false, message: 'Selected user is not a Gullak caretaker' }
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
                userId: caretaker.id, // Clerk user ID
                name: `${caretaker.firstName || ''} ${caretaker.lastName || ''}`.trim() || 'Unknown',
                phone: formData.get('caretakerPhone') as string,
                assignedAt: new Date()
            },
            installationDate: new Date(formData.get('installationDate') as string),
            description: formData.get('description') as string || undefined,
            notes: formData.get('notes') as string || undefined,
            image: formData.get('image') as string || undefined,
            createdBy: userId // Clerk user ID
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
        const { authorized, userId } = await checkGullakPermission()

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
        if (caretakerUserId && caretakerUserId !== gullak.caretaker.userId) {
            const client = await clerkClient()
            const caretaker = await client.users.getUser(caretakerUserId)
            
            if (!caretaker) {
                return { success: false, message: 'Invalid caretaker selected' }
            }

            // Verify caretaker has the right role
            const roles = caretaker.publicMetadata?.roles as string[] || []
            const singleRole = caretaker.publicMetadata?.role as string
            const allRoles = [...roles, ...(singleRole ? [singleRole] : [])]
            
            if (!allRoles.includes('gullak_caretaker')) {
                return { success: false, message: 'Selected user is not a Gullak caretaker' }
            }

            gullak.caretaker = {
                userId: caretaker.id, // Clerk user ID
                name: `${caretaker.firstName || ''} ${caretaker.lastName || ''}`.trim() || 'Unknown',
                phone: formData.get('caretakerPhone') as string || gullak.caretaker.phone,
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

        gullak.updatedBy = userId // Clerk user ID
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

// Get available caretakers from Clerk (single source of truth)
export async function getAvailableCaretakers() {
    try {
        const { authorized } = await checkGullakPermission()

        if (!authorized) {
            return { success: false, message: 'Not authorized', data: null }
        }

        // Use a hybrid approach: Store caretaker IDs in MongoDB for efficiency
        // but get user details from Clerk for accuracy
        await connectDB()
        
        // First, get all users who have been assigned gullak_caretaker role
        // We'll store this mapping in a simple collection for performance
        const client = await clerkClient()
        
        // For now, let's use a more targeted approach
        // Get users with query (Clerk supports some filtering)
        const users = await client.users.getUserList({
            limit: 500, // Increased limit
        })

        console.log(`Fetched ${users.data.length} users from Clerk`)

        // Filter users who have gullak_caretaker role
        const caretakers = users.data
            .filter((user: any) => {
                // Check both singular 'role' and plural 'roles' in metadata
                const roles = user.publicMetadata?.roles as string[] || []
                const singleRole = user.publicMetadata?.role as string
                const privateRoles = user.privateMetadata?.roles as string[] || []
                const privateSingleRole = user.privateMetadata?.role as string
                const unsafeRoles = user.unsafeMetadata?.roles as string[] || []
                const unsafeSingleRole = user.unsafeMetadata?.role as string
                
                // Combine all possible role sources
                const allRoles = [
                    ...roles,
                    ...(singleRole ? [singleRole] : []),
                    ...privateRoles,
                    ...(privateSingleRole ? [privateSingleRole] : []),
                    ...unsafeRoles,
                    ...(unsafeSingleRole ? [unsafeSingleRole] : [])
                ]
                
                const hasRole = allRoles.includes('gullak_caretaker')
                
                return hasRole
            })
            .map((user: any) => ({
                _id: user.id,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
                phone: user.phoneNumbers?.[0]?.phoneNumber || '',
                email: user.emailAddresses?.[0]?.emailAddress || ''
            }))

        console.log(`Found ${caretakers.length} caretakers`)

        return {
            success: true,
            data: caretakers
        }

    } catch (error: any) {
        console.error('Error fetching caretakers from Clerk:', error)
        return { success: false, message: error.message || 'Failed to fetch caretakers', data: null }
    }
}

// Collection Management Actions

// Create new Gullak Collection
export async function createGullakCollection(formData: FormData): Promise<ActionState> {
    try {
        const { authorized, userId } = await checkGullakPermission()

        if (!authorized) {
            return { success: false, message: 'Not authorized to create collections' }
        }

        await connectDB()

        // Generate unique Collection ID
        const collectionId = await (GullakCollection as any).generateCollectionId()

        // Get gullak details
        const gullakReadableId = formData.get('gullakId') as string
        const gullak = await Gullak.findOne({ gullakId: gullakReadableId })
        
        if (!gullak) {
            return { success: false, message: 'Gullak not found' }
        }

        // Parse photos array
        const photosJson = formData.get('photos') as string
        const photos = photosJson ? JSON.parse(photosJson) : []

        // Parse witnesses array
        const witnessesJson = formData.get('witnesses') as string
        const witnesses = witnessesJson ? JSON.parse(witnessesJson) : []

        // Check if this is a caretaker request (no amount provided) or admin collection
        const amount = formData.get('amount') as string
        const estimatedAmount = formData.get('estimatedAmount') as string
        const status = formData.get('status') as string
        
        const collectionData = {
            collectionId,
            gullakId: gullak._id,
            gullakReadableId,
            amount: amount ? parseFloat(amount) : (estimatedAmount ? parseFloat(estimatedAmount) : 0),
            collectionDate: new Date((formData.get('collectionDate') || formData.get('reportDate')) as string),
            collectedBy: {
                userId: userId,
                name: formData.get('collectorName') as string || 'Caretaker Request'
            },
            caretakerPresent: {
                userId: formData.get('caretakerId') as string,
                name: formData.get('caretakerName') as string,
                signature: formData.get('caretakerSignature') as string || undefined
            },
            witnesses,
            notes: formData.get('notes') as string || undefined,
            photos,
            verificationStatus: status === 'collection_requested' ? 'pending' : 'pending',
            createdBy: userId
        }

        const newCollection = new GullakCollection(collectionData)
        await newCollection.save()

        // Update Gullak status based on collection type
        if (status === 'collection_requested') {
            // Caretaker is requesting collection - mark Gullak as full
            await Gullak.findByIdAndUpdate(gullak._id, {
                status: 'full',
                updatedBy: userId
            })

            // Notify admins and neki bank managers about collection request (web push only)
            try {
                // Get admin/moderator/neki_bank_manager user IDs
                const adminUsers = await User.find({ 
                    role: { $in: ['admin', 'moderator', 'neki_bank_manager'] } 
                }).select('clerkUserId').lean()
                
                const adminUserIds = adminUsers.map(user => user.clerkUserId)
                
                await notificationService.notifyUsersWebPushOnly(
                    adminUserIds,
                    {
                        title: `🏦 Gullak Collection Request - ${gullak.gullakId}`,
                        body: `${gullak.caretaker.name} has requested collection for Gullak ${gullak.gullakId} at ${gullak.location.address}. Estimated amount: ₹${collectionData.amount || 'Not specified'}`,
                        url: `/admin/gullak/${gullak.gullakId}/collections/${collectionId}`,
                        type: 'gullak_collection_request'
                    }
                )
            } catch (notificationError) {
                console.error('Failed to send collection request notification:', notificationError)
                // Don't fail the collection creation if notification fails
            }
        } else {
            // Admin is recording actual collection - just set status to active
            // Stats will be updated when collection is verified
            await Gullak.findByIdAndUpdate(gullak._id, {
                lastCollectionDate: collectionData.collectionDate,
                status: 'active', // Ensure it's active after collection
                updatedBy: userId
            })

            // Notify caretaker about collection recording (web push only)
            try {
                await notificationService.notifyUsersWebPushOnly(
                    [gullak.caretaker.userId],
                    {
                        title: `✅ Collection Recorded - ${gullak.gullakId}`,
                        body: `Your Gullak collection of ₹${collectionData.amount} has been recorded and is pending verification.`,
                        url: `/gullak-caretaker/gullak/${gullak.gullakId}`,
                        type: 'gullak_collection_recorded'
                    }
                )
            } catch (notificationError) {
                console.error('Failed to send collection recorded notification:', notificationError)
                // Don't fail the collection creation if notification fails
            }
        }

        revalidatePath('/admin/gullak')
        revalidatePath(`/admin/gullak/${gullakReadableId}`)
        revalidatePath('/gullak-caretaker')

        const message = status === 'collection_requested' 
            ? `Collection request ${collectionId} submitted successfully`
            : `Collection ${collectionId} recorded successfully`

        return {
            success: true,
            message,
            data: { collectionId }
        }

    } catch (error: any) {
        console.error('Error creating collection:', error)
        return { success: false, message: error.message || 'Failed to record collection' }
    }
}

// Get collections for a specific Gullak
export async function getGullakCollections(gullakId: string, page: number = 1, limit: number = 10) {
    try {
        const { authorized } = await checkGullakPermission()

        if (!authorized) {
            return { success: false, message: 'Not authorized', data: null }
        }

        await connectDB()

        const skip = (page - 1) * limit

        const [collections, total] = await Promise.all([
            GullakCollection.find({ gullakReadableId: gullakId })
                .sort({ collectionDate: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            GullakCollection.countDocuments({ gullakReadableId: gullakId })
        ])

        return {
            success: true,
            data: {
                collections: JSON.parse(JSON.stringify(collections)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        }

    } catch (error: any) {
        console.error('Error fetching collections:', error)
        return { success: false, message: error.message || 'Failed to fetch collections', data: null }
    }
}

// Verify a collection (for finance officers/admins)
export async function verifyGullakCollection(collectionId: string, formData: FormData): Promise<ActionState> {
    try {
        const { authorized, userId } = await checkGullakPermission()

        if (!authorized) {
            return { success: false, message: 'Not authorized to verify collections' }
        }

        await connectDB()

        const status = formData.get('status') as 'verified' | 'disputed'
        const notes = formData.get('notes') as string

        const collection = await GullakCollection.findOne({ collectionId })
        
        if (!collection) {
            return { success: false, message: 'Collection not found' }
        }

        collection.verificationStatus = status
        collection.verifiedBy = {
            userId: userId,
            name: formData.get('verifierName') as string,
            verifiedAt: new Date(),
            notes: notes || undefined
        }

        await collection.save()

        // Update Gullak status when collection is verified
        if (status === 'verified') {
            // Get the gullak and update its status and stats
            const gullak = await Gullak.findById(collection.gullakId)
            if (gullak) {
                await Gullak.findByIdAndUpdate(gullak._id, {
                    $inc: { 
                        totalCollections: 1,
                        totalAmountCollected: collection.amount
                    },
                    lastCollectionDate: collection.collectionDate,
                    status: 'active', // Set back to active after successful collection
                    updatedBy: userId
                })

                // Notify caretaker about verification (web push only)
                try {
                    await notificationService.notifyUsersWebPushOnly(
                        [gullak.caretaker.userId],
                        {
                            title: `🎉 Collection Verified - ${gullak.gullakId}`,
                            body: `Your collection of ₹${collection.amount} has been verified and approved. The Gullak is now active again for new donations.`,
                            url: `/gullak-caretaker/gullak/${gullak.gullakId}`,
                            type: 'gullak_collection_verified'
                        }
                    )
                } catch (notificationError) {
                    console.error('Failed to send collection verified notification:', notificationError)
                    // Don't fail the verification if notification fails
                }
            }
        } else if (status === 'disputed') {
            // Notify caretaker about dispute
            const gullak = await Gullak.findById(collection.gullakId)
            if (gullak) {
                try {
                    await notificationService.notifyUsersWebPushOnly(
                        [gullak.caretaker.userId],
                        {
                            title: `⚠️ Collection Disputed - ${gullak.gullakId}`,
                            body: `Your collection of ₹${collection.amount} has been disputed. Please contact administration for clarification.`,
                            url: `/gullak-caretaker/gullak/${gullak.gullakId}`,
                            type: 'gullak_collection_disputed'
                        }
                    )
                } catch (notificationError) {
                    console.error('Failed to send collection disputed notification:', notificationError)
                    // Don't fail the verification if notification fails
                }
            }
        }

        revalidatePath('/admin/gullak')
        revalidatePath(`/admin/gullak/${collection.gullakReadableId}`)
        revalidatePath('/gullak-caretaker')
        
        return {
            success: true,
            message: `Collection ${collectionId} ${status} successfully`
        }

    } catch (error: any) {
        console.error('Error verifying collection:', error)
        return { success: false, message: error.message || 'Failed to verify collection' }
    }
}