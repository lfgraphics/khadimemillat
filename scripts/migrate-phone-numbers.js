// Migration script to normalize phone numbers in existing donations
// Run this once to fix existing data in the database

import { normalizePhoneNumber } from '../lib/utils/phone.ts'

async function migratePhoneNumbers() {
    console.log('🔄 Starting phone number migration...')

    try {
        // Import models dynamically to avoid issues
        const connectDB = (await import('../lib/db.js')).default
        const CampaignDonation = (await import('../models/CampaignDonation.js')).default
        const User = (await import('../models/User.js')).default

        await connectDB()

        // Migrate CampaignDonation phone numbers
        console.log('📋 Migrating donation phone numbers...')
        const donations = await CampaignDonation.find({
            donorPhone: { $exists: true, $ne: null, $ne: '' }
        }).select('_id donorPhone')

        let donationUpdates = 0
        for (const donation of donations) {
            const originalPhone = donation.donorPhone
            const normalizedPhone = normalizePhoneNumber(originalPhone)

            if (originalPhone !== normalizedPhone) {
                await CampaignDonation.updateOne(
                    { _id: donation._id },
                    { $set: { donorPhone: normalizedPhone } }
                )
                donationUpdates++
                console.log(`  ✅ Updated donation ${donation._id}: "${originalPhone}" → "${normalizedPhone}"`)
            }
        }

        // Migrate User phone numbers
        console.log('👥 Migrating user phone numbers...')
        const users = await User.find({
            phone: { $exists: true, $ne: null, $ne: '' }
        }).select('_id phone')

        let userUpdates = 0
        for (const user of users) {
            const originalPhone = user.phone
            const normalizedPhone = normalizePhoneNumber(originalPhone)

            if (originalPhone !== normalizedPhone) {
                await User.updateOne(
                    { _id: user._id },
                    { $set: { phone: normalizedPhone } }
                )
                userUpdates++
                console.log(`  ✅ Updated user ${user._id}: "${originalPhone}" → "${normalizedPhone}"`)
            }
        }

        console.log(`\n✅ Migration completed!`)
        console.log(`📋 Donations updated: ${donationUpdates}/${donations.length}`)
        console.log(`👥 Users updated: ${userUpdates}/${users.length}`)
        console.log(`\n🎉 All phone numbers are now normalized for consistent WhatsApp delivery!`)

    } catch (error) {
        console.error('❌ Migration failed:', error)
        process.exit(1)
    }
}

// Run the migration
migratePhoneNumbers().then(() => {
    console.log('🏁 Migration script completed')
    process.exit(0)
}).catch(error => {
    console.error('💥 Migration script failed:', error)
    process.exit(1)
})