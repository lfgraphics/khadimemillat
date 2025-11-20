import connectDB from '@/lib/db'
import ExpenseCategory from '@/models/ExpenseCategory'
import User from '@/models/User'

export async function seedExpenseCategories() {
  await connectDB()
  
  // Find an admin user to assign as creator
  const adminUser = await User.findOne({ role: 'admin' })
  if (!adminUser) {
    throw new Error('No admin user found. Please create an admin user first.')
  }

  const expenseCategories = [
    {
      name: 'Office Supplies',
      description: 'Stationery, printing materials, and general office supplies'
    },
    {
      name: 'Utilities',
      description: 'Electricity, water, internet, and other utility bills'
    },
    {
      name: 'Transportation',
      description: 'Vehicle fuel, maintenance, and transportation costs'
    },
    {
      name: 'Program Expenses',
      description: 'Direct costs related to welfare programs and activities'
    },
    {
      name: 'Staff Expenses',
      description: 'Staff-related expenses including meals and travel'
    },
    {
      name: 'Equipment & Maintenance',
      description: 'Equipment purchases, repairs, and maintenance costs'
    },
    {
      name: 'Marketing & Communication',
      description: 'Promotional materials, advertising, and communication costs'
    },
    {
      name: 'Professional Services',
      description: 'Legal, accounting, and other professional service fees'
    },
    {
      name: 'Rent & Facilities',
      description: 'Office rent, facility maintenance, and related costs'
    },
    {
      name: 'Miscellaneous',
      description: 'Other expenses that do not fit into specific categories'
    }
  ]

  for (const categoryData of expenseCategories) {
    const existingCategory = await ExpenseCategory.findOne({ name: categoryData.name })

    if (!existingCategory) {
      try {
        await ExpenseCategory.create({
          ...categoryData,
          createdBy: adminUser.clerkUserId,
          isActive: true
        })
        console.log(`✅ Created expense category: ${categoryData.name}`)
      } catch (error) {
        console.error(`❌ Failed to create expense category ${categoryData.name}:`, (error as Error).message)
        console.error('Full error:', error)
      }
    } else {
      console.log(`⏭️  Expense category already exists: ${categoryData.name}`)
    }
  }

  console.log('Expense category seeding completed!')
}

// Run seeder if called directly
if (require.main === module) {
  seedExpenseCategories()
    .then(() => {
      console.log('Expense category seeding completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Expense category seeding failed:', error)
      process.exit(1)
    })
}