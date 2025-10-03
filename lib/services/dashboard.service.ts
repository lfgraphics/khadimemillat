import connectDB from "../db";
import DonationEntry from "@/models/DonationEntry";
import ScrapItem from "@/models/ScrapItem";
import { DashboardStats } from "@/types/dashboard";

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    await connectDB();

    try {
        // Get donation statistics
        const totalDonations = await DonationEntry.countDocuments();

        // Get item statistics using aggregation for better performance
        const itemStats = await ScrapItem.aggregate([
            {
                $group: {
                    _id: null,
                    totalItems: { $sum: 1 },
                    listedItems: {
                        $sum: {
                            $cond: [
                                { $and: ["$marketplaceListing.listed", { $not: "$marketplaceListing.sold" }] },
                                1,
                                0
                            ]
                        }
                    },
                    soldItems: {
                        $sum: {
                            $cond: ["$marketplaceListing.sold", 1, 0]
                        }
                    },
                    itemsWithoutPrice: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: ["$marketplaceListing.demandedPrice", null] },
                                        { $eq: ["$marketplaceListing.demandedPrice", undefined] },
                                        { $lte: ["$marketplaceListing.demandedPrice", 0] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                "$marketplaceListing.sold",
                                { $ifNull: ["$marketplaceListing.salePrice", 0] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const stats = itemStats[0] || {
            totalItems: 0,
            listedItems: 0,
            soldItems: 0,
            itemsWithoutPrice: 0,
            totalRevenue: 0
        };

        // Calculate pending items (items that can't be listed due to validation issues)
        const pendingItems = await ScrapItem.countDocuments({
            $or: [
                { "marketplaceListing.demandedPrice": { $exists: false } },
                { "marketplaceListing.demandedPrice": null },
                { "marketplaceListing.demandedPrice": { $lte: 0 } },
                { 
                    $and: [
                        { "marketplaceListing.listed": false },
                        { "marketplaceListing.sold": false },
                        { "marketplaceListing.demandedPrice": { $gt: 0 } }
                    ]
                }
            ]
        });

        return {
            totalDonations,
            pendingItems,
            listedItems: stats.listedItems,
            soldItems: stats.soldItems,
            itemsWithoutPrice: stats.itemsWithoutPrice,
            totalRevenue: stats.totalRevenue
        };

    } catch (error) {
        console.error('Error calculating dashboard stats:', error);
        
        // Return default stats on error
        return {
            totalDonations: 0,
            pendingItems: 0,
            listedItems: 0,
            soldItems: 0,
            itemsWithoutPrice: 0,
            totalRevenue: 0
        };
    }
}

/**
 * Get dashboard statistics with error handling and fallback values
 */
export async function getDashboardStatsWithFallback(): Promise<DashboardStats> {
    try {
        return await getDashboardStats();
    } catch (error) {
        console.error('Failed to get dashboard stats, using fallback:', error);
        
        // Return safe fallback values
        return {
            totalDonations: 0,
            pendingItems: 0,
            listedItems: 0,
            soldItems: 0,
            itemsWithoutPrice: 0,
            totalRevenue: 0
        };
    }
}