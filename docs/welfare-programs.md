# Welfare Programs System

A comprehensive welfare programs and campaigns management system for the Khadim-Millat Welfare Foundation.

## Overview

The welfare programs system allows the foundation to:
- Create and manage multiple welfare programs (Education, Healthcare, Emergency Relief, etc.)
- Launch campaigns under each program
- Accept donations for specific campaigns or general programs
- Track progress, supporters, and funds raised
- Display rich campaign content with markdown support

## Database Schema

### Collections

1. **WelfareProgram** - Main program categories
2. **Campaign** - Individual fundraising campaigns under programs
3. **CampaignDonation** - Donation records for campaigns

### Models

#### WelfareProgram
```typescript
{
  title: string              // "Education Support"
  description: string        // Program description
  coverImage: string         // Cloudinary URL
  icon: string              // Lucide icon name
  iconColor: string         // Hex color
  donationLink: string      // Link to program page
  isActive: boolean         // Program status
  totalRaised: number       // Calculated field
  totalCampaigns: number    // Calculated field
  totalSupporters: number   // Calculated field
  displayOrder: number      // Sort order
}
```

#### Campaign
```typescript
{
  programId: ObjectId       // Reference to WelfareProgram
  title: string            // Campaign title
  slug: string             // URL-friendly slug
  description: string      // Markdown content
  coverImage: string       // Cloudinary URL
  goal: number            // Fundraising goal
  raised: number          // Amount raised (calculated)
  supporters: ObjectId[]  // References to donations
  isActive: boolean       // Campaign status
  isFeatured: boolean     // Featured on program page
  startDate: Date         // Campaign start
  endDate?: Date          // Optional end date
  createdBy: string       // Clerk user ID
  lastUpdatedBy: string   // Clerk user ID
}
```

#### CampaignDonation
```typescript
{
  campaignId: ObjectId     // Reference to Campaign
  programId: ObjectId      // Reference to WelfareProgram
  donorId?: string        // Clerk user ID (optional for anonymous)
  donorName: string       // Display name
  donorEmail?: string     // Optional email
  amount: number          // Donation amount
  message?: string        // Optional message
  isAnonymous: boolean    // Hide from public lists
  paymentMethod: string   // 'online' | 'cash' | 'bank_transfer' | 'other'
  paymentReference?: string // Transaction ID
  status: string          // 'pending' | 'completed' | 'failed' | 'refunded'
  processedBy?: string    // Admin who processed
  processedAt?: Date      // Processing timestamp
}
```

## API Endpoints

### Welfare Programs
- `GET /api/welfare-programs` - List all programs
- `POST /api/welfare-programs` - Create new program (admin)
- `GET /api/welfare-programs/[id]/campaigns` - Get campaigns for program

### Campaigns
- `GET /api/campaigns/[slug]` - Get campaign details
- `GET /api/campaigns/[slug]/donations` - Get campaign donations
- `POST /api/campaigns/[slug]/donations` - Create donation

## Pages Structure

```
/welfare-programs                    # All programs listing
/welfare-programs/[id]              # Program detail with campaigns
/campaigns/[slug]                   # Individual campaign page
/admin/welfare-programs             # Admin management
```

## Features

### Frontend Features
- **Responsive Design** - Works on all devices
- **Animated Components** - Smooth animations using Framer Motion
- **Progress Tracking** - Visual progress bars for campaigns
- **Donation Forms** - Integrated donation forms with validation
- **Markdown Support** - Rich content for campaign descriptions
- **Image Optimization** - Next.js Image component with Cloudinary
- **Real-time Stats** - Live donation counters and progress

### Admin Features
- **Program Management** - Create, edit, delete programs
- **Campaign Management** - Manage campaigns under programs
- **Donation Tracking** - View all donations and process payments
- **Analytics** - Track performance metrics
- **Content Management** - Rich text editor for campaign descriptions

### User Experience
- **Search & Filter** - Find programs and campaigns easily
- **Social Sharing** - Share campaigns on social media
- **Donation History** - Users can view their donation history
- **Anonymous Donations** - Option to donate anonymously
- **Multiple Payment Methods** - Support various payment options

## Setup Instructions

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Seed Database**
   ```bash
   pnpm run seed:welfare
   ```

3. **Environment Variables**
   Ensure these are set in your `.env`:
   ```
   MONGODB_URI=your_mongodb_connection
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   ```

4. **Run Development Server**
   ```bash
   pnpm dev
   ```

## Usage Examples

### Creating a New Program
```typescript
const program = {
  title: "Clean Water Initiative",
  description: "Providing clean water access to rural communities",
  coverImage: "https://images.unsplash.com/photo-water.jpg",
  icon: "Droplets",
  iconColor: "#0EA5E9",
  displayOrder: 4
}
```

### Creating a Campaign
```typescript
const campaign = {
  programId: "program_id_here",
  title: "Village Water Wells Project",
  description: "# Clean Water for All\n\nBuilding wells in 10 villages...",
  goal: 500000,
  startDate: new Date(),
  endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
  isFeatured: true
}
```

### Making a Donation
```typescript
const donation = {
  donorName: "John Doe",
  donorEmail: "john@example.com",
  amount: 5000,
  message: "Great cause!",
  isAnonymous: false,
  paymentMethod: "online"
}
```

## Integration Points

### With Existing System
- **User Management** - Uses Clerk for authentication
- **Database** - Extends existing MongoDB setup
- **UI Components** - Uses existing shadcn/ui components
- **Navigation** - Integrated with app sidebar
- **Notifications** - Can trigger notifications for donations

### External Services
- **Cloudinary** - Image storage and optimization
- **Payment Gateway** - Ready for payment integration
- **Email Service** - Can send donation confirmations
- **Analytics** - Track campaign performance

## Future Enhancements

1. **Payment Integration** - Razorpay, Stripe, or other gateways
2. **Email Notifications** - Automated donor communications
3. **Social Media Integration** - Share campaigns automatically
4. **Recurring Donations** - Monthly/yearly donation options
5. **Volunteer Management** - Connect volunteers to campaigns
6. **Impact Reporting** - Detailed impact reports for donors
7. **Mobile App** - React Native app for better mobile experience

## Security Considerations

- **Input Validation** - All inputs validated with Zod schemas
- **Authentication** - Admin functions require proper roles
- **Data Sanitization** - Markdown content is sanitized
- **Rate Limiting** - API endpoints have rate limits
- **Audit Trail** - All changes are logged with user info

## Performance Optimizations

- **Database Indexing** - Proper indexes on frequently queried fields
- **Image Optimization** - Cloudinary transformations
- **Caching** - API responses cached appropriately
- **Lazy Loading** - Components loaded on demand
- **Bundle Optimization** - Code splitting for better performance