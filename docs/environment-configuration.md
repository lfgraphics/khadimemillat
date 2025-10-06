# Environment Configuration Guide

This document provides detailed information about all environment variables required for the Khadim-e-Millat Welfare Foundation application.

## Quick Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Fill in the required values (see sections below)

3. Run configuration validation:
```bash
npm run deploy:check
```

## Required Environment Variables

### Authentication (Clerk)

The application uses Clerk for user authentication and management.

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

**Setup Instructions:**
1. Create account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy the publishable key and secret key from the dashboard
4. Configure redirect URLs to match your domain

### Database (MongoDB)

```env
MONGODB_URI=mongodb://localhost:27017/khadimemillat
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/khadimemillat
```

**Setup Instructions:**
1. Install MongoDB locally OR create MongoDB Atlas account
2. Create database named `khadimemillat` (or your preferred name)
3. For Atlas: Get connection string from cluster dashboard
4. For local: Use default connection string with your database name

### Image Storage (Cloudinary)

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

**Setup Instructions:**
1. Create account at [cloudinary.com](https://cloudinary.com)
2. Get credentials from dashboard
3. Set up upload presets if needed for specific image transformations

### Web Push Notifications (Required)

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

**Setup Instructions:**
1. Generate VAPID keys using web-push library:
```bash
npx web-push generate-vapid-keys
```
2. Copy the generated public and private keys
3. Public key will be visible to browsers, private key must be kept secret

### Email Service (Required)

```env
RESEND_API_KEY=re_your_resend_api_key
NOTIFICATION_EMAIL=notifications@yourdomain.com
NOTIFICATION_FROM_NAME=Your Organization Name
```

**Setup Instructions:**
1. Create account at [resend.com](https://resend.com)
2. Verify your domain for sending emails
3. Generate API key from dashboard
4. Set notification email to a verified address
5. Choose appropriate sender name for your organization

### Application Configuration

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
# For production:
# NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

**Setup Instructions:**
1. For development: Use `http://localhost:3000`
2. For production: Use your actual domain with HTTPS
3. This URL is used for generating links in notifications and emails

## Optional Environment Variables

### WhatsApp Business API

```env
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

**Setup Instructions:**
1. Create Meta Business account
2. Set up WhatsApp Business API
3. Get access token and phone number ID from Meta Developer Console
4. Configure webhook URL for receiving message status updates

**Impact if not configured:**
- WhatsApp notifications will be disabled
- Users will receive notifications through other channels only
- Application will log warnings but continue to function

### SMS Service

```env
SMS_ENABLED=false
SMS_API_URL=https://api.your-sms-provider.com/send
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=KMWF
```

**Setup Instructions:**
1. Choose SMS provider (Twilio, AWS SNS, etc.)
2. Get API credentials from provider
3. Set `SMS_ENABLED=true` to activate
4. Configure sender ID (usually 3-6 characters)

**Impact if not configured:**
- SMS notifications will be disabled
- Users will receive notifications through other channels only
- Application will log warnings but continue to function

## Environment-Specific Configurations

### Development Environment

```env
# Use local services for development
MONGODB_URI=mongodb://localhost:27017/khadimemillat_dev
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Use test/sandbox credentials
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_test_...

# Optional: Use test credentials for external services
WHATSAPP_ACCESS_TOKEN=test_token
SMS_ENABLED=false
```

### Production Environment

```env
# Use production database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/khadimemillat

# Use production domain
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Use production credentials
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_live_...

# Configure all notification services
WHATSAPP_ACCESS_TOKEN=live_token
SMS_ENABLED=true
SMS_API_KEY=live_sms_key
```

### Staging Environment

```env
# Use staging database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/khadimemillat_staging

# Use staging domain
NEXT_PUBLIC_BASE_URL=https://staging.yourdomain.com

# Use test credentials but production-like setup
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_test_...

# Test external services with sandbox credentials
WHATSAPP_ACCESS_TOKEN=sandbox_token
SMS_ENABLED=true
SMS_API_KEY=test_sms_key
```

## Validation and Troubleshooting

### Configuration Validation

Run the deployment check to validate your configuration:

```bash
npm run deploy:check
```

This will check:
- All required environment variables are set
- Notification services are properly configured
- Database connection string format
- Security configuration (HTTPS, VAPID keys)

### Common Issues

#### 1. MongoDB Connection Issues
```
Error: MongooseError: The `uri` parameter to `openUri()` must be a string
```
**Solution:** Ensure MONGODB_URI is set and properly formatted

#### 2. Clerk Authentication Issues
```
Error: Clerk publishable key not found
```
**Solution:** Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set and starts with `pk_`

#### 3. Notification Service Issues
```
Warning: Email service not configured
```
**Solution:** Set RESEND_API_KEY and verify your domain in Resend dashboard

#### 4. VAPID Key Issues
```
Error: VAPID keys are required for web push
```
**Solution:** Generate new VAPID keys using `npx web-push generate-vapid-keys`

### Startup Validation

The application automatically validates configuration at startup and will:
- Log configuration status for all services
- Continue operation with graceful degradation for optional services
- Provide detailed error messages for missing required configuration

### Testing Configuration

1. **Test notification sending:**
   - Go to `/admin/notifications` (admin role required)
   - Send test notification to yourself
   - Check all configured channels receive the notification

2. **Test database connection:**
   - Application should start without database errors
   - Check MongoDB logs for successful connections

3. **Test image uploads:**
   - Try uploading images in donation forms
   - Verify images appear correctly

## Security Considerations

### Production Security Checklist

- [ ] Use HTTPS for NEXT_PUBLIC_BASE_URL
- [ ] Keep CLERK_SECRET_KEY and other secrets secure
- [ ] Use environment-specific API keys (don't use test keys in production)
- [ ] Regularly rotate API keys and secrets
- [ ] Use MongoDB connection with authentication
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting for API endpoints
- [ ] Use secure headers (CSP, HSTS, etc.)

### Secret Management

For production deployments:
1. Use your platform's secret management (Vercel secrets, AWS Parameter Store, etc.)
2. Never commit secrets to version control
3. Use different secrets for different environments
4. Regularly audit and rotate secrets
5. Monitor for secret exposure in logs

## Migration and Deployment

### Database Setup

After configuring environment variables:

1. Run database migrations:
```bash
npm run migrate
```

2. Seed initial data (optional):
```bash
npm run seed:welfare
```

### Deployment Process

1. Set all environment variables in your deployment platform
2. Run deployment check: `npm run deploy:check`
3. Deploy application
4. Run post-deployment migrations if needed
5. Test all functionality in production environment

### Scheduled Jobs

The application includes optional analytics collection jobs:
- No jobs are scheduled automatically on startup
- Administrators must manually enable jobs through the admin interface
- Available jobs: daily analytics collection, weekly backfill, monthly cleanup
- Jobs can be run manually or scheduled to run automatically
- Access job management at `/admin/notifications` or via API at `/api/admin/scheduler`

### Monitoring

Set up monitoring for:
- Database connection health
- Notification service availability
- API response times
- Error rates
- User authentication issues
- Scheduled job execution (if enabled)

## Support

For configuration issues:
1. Check the deployment check output: `npm run deploy:check`
2. Review application logs for detailed error messages
3. Verify all services are properly configured in their respective dashboards
4. Test individual services outside the application if needed