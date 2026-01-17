# Khadim-e-Millat Welfare Foundation

A community welfare platform facilitating sustainable scrap collection and redistribution to support welfare programs. Established in 2021 in Gorakhpur, Uttar Pradesh.

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- pnpm package manager

### Installation

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables (see [Environment Configuration](#environment-configuration))
4. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

### Required Variables

#### Authentication (Clerk)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

#### Database
```env
MONGODB_URI=mongodb://localhost:27017/your_database_name
```

#### Image Storage (Cloudinary)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

#### Web Push Notifications (Required)
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

#### Email Service (Required - Resend)
```env
RESEND_API_KEY=your_resend_api_key
NOTIFICATION_EMAIL=notifications@yourdomain.com
NOTIFICATION_FROM_NAME=Your Organization Name
```

#### Application URL
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Optional Notification Services

#### WhatsApp Business API (Optional)
```env
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

#### SMS Service (Optional)
```env
SMS_ENABLED=false
SMS_API_URL=your_sms_api_url
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=YOUR_SENDER_ID
```

### Service Configuration Notes

- **Email and Web Push**: Required for core notification functionality
- **WhatsApp and SMS**: Optional services that enhance notification reach
- **Missing optional services**: Will log warnings but won't prevent app startup
- **Missing required services**: Will log errors and may affect functionality

The application includes automatic configuration validation at startup that will:
- Check all required environment variables
- Validate service connectivity where possible
- Log detailed status information for troubleshooting
- Continue operation with graceful degradation for optional services

### Scheduled Jobs

The application includes analytics collection jobs that can be scheduled by administrators:
- **Daily Analytics Collection**: Collects notification statistics for the previous day
- **Weekly Analytics Backfill**: Backfills missing analytics data for the past 7 days  
- **Monthly Analytics Cleanup**: Removes analytics data older than 365 days

**Important**: No jobs are scheduled automatically. Administrators must manually enable jobs through the admin interface at `/admin/notifications` or via the scheduler API.

### Logging Configuration

Control application logging with these environment variables:

```env
# Show detailed configuration logs (startup validation)
LOG_CONFIG=true

# Control general log verbosity
LOG_LEVEL=info          # Options: debug, info, warn, error
VERBOSE_LOGS=true       # Enable detailed service logs

# For production, use minimal logging:
LOG_LEVEL=error
VERBOSE_LOGS=false
```

## Development

### Available Scripts

```bash
pnpm dev              # Start development server with Turbopack
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript compiler check
```

### Project Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - Reusable React components
- `/lib` - Utility functions and service configurations
- `/models` - MongoDB/Mongoose data models
- `/types` - TypeScript type definitions
- `/hooks` - Custom React hooks
- `/contexts` - React context providers

## Deployment

### Environment Setup for Production

1. Set all required environment variables in your deployment platform
2. Ensure MongoDB connection string is configured for production
3. Configure Cloudinary for image storage
4. Set up notification services (email, web push, optionally WhatsApp/SMS)
5. Update `NEXT_PUBLIC_BASE_URL` to your production domain

### Database Migrations

The application includes automatic database model initialization. For new deployments:

1. Ensure MongoDB connection is established
2. The application will automatically create required collections and indexes
3. Run any migration scripts in `/scripts` if needed for data updates

### Notification Service Setup

1. **Email (Resend)**: Sign up at resend.com and get API key
2. **Web Push**: Generate VAPID keys using web-push library
3. **WhatsApp Business**: Set up Meta Business account and get API credentials
4. **SMS**: Configure with your preferred SMS provider

### Email Templates and Sending Rules

- When sending notifications via email without a selected template, the system now uses a default branded HTML template that includes the site icon, organization name, and a friendly greeting using the recipient's name when available.
- Emails to any address containing the domain `khadimemillat.org` are automatically excluded from broadcast sends to avoid internal noise. These are recorded in the notification log as excluded.
- Configure the branding via environment variables:
	- `NEXT_PUBLIC_BASE_URL` to build absolute URLs for the icon
	- `NOTIFICATION_FROM_NAME` and `NOTIFICATION_EMAIL` to control the From header

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Clerk Authentication](https://clerk.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
