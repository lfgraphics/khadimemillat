import { NextResponse, NextRequest } from "next/server";
import connectDB from "@/lib/db";
import OfflineDonation from "@/models/OfflineDonation";
import { auth } from "@clerk/nextjs/server"
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { whatsappService } from '@/lib/services/whatsapp.service';

export async function POST(req: NextRequest) {

    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {

        const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);

        const createdBy = clerkUser.publicMetadata?.role as string;


        const body = await req.json();
        const { donorName, donorNumber, amount, notes, receivedAt, programSlug, collectedBy } = body;

        if (!donorName || !amount || !receivedAt) {
            return NextResponse.json(
                { error: "Fill all required fields." },
                { status: 400 }
            );
        }

        await connectDB();

        // Fetch program details if programSlug provided
        let programId = null;
        let campaignId = null;
        let programName = 'General Donation';
        let campaignName = 'Cash Donation';

        if (programSlug) {
            try {
                const WelfareProgram = (await import('@/models/WelfareProgram')).default;
                const Campaign = (await import('@/models/Campaign')).default;

                // Try to find as campaign first
                const campaign = await Campaign.findOne({ slug: programSlug }).select('_id name title programId').lean();
                if (campaign) {
                    campaignId = (campaign as any)._id;
                    campaignName = (campaign as any).name || (campaign as any).title || campaignName;

                    // Get associated program
                    if ((campaign as any).programId) {
                        const program = await WelfareProgram.findById((campaign as any).programId).select('_id title name').lean();
                        if (program) {
                            programId = (program as any)._id;
                            programName = (program as any).title || (program as any).name || programName;
                        }
                    }
                } else {
                    // Try as program slug
                    const program = await WelfareProgram.findOne({ slug: programSlug }).select('_id title name').lean();
                    if (program) {
                        programId = (program as any)._id;
                        programName = (program as any).title || (program as any).name || programName;
                        campaignName = programName; // Use program name as campaign name
                    }
                }
            } catch (err) {
                console.warn('[PROGRAM_LOOKUP_FAILED]', err);
            }
        }

        const donation = await OfflineDonation.create({
            createdBy,
            donorName,
            donorNumber,
            amount,
            notes: notes || "",
            programId,
            campaignId,
            programName,
            campaignName,
            receivedAt: new Date(receivedAt),
            collectedBy: {
                userId: collectedBy.userId,
                name: collectedBy.name,
            }
        });

        // Send WhatsApp notification if phone number is provided
        if (donorNumber && donorNumber.trim()) {
            try {
                console.log(`[OFFLINE_DONATION_WHATSAPP] Sending notification to ${donorNumber}`);

                const whatsappResult = await whatsappService.sendDonationConfirmation(
                    whatsappService.formatPhoneNumber(donorNumber).replace(/[^\d]/g, ''),
                    {
                        donationId: donation._id.toString(),
                        donorName: donorName,
                        amount: amount,
                        currency: 'INR',
                        campaignName: donation.campaignName || 'Cash Donation',
                        programName: donation.programName || 'Offline Cash Donation',
                        wants80G: false,
                        razorpayPaymentId: donation._id.toString().slice(-8) // Use donation ID as receipt number
                    }
                );

                if (whatsappResult.success) {
                    console.log(`[OFFLINE_DONATION_WHATSAPP_SENT] ${donorNumber} - ${donation._id}`);
                } else {
                    console.error(`[OFFLINE_DONATION_WHATSAPP_FAILED] ${donorNumber} - ${donation._id} - Error: ${whatsappResult.error}`);
                }
            } catch (whatsappError) {
                // Log error but don't fail the donation submission
                console.error('[OFFLINE_DONATION_WHATSAPP_ERROR]', whatsappError);
            }
        }

        return NextResponse.json({
            success: true,
            donation: {
                _id: donation._id,
                donorName: donation.donorName,
                amount: donation.amount,
                receivedAt: donation.receivedAt
            }
        }, { status: 201 });
    } catch (err) {
        console.log("API Error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
