import connectDB from "../db";
import DonationEntry from "@/models/DonationEntry";
import ScrapItem from "@/models/ScrapItem";
import { Types } from "mongoose";
import { getClerkUserWithSupplementaryData } from "./user.service";
import { calculateValidationStatus } from "@/lib/utils/validation";
import { EnhancedScrapItem } from "@/types/dashboard";

export async function createDonationEntry(data: any) {
    await connectDB();
    const doc = await DonationEntry.create(data);
    return doc.toObject();
}

export async function getDonationEntryById(id: string) {
    await connectDB();
    if (!Types.ObjectId.isValid(id)) return null;
    return await DonationEntry.findById(id).populate("items").lean();
}

export async function listDonationEntries({ page = 1, limit = 20, donorId, status, q, itemStatus, from, to, sort, includeCounts = false, enrichDonor = false }: any = {}) {
    await connectDB();
    const skip = (page - 1) * limit;
    const query: any = {};
    if (donorId) query.donor = donorId;
    if (status) query.status = status;
    if (from || to) {
        query.createdAt = {}
        if (from) (query.createdAt as any).$gte = new Date(from)
        if (to) (query.createdAt as any).$lte = new Date(to)
    }

    // text search on donor name/email is not indexed on DonationEntry; we'll enrich after fetch for small pages
    let sortSpec: any = { createdAt: -1 }
    if (sort === 'status') sortSpec = { status: 1, createdAt: -1 }
    if (sort === 'donor') sortSpec = { donor: 1, createdAt: -1 }

    const [entriesRaw, total] = await Promise.all([
        DonationEntry.find(query).sort(sortSpec).skip(skip).limit(limit).lean(),
        DonationEntry.countDocuments(query)
    ]);

    let entries = entriesRaw as any[]

    // Include counts per entry, optionally filter by itemStatus
    if (includeCounts || itemStatus) {
        const ids = entries.map(e => e._id)
        
        // Get all items for validation status calculation
        const allItems = await ScrapItem.find({ scrapEntry: { $in: ids } }).lean()
        
        // Calculate validation status for each item
        const itemsWithValidation = allItems.map(item => {
            const enhancedItem: EnhancedScrapItem = {
                id: (item as any)._id?.toString() || '',
                name: item.name,
                condition: item.condition,
                photos: item.photos,
                marketplaceListing: item.marketplaceListing,
                repairingCost: (item as any).repairingCost,
                validationStatus: { canList: true, errors: [], warnings: [] },
                createdAt: (item as any).createdAt || new Date().toISOString(),
                updatedAt: (item as any).updatedAt || new Date().toISOString()
            }
            
            enhancedItem.validationStatus = calculateValidationStatus(enhancedItem)
            return { ...item, validationStatus: enhancedItem.validationStatus }
        })
        
        // Group items by entry and calculate counts
        const itemsByEntry = new Map()
        itemsWithValidation.forEach(item => {
            const entryId = String((item as any).scrapEntry)
            if (!itemsByEntry.has(entryId)) {
                itemsByEntry.set(entryId, [])
            }
            itemsByEntry.get(entryId).push(item)
        })
        
        entries = entries.filter(e => {
            const entryItems = itemsByEntry.get(String(e._id)) || []
            const counts = {
                itemsCount: entryItems.length,
                listedCount: entryItems.filter((item: any) => item.marketplaceListing?.listed).length,
                soldCount: entryItems.filter((item: any) => item.marketplaceListing?.sold).length,
                validItemsCount: entryItems.filter((item: any) => item.validationStatus?.canList).length,
                invalidItemsCount: entryItems.filter((item: any) => !item.validationStatus?.canList).length
            }
            
            ;(e as any).itemsCount = counts.itemsCount
            ;(e as any).listedCount = counts.listedCount
            ;(e as any).soldCount = counts.soldCount
            ;(e as any).validItemsCount = counts.validItemsCount
            ;(e as any).invalidItemsCount = counts.invalidItemsCount
            
            if (!itemStatus) return true
            if (itemStatus === 'listed') return counts.listedCount > 0
            if (itemStatus === 'sold') return counts.soldCount > 0
            if (itemStatus === 'unlisted') return counts.itemsCount > counts.listedCount
            if (itemStatus === 'valid') return counts.validItemsCount > 0
            if (itemStatus === 'invalid') return counts.invalidItemsCount > 0
            return true
        })
    }

    // Enrich donor info via Clerk if requested
    if (enrichDonor) {
        await Promise.all(entries.map(async (e) => {
            try { (e as any).donor = await getClerkUserWithSupplementaryData(String(e.donor)) } catch {}
        }))
    }

    // In-memory q filter against donor name/email if provided
    if (q) {
        const qq = q.toLowerCase()
        entries = entries.filter((e: any) => {
            const d = e.donor || {}
            return (d.name?.toLowerCase?.().includes(qq)) || (d.email?.toLowerCase?.().includes(qq))
        })
    }

    return { entries, total, page, limit };
}

export async function updateDonationEntry(id: string, data: any) {
    await connectDB();
    return await DonationEntry.findByIdAndUpdate(id, data, { new: true }).lean();
}

export async function deleteDonationEntry(id: string) {
    await connectDB();
    return await DonationEntry.findByIdAndDelete(id).lean();
}
