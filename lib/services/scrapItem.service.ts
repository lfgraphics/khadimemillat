import connectDB from "../db";
import ScrapItem from "../../models/ScrapItem";
// Ensure DonationEntry schema is registered for populate('scrapEntry')
import "../../models/DonationEntry";
import { Types } from "mongoose";

export type PaginateOpts = { page?: number, limit?: number, search?: string, condition?: string };

export async function listPublicItems(opts: PaginateOpts = {}) {
    await connectDB();
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, opts.limit || 20);
    const skip = (page - 1) * limit;

    const query: any = { 'marketplaceListing.listed': true, 'marketplaceListing.sold': false };
    if (opts.search) {
        query.name = { $regex: opts.search, $options: "i" };
    }
    if (opts.condition) {
        query.condition = opts.condition;
    }

    const [items, total] = await Promise.all([
        ScrapItem.find(query)
            .select("name _id photos marketplaceListing condition createdAt")
            .populate('scrapEntry', 'donor status createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ScrapItem.countDocuments(query)
    ]);

    return { items, total, page, limit };
}

export async function getItemById(id: string) {
    await connectDB();
    if (!Types.ObjectId.isValid(id)) return null;
    return ScrapItem.findById(id).lean();
}

export async function createScrapItem(data: any) {
    await connectDB();
    const doc = await ScrapItem.create(data);
    return doc.toObject();
}

export async function createScrapItems(data: any[]) {
    await connectDB();
    const docs = await ScrapItem.insertMany(data);
    return docs;
}

export async function updateScrapItem(id: string, data: any) {
    await connectDB();
    return ScrapItem.findByIdAndUpdate(id, data, { new: true }).lean();
}

export async function deleteScrapItem(id: string) {
    await connectDB();
    return ScrapItem.findByIdAndDelete(id).lean();
}
