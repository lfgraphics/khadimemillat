import connectDB from "../db";
import ScrapItem from "../../models/ScrapItem";
// Ensure DonationEntry schema is registered for populate('scrapEntry')
import "../../models/DonationEntry";
import { Types } from "mongoose";

export type PaginateOpts = { 
    page?: number, 
    limit?: number, 
    search?: string, 
    condition?: string,
    priceMin?: number,
    priceMax?: number,
    sortBy?: 'newest' | 'oldest' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc',
    availability?: 'all' | 'available' | 'sold'
};

export async function listPublicItems(opts: PaginateOpts = {}) {
    await connectDB();
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, opts.limit || 20);
    const skip = (page - 1) * limit;

    const query: any = { 
        'marketplaceListing.listed': true
    };

    // Search filter
    if (opts.search) {
        query.$or = [
            { name: { $regex: opts.search, $options: "i" } },
            { description: { $regex: opts.search, $options: "i" } }
        ];
    }

    // Condition filter
    if (opts.condition && opts.condition !== 'all') {
        query.condition = opts.condition;
    }

    // Price range filter
    if (opts.priceMin !== undefined || opts.priceMax !== undefined) {
        query['marketplaceListing.salePrice'] = {};
        if (opts.priceMin !== undefined) {
            query['marketplaceListing.salePrice'].$gte = opts.priceMin;
        }
        if (opts.priceMax !== undefined) {
            query['marketplaceListing.salePrice'].$lte = opts.priceMax;
        }
    }

    // Availability filter
    if (opts.availability === 'available') {
        query['marketplaceListing.sold'] = false;
        query.availableQuantity = { $gt: 0 };
    } else if (opts.availability === 'sold') {
        query['marketplaceListing.sold'] = true;
    }

    // Sort options
    let sortQuery: any = { createdAt: -1 }; // default
    switch (opts.sortBy) {
        case 'oldest':
            sortQuery = { createdAt: 1 };
            break;
        case 'price-low':
            sortQuery = { 'marketplaceListing.salePrice': 1 };
            break;
        case 'price-high':
            sortQuery = { 'marketplaceListing.salePrice': -1 };
            break;
        case 'name-asc':
            sortQuery = { name: 1 };
            break;
        case 'name-desc':
            sortQuery = { name: -1 };
            break;
        case 'newest':
        default:
            sortQuery = { createdAt: -1 };
            break;
    }

    const [items, total] = await Promise.all([
        ScrapItem.find(query)
            .select("name _id photos marketplaceListing condition quantity availableQuantity createdAt description")
            .populate('scrapEntry', 'donor status createdAt')
            .sort(sortQuery)
            .skip(skip)
            .limit(limit)
            .lean(),
        ScrapItem.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return { 
        items, 
        total, 
        page, 
        limit, 
        totalPages,
        hasNextPage,
        hasPrevPage
    };
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
