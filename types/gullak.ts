import type { GeoJSONPoint } from '@/utils/geolocation'

export interface GullakType {
    _id: string
    gullakId: string
    location: {
        address: string
        coordinates: GeoJSONPoint
        landmark?: string
    }
    caretaker: {
        userId: string
        name: string
        phone: string
        assignedAt: string
    }
    status: 'active' | 'inactive' | 'maintenance' | 'full'
    installationDate: string
    lastCollectionDate?: string
    totalCollections: number
    totalAmountCollected: number
    description?: string
    notes?: string
    createdBy?: {
        _id: string
        name: string
    }
    updatedBy?: {
        _id: string
        name: string
    }
    caretakerDetails?: {
        _id: string
        name: string
        phone: string
        email: string
    }
    createdAt: string
    updatedAt: string
}

export interface GullakCollectionType {
    _id: string
    collectionId: string
    gullakId: string
    gullakReadableId: string
    amount: number
    collectionDate: string
    collectedBy: {
        userId: string
        name: string
    }
    caretakerPresent: {
        userId: string
        name: string
        signature?: string
    }
    witnesses?: Array<{
        name: string
        phone?: string
        signature?: string
    }>
    notes?: string
    photos?: string[]
    verificationStatus: 'pending' | 'verified' | 'disputed'
    verifiedBy?: {
        userId: string
        name: string
        verifiedAt: string
        notes?: string
    }
    depositDetails?: {
        bankAccount: string
        transactionId: string
        depositDate: string
        depositedBy: string
    }
    createdBy: string
    createdAt: string
    updatedAt: string
}

export interface CaretakerType {
    _id: string
    name: string
    phone: string
    email: string
}

export interface GullakListResponse {
    success: boolean
    message?: string
    data?: {
        gullaks: GullakType[]
        pagination: {
            page: number
            limit: number
            total: number
            pages: number
        }
    } | null
}

export interface GullakDetailResponse {
    success: boolean
    message?: string
    data?: {
        gullak: GullakType
        recentCollections: GullakCollectionType[]
    } | null
}

export interface CaretakersResponse {
    success: boolean
    message?: string
    data?: CaretakerType[] | null
}