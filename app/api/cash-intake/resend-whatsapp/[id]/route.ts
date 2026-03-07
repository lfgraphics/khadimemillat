import { NextResponse, NextRequest } from "next/server";
import connectDB from "@/lib/db";
import OfflineDonation from "@/models/OfflineDonation";
import { auth } from "@clerk/nextjs/server";
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import { whatsappService } from '@/lib/services/whatsapp.service';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: "Donation ID is required" },
                { status: 400 }
            );
        }

        await connectDB();

        const donation = await OfflineDonation.findById(id);

        if (!donation) {
            return NextResponse.json(
                { error: "Donation not found" },
                { status: 404 }
            );
        }

        if (!donation.donorNumber) {
            return NextResponse.json(
                { error: "Donor phone number is missing" },
                { status: 400 }
            );
        }

        console.log(`[OFFLINE_DONATION_WHATSAPP_RESEND] Resending notification to ${donation.donorNumber}`);

        const whatsappResult = await whatsappService.sendDonationConfirmation(
            whatsappService.formatPhoneNumber(donation.donorNumber).replace(/[^\d]/g, ''),
            {
                donationId: donation._id.toString(),
                donorName: donation.donorName,
                amount: donation.amount,
                currency: 'INR',
                campaignName: donation.campaignName || 'Cash Donation',
                programName: donation.programName || 'Offline Cash Donation',
                wants80G: false,
                razorpayPaymentId: donation._id.toString().slice(-8) // Use donation ID as receipt number
            }
        );

        if (whatsappResult.success) {
            console.log(`[OFFLINE_DONATION_WHATSAPP_RESENT] ${donation.donorNumber} - ${donation._id}`);
            return NextResponse.json({ success: true, message: "WhatsApp notification sent successfully" });
        } else {
            console.error(`[OFFLINE_DONATION_WHATSAPP_RESEND_FAILED] ${donation.donorNumber} - ${donation._id} - Error: ${whatsappResult.error}`);
            return NextResponse.json({ error: `Failed to send WhatsApp: ${whatsappResult.error}` }, { status: 500 });
        }

    } catch (err) {
        console.error("API Error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
