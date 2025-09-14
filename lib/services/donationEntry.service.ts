import connectDB from "../db";
import DonationEntry from "@/models/DonationEntry";
import { Types } from "mongoose";

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

export async function listDonationEntries({ page = 1, limit = 20, donorId }: any = {}) {
    await connectDB();
    const skip = (page - 1) * limit;
    const query: any = {};
    if (donorId) query.donor = donorId;
    const [entries, total] = await Promise.all([
        DonationEntry.find(query).skip(skip).limit(limit).lean(),
        DonationEntry.countDocuments(query)
    ]);
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
