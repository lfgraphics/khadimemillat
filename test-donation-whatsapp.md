# Donation WhatsApp Template Issue - Debugging Guide

## Issue Summary
- **80G donations**: Working fine ✅
- **Non-80G donations**: WhatsApp message failing with template mismatch ❌

## Root Cause Analysis

### Template Parameters Structure
Both 80G and non-80G donations use the same template with 10 parameters:
1. `{{1}}` - Donor Name
2. `{{2}}` - Currency Symbol (₹)
3. `{{3}}` - Amount
4. `{{4}}` - Currency Symbol (₹)
5. `{{5}}` - Amount (repeated)
6. `{{6}}` - Program/Campaign Name
7. `{{7}}` - Date
8. `{{8}}` - Receipt ID
9. `{{9}}` - Transaction ID (Razorpay Payment ID)
10. `{{10}}` - Thank You Page URL

### Potential Issues Fixed

1. **Parameter Sanitization**: Added validation to ensure all parameters are non-empty strings
2. **Fallback Values**: Added default values for missing parameters
3. **Enhanced Error Handling**: Better logging and error messages for template mismatches
4. **Fallback Messaging**: Enhanced fallback text messages with 80G information when applicable
5. **Campaign Selection**: Different campaigns for image vs text messages

### Changes Made

#### 1. WhatsApp Service (`lib/services/whatsapp.service.ts`)
- Added parameter sanitization and validation
- Enhanced error logging with template parameter details
- Added fallback campaign selection
- Better template parameter count validation

#### 2. Donation Form (`components/DonationForm.tsx`)
- Added receipt delivery options (email, WhatsApp/SMS, Razorpay)
- Fixed unused state variable warnings
- Better user experience for receipt preferences

#### 3. Donation Notification Service (`lib/services/donation-notification.service.ts`)
- Enhanced fallback message with 80G information
- Better error handling and logging
- Improved debugging information

## Testing Steps

### Test Non-80G Donation
1. Go to donation form
2. Enter amount (e.g., ₹1000)
3. Fill donor details
4. **DO NOT** check "I want 80G tax exemption certificate"
5. Select receipt delivery options
6. Submit donation
7. Complete payment
8. Check WhatsApp message delivery

### Test 80G Donation
1. Go to donation form
2. Enter amount (e.g., ₹2000)
3. Fill donor details
4. **CHECK** "I want 80G tax exemption certificate"
5. Fill PAN and address details
6. Submit donation
7. Complete payment
8. Check WhatsApp message delivery

## Expected Behavior

### Both donation types should:
1. Send WhatsApp message with receipt image
2. Include proper template parameters
3. Fall back to text message if image fails
4. Include 80G information in fallback for 80G donations

## Debugging Information

Check logs for:
- `[DONATION_WHATSAPP_WITH_IMAGE_SENT]` - Success
- `[DONATION_WHATSAPP_WITH_IMAGE_FAILED]` - Template failure
- `[DONATION_WHATSAPP_FALLBACK_SENT]` - Fallback success
- `⚠️ Template parameter count mismatch` - Parameter validation warnings
- `⚠️ Empty template parameter` - Missing parameter warnings

## AiSensy Template Requirements

Ensure your AiSensy dashboard has:
1. **"Donation Confirmation"** campaign - For image messages with 10 parameters
2. **"api_text_campaign"** campaign - For simple text messages
3. Both campaigns should be **Live** and **Approved**
4. Template should expect exactly 10 parameters in the specified order

## Next Steps

If issues persist:
1. Check AiSensy dashboard for campaign status
2. Verify template parameter count matches exactly
3. Test with simple text messages first
4. Check API key permissions and validity