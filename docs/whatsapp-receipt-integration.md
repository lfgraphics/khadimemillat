# Enhanced WhatsApp Service with Receipt Images

The WhatsApp service has been enhanced to support sending donation receipts with images automatically. This provides a more professional and visual confirmation for donors.

## Features

### 1. **Automatic Receipt Images**
- Donation confirmations now include receipt images
- 80G certificates are sent as separate image messages
- Fallback to text-only messages if image sending fails

### 2. **Message Types Supported**
- **Text messages**: Standard text notifications
- **Image messages**: Receipt images with captions
- **Document messages**: PDF attachments (future use)

### 3. **Provider Support**
- **AiSensy**: JWT-based API for Indian users
- **Meta WhatsApp Business API**: Global standard

## New Methods

### `sendDonationConfirmation(phone, donationData)`
Sends donation confirmation with receipt image using your approved "Donation Confirmation" template.

```typescript
await whatsappService.sendDonationConfirmation('+919876543210', {
  donationId: '507f1f77bcf86cd799439011',
  donorName: 'Ahmed Ali',
  amount: 5000,
  currency: 'INR',
  campaignName: 'Ramadan Food Drive',
  programName: 'Food Distribution',
  wants80G: true
})
```

### `sendDonationReceipt(phone, donationId, donorName, amount, campaignName?)`
Sends receipt image using your approved template.

```typescript
await whatsappService.sendDonationReceipt(
  '+919876543210',
  '507f1f77bcf86cd799439011',
  'Ahmed Ali',
  5000,
  'Ramadan Food Drive'
)
```

### `send80GCertificate(phone, donationId, donorName, amount, certificateNumber)`
Sends 80G certificate receipt image using your approved template.

```typescript
await whatsappService.send80GCertificate(
  '+919876543210',
  '507f1f77bcf86cd799439011',
  'Ahmed Ali',
  5000,
  'KMWF-80G-2024-001234'
)
```

**Note**: All methods use the same approved "Donation Confirmation" campaign template with image support. The message content is not customized to maintain template compliance.

## Integration Points

### 1. **Automatic Notifications**
The donation notification service (`donation-notification.service.ts`) automatically:
- Sends receipt images on successful donations
- Includes 80G certificates for eligible donations
- Falls back to text messages if image sending fails

### 2. **Manual Resending**
New utility functions for manual operations:

```typescript
// Resend receipt
import { resendDonationReceiptWhatsApp } from '@/lib/services/donation-notification.service'
await resendDonationReceiptWhatsApp(donationId, phoneNumber)

// Send 80G certificate
import { send80GCertificateWhatsApp } from '@/lib/services/donation-notification.service'
await send80GCertificateWhatsApp(donationId, phoneNumber)
```

### 3. **API Endpoint**
New API endpoint for admin/manual operations:

```
POST /api/whatsapp/send-receipt
{
  "donationId": "507f1f77bcf86cd799439011",
  "phoneNumber": "+919876543210",
  "type": "receipt" | "80g"
}

GET /api/whatsapp/send-receipt
// Returns WhatsApp service status and capabilities
```

## Message Templates

### Approved Template Usage
All WhatsApp messages use the pre-approved "Donation Confirmation" template:
- **Template**: Uses your approved AiSensy campaign
- **Message**: Simple approved message text
- **Image**: Receipt image attachment with donation details
- **Compliance**: Maintains template approval status
- **Consistency**: Same format for all donation types (regular/80G)

## Configuration

### Environment Variables
```env
# WhatsApp API Configuration
WHATSAPP_ACCESS_TOKEN=your_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here
WHATSAPP_API_URL=https://graph.facebook.com/v18.0  # For Meta API
# For AiSensy, use JWT token and it will auto-detect

# Application URL for receipt links
NEXT_PUBLIC_APP_URL=https://khadimemillat.org
```

### Provider Detection
The service automatically detects the provider:
- **AiSensy**: If token starts with 'eyJ' (JWT format)
- **Meta**: All other token formats

## Error Handling

### Graceful Fallbacks
1. If image sending fails → Send text-only message
2. If WhatsApp fails → Log error but continue with other notifications
3. If receipt generation fails → Send basic confirmation

### Logging
All WhatsApp operations are logged with detailed context:
- `[DONATION_WHATSAPP_WITH_IMAGE_SENT]` - Success with image
- `[DONATION_WHATSAPP_FALLBACK_SENT]` - Fallback text message
- `[80G_CERTIFICATE_WHATSAPP_SENT]` - 80G certificate sent
- `[RECEIPT_RESEND_WHATSAPP]` - Manual receipt resending

## Rate Limiting
- 2-second delay between multiple messages (receipt + 80G certificate)
- Bulk message processing with 1-second intervals
- Error handling for API rate limits

## Security Features
- Phone number validation and formatting
- Authentication required for manual API endpoints
- Input sanitization for all message content
- Proper error messages without sensitive data exposure

## Future Enhancements
1. **Delivery Status Tracking**: Track message delivery and read receipts
2. **Interactive Templates**: Buttons for actions (download, verify, etc.)
3. **Multilingual Support**: Messages in different languages
4. **Rich Media**: Video messages for special campaigns
5. **Automated Follow-ups**: Scheduled thank you and impact messages

## Testing
Use the API endpoint to test functionality:
```bash
curl -X POST /api/whatsapp/send-receipt \
  -H "Content-Type: application/json" \
  -d '{
    "donationId": "test_donation_id",
    "phoneNumber": "+919876543210",
    "type": "receipt"
  }'
```

The enhanced WhatsApp service significantly improves donor experience by providing immediate visual confirmation of their donations with professional receipt images.