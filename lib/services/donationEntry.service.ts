import connectDB from "../db";
import DonationEntry from "@/models/DonationEntry";
import ScrapItem from "@/models/ScrapItem";
import { Types } from "mongoose";
import { getClerkUserWithSupplementaryData } from "./user.service";

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
        const items = await ScrapItem.aggregate([
            { $match: { scrapEntry: { $in: ids } } },
            {
                $group: {
                    _id: "$scrapEntry",
                    total: { $sum: 1 },
                    listed: { $sum: { $cond: ["$marketplaceListing.listed", 1, 0] } },
                    sold: { $sum: { $cond: ["$marketplaceListing.sold", 1, 0] } },
                }
            }
        ])
        const byEntry = new Map(items.map(it => [String(it._id), it]))
        entries = entries.filter(e => {
            const g = byEntry.get(String(e._id))
            const counts = {
                itemsCount: g?.total || 0,
                listedCount: g?.listed || 0,
                soldCount: g?.sold || 0
            }
            ;(e as any).itemsCount = counts.itemsCount
            ;(e as any).listedCount = counts.listedCount
            ;(e as any).soldCount = counts.soldCount
            if (!itemStatus) return true
            if (itemStatus === 'listed') return counts.listedCount > 0
            if (itemStatus === 'sold') return counts.soldCount > 0
            if (itemStatus === 'unlisted') return counts.itemsCount > counts.listedCount
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
