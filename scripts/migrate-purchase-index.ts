import connectDB from '@/lib/db'
import Purchase from '@/models/Purchase'

async function run() {
  await connectDB()
  try {
    // Drop legacy unique index on scrapItemId if it exists
    await Purchase.collection.dropIndex('scrapItemId_1').catch(() => {})
    // Ensure current indexes are in place (including partial unique on pending)
    await Purchase.syncIndexes()
    console.log('Purchase indexes migrated successfully')
  } catch (e) {
    console.error('Failed to migrate Purchase indexes', e)
    process.exitCode = 1
  } finally {
    // eslint-disable-next-line no-process-exit
    process.exit()
  }
}

run()
