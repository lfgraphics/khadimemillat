import { emailService } from '@/lib/services/email.service'
import { whatsappService } from '@/lib/services/whatsapp.service'
import { smsService } from '@/lib/services/sms.service'
import { notificationService } from '@/lib/services/notification.service'
import User from '@/models/User'

// Function to send comprehensive thank you notifications for completed donations
export async function sendDonationThankYouNotifications(donation: any) {
    try {
        const donorName = donation.donorName || 'Anonymous Donor'
        const donorEmail = donation.donorEmail
        const amount = donation.amount || 0
        const currency = donation.currency || 'INR'
        const donationId = donation._id
        const paymentId = donation.razorpayPaymentId
        const createdAt = new Date(donation.createdAt)

        // Get campaign/program details if available
        let campaignName = 'General Fund'
        let programName = 'General Donation'

        try {
            if (donation.campaignId) {
                const Campaign = (await import('@/models/Campaign')).default
                const campaign = await Campaign.findById(donation.campaignId).select('name slug').lean()
                if (campaign) {
                    campaignName = (campaign as any).name || campaignName
                }
            }

            if (donation.programId) {
                const WelfareProgram = (await import('@/models/WelfareProgram')).default
                const program = await WelfareProgram.findById(donation.programId).select('name slug').lean()
                if (program) {
                    programName = (program as any).name || programName
                }
            }
        } catch (e) {
            console.warn('[CAMPAIGN_PROGRAM_LOOKUP_FAILED]', e)
        }

        // Find user details for additional contact info
        let userPhone = ''
        let userNotificationPrefs = { email: true, whatsapp: true, sms: false }

        try {
            const user = await User.findOne({ email: donorEmail }).select('phone notificationPreferences clerkUserId').lean()
            if (user) {
                userPhone = (user as any).phone || ''
                userNotificationPrefs = (user as any).notificationPreferences || userNotificationPrefs
            }
        } catch (e) {
            console.warn('[USER_LOOKUP_FOR_DONATION_FAILED]', e)
        }

        // Prepare thank you message content
        const receiptDate = createdAt.toLocaleDateString('en-IN')
        const receiptTime = createdAt.toLocaleTimeString('en-IN')

        const emailSubject = `🙏 Thank you for your donation - Receipt #${donationId.toString().slice(-8)}`

        // Send email notification if email provided
        if (donorEmail && userNotificationPrefs.email) {
            try {
                const emailHtml = emailService.generateDefaultBrandedEmail({
                    title: 'Thank You for Your Donation!',
                    greetingName: donorName,
                    message: `Your generous donation of <strong>${currency} ${amount}</strong> has been successfully received.<br/><br/>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2563eb; margin-bottom: 15px;">📋 Donation Receipt</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${currency} ${amount}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Program:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${programName}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Campaign:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${campaignName}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${receiptDate} at ${receiptTime}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Transaction ID:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${paymentId || donationId}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Receipt ID:</strong></td><td style="padding: 8px 0;">${donationId}</td></tr>
            </table>
          </div>
          
          <p style="color: #059669; font-weight: 600;">🌟 Your contribution makes a real difference in our community!</p>
          <p>May Allah bless you for your kindness and generosity.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
            <p><strong>📞 Contact Us:</strong> +91 80817 47259<br/>
            📧 Email: info@khadimemillat.org<br/>
            🌐 Website: www.khadimemillat.org</p>
          </div>`
                })

                await emailService.sendEmail({
                    to: donorEmail,
                    subject: emailSubject,
                    html: emailHtml
                })

                console.log(`[DONATION_EMAIL_SENT] ${donorEmail} - ${donationId}`)
            } catch (emailError) {
                console.error('[DONATION_EMAIL_FAILED]', emailError)
            }
        }

        // Send WhatsApp notification if phone available
        if (userPhone && userNotificationPrefs.whatsapp) {
            try {
                const whatsappMessage = `🙏 *Khadim-e-Millat Welfare Foundation*

*Donation Received Successfully!*

Dear ${donorName},

Thank you for your generous donation of *${currency} ${amount}*

📋 *Receipt Details:*
• Amount: ${currency} ${amount}
• Program: ${programName}
• Date: ${receiptDate}
• Receipt ID: ${donationId.toString().slice(-8)}

Your contribution makes a real difference. May Allah bless you!

🌐 www.khadimemillat.org`

                await whatsappService.sendMessage({
                    to: userPhone,
                    message: whatsappMessage
                })

                console.log(`[DONATION_WHATSAPP_SENT] ${userPhone} - ${donationId}`)
            } catch (whatsappError) {
                console.error('[DONATION_WHATSAPP_FAILED]', whatsappError)
            }
        }

        // Send SMS notification if enabled
        if (userPhone && userNotificationPrefs.sms) {
            try {
                const smsMessage = `Thank you ${donorName}! Your donation of ${currency} ${amount} to Khadim-e-Millat has been received. Receipt: ${donationId.toString().slice(-8)}. May Allah bless you!`

                await smsService.sendSMS({
                    to: userPhone,
                    message: smsMessage
                } as any)

                console.log(`[DONATION_SMS_SENT] ${userPhone} - ${donationId}`)
            } catch (smsError) {
                console.error('[DONATION_SMS_FAILED]', smsError)
            }
        }

        // Send in-app notification if user exists in system
        try {
            const user = await User.findOne({ email: donorEmail }).select('clerkUserId').lean()
            if (user && (user as any).clerkUserId) {
                await notificationService.notifyUsers([(user as any).clerkUserId], {
                    title: '🙏 Thank You for Your Donation!',
                    body: `Your donation of ${currency} ${amount} has been received successfully. Receipt ID: ${donationId.toString().slice(-8)}`,
                    url: `/donations/${donationId}`,
                    type: 'donation_success'
                })

                console.log(`[DONATION_IN_APP_SENT] ${(user as any).clerkUserId} - ${donationId}`)
            }
        } catch (notificationError) {
            console.error('[DONATION_IN_APP_FAILED]', notificationError)
        }

        console.log(`[DONATION_NOTIFICATIONS_COMPLETED] ${donationId} - Email: ${!!donorEmail}, Phone: ${!!userPhone}`)
    } catch (error) {
        console.error('[DONATION_NOTIFICATION_ERROR]', error)
        throw error
    }
}