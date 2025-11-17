import connectDB from '@/lib/db';
import Category from '@/models/Category';
import User from '@/models/User';

export async function seedCategories() {
  await connectDB();
  
  // Find an admin user to assign as creator
  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    throw new Error('No admin user found. Please create an admin user first.');
  }

  const sponsorshipCategories = [
    {
      name: 'Child Education Support',
      type: 'sponsorship',
      label: 'Child Education Support',
      description: 'Educational support for children under 18',
      color: 'blue',
      icon: 'GraduationCap',
      defaultMonthlyAmount: 2000,
      eligibilityRules: {
        maxAge: 18,
        conditions: ['student', 'school_age', 'minor']
      },
      sortOrder: 1
    },
    {
      name: 'Medical Support',
      type: 'sponsorship',
      label: 'Medical Support',
      description: 'Healthcare and medical treatment support',
      color: 'red',
      icon: 'Stethoscope',
      defaultMonthlyAmount: 3000,
      eligibilityRules: {
        healthStatuses: ['chronically_ill', 'disabled'],
        conditions: ['medical_needs', 'chronic_illness']
      },
      sortOrder: 2
    },
    {
      name: 'Elderly Care',
      type: 'sponsorship',
      label: 'Elderly Care',
      description: 'Support for elderly family members',
      color: 'purple',
      icon: 'Heart',
      defaultMonthlyAmount: 2500,
      eligibilityRules: {
        minAge: 60,
        conditions: ['elderly', 'senior']
      },
      sortOrder: 3
    },
    {
      name: 'Disability Support',
      type: 'sponsorship',
      label: 'Disability Support',
      description: 'Support for disabled family members',
      color: 'orange',
      icon: 'Shield',
      defaultMonthlyAmount: 3500,
      eligibilityRules: {
        healthStatuses: ['disabled'],
        conditions: ['has_disability', 'disabled']
      },
      sortOrder: 4
    },
    {
      name: 'Widow Support',
      type: 'sponsorship',
      label: 'Widow Support',
      description: 'Support for widowed mothers and wives',
      color: 'pink',
      icon: 'Users',
      defaultMonthlyAmount: 4000,
      eligibilityRules: {
        relationships: ['mother', 'wife'],
        maritalStatuses: ['widowed'],
        conditions: ['widowed']
      },
      sortOrder: 5
    },
    {
      name: 'Orphan Care',
      type: 'sponsorship',
      label: 'Orphan Care',
      description: 'Support for orphaned children',
      color: 'green',
      icon: 'Baby',
      defaultMonthlyAmount: 3000,
      eligibilityRules: {
        maxAge: 18,
        conditions: ['orphaned', 'minor']
      },
      sortOrder: 6
    },
    {
      name: 'Student Welfare',
      type: 'sponsorship',
      label: 'Student Welfare',
      description: 'Educational support for students above 18 years',
      color: 'indigo',
      icon: 'BookOpen',
      defaultMonthlyAmount: 2500,
      eligibilityRules: {
        minAge: 18,
        maxAge: 30,
        conditions: ['student', 'higher_education']
      },
      sortOrder: 7
    },
    {
      name: 'General Family Welfare',
      type: 'sponsorship',
      label: 'General Family Welfare',
      description: 'General support for family welfare',
      color: 'gray',
      icon: 'Home',
      defaultMonthlyAmount: 2000,
      eligibilityRules: {},
      sortOrder: 8
    }
  ];

  const surveyCategories = [
    {
      name: 'Category 1 - Severe Hardship',
      type: 'survey',
      label: 'Category 1 - Severe Hardship',
      description: 'Families in severe financial distress requiring immediate support',
      color: 'red',
      priority: 1,
      sortOrder: 1
    },
    {
      name: 'Category 2 - Moderate Support',
      type: 'survey',
      label: 'Category 2 - Moderate Support',
      description: 'Families needing moderate assistance and support',
      color: 'yellow',
      priority: 2,
      sortOrder: 2
    },
    {
      name: 'Category 3 - Emergency Only',
      type: 'survey',
      label: 'Category 3 - Emergency Only',
      description: 'Families eligible for emergency support only',
      color: 'green',
      priority: 3,
      sortOrder: 3
    }
  ];

  const allCategories = [...sponsorshipCategories, ...surveyCategories];

  for (const categoryData of allCategories) {
    const slug = categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const existingCategory = await Category.findOne({ slug });

    if (!existingCategory) {
      try {
        await Category.create({
          ...categoryData,
          slug, // Explicitly set the slug
          createdBy: adminUser._id,
          updatedBy: adminUser._id,
          active: true
        });
        console.log(`✅ Created category: ${categoryData.name} (slug: ${slug})`);
      } catch (error) {
        console.error(`❌ Failed to create category ${categoryData.name}:`, (error as Error).message);
        console.error('Full error:', error);
      }
    } else {
      console.log(`⏭️  Category already exists: ${categoryData.name} (slug: ${slug})`);
    }
  }

  console.log('Category seeding completed!');
}

// Run seeder if called directly
if (require.main === module) {
  seedCategories()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}