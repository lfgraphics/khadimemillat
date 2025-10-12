# 80G Certificate Management System

## Overview
Enhanced 80G certificate number generation and tracking system for Khadim-e-Millat Welfare Foundation, implementing best practices for compliance and audit requirements.

## Certificate Number Format
**Format:** `KMWF-80G-{Financial Year}-{6-digit sequence}`
**Example:** `KMWF-80G-2024-25-000123`

### Components:
- **KMWF-80G**: Organization prefix for Khadim-e-Millat 80G certificates
- **2024-25**: Financial Year (April 1, 2024 to March 31, 2025)
- **000123**: Sequential 6-digit number (zero-padded)

## Key Features

### 1. Sequential Certificate Generation
- **Atomic Counters**: Uses MongoDB `findOneAndUpdate` with `$inc` for thread-safe sequence generation
- **Per-Financial Year**: Separate sequence counters for each FY
- **Zero-Padding**: 6-digit sequences (000001, 000002, etc.)
- **Fallback System**: If counter fails, uses donation ID + timestamp

### 2. Enhanced Database Tracking
```typescript
certificate80G: {
  generated: boolean
  generatedAt: Date
  certificateNumber: string (indexed)
  financialYear: string (indexed)
  sequenceNumber: number
  issuedBy: string
  status: 'generated' | 'sent' | 'resent' | 'cancelled'
  deliveryMethods: [{
    method: 'email' | 'sms' | 'download'
    sentAt: Date
    status: 'success' | 'failed' | 'pending'
  }]
  formFilingStatus: {
    form10BD: {
      filed: boolean
      filedAt: Date
      acknowledgmentNumber: string
    }
  }
}
```

### 3. Validation & Verification
- **Certificate Number Validation**: Regex pattern matching
- **PAN Validation**: Standard PAN format checking
- **Complete Address Verification**: Required for 80G compliance
- **Financial Year Extraction**: Parse FY from certificate numbers
- **Sequence Number Extraction**: Parse sequence from certificate numbers

## API Endpoints

### Certificate Validation
```
GET /api/certificates/validate?number=KMWF-80G-2024-25-000123
```
Validates certificate and returns donation details.

### Certificate Statistics
```
GET /api/admin/certificates/stats?fy=2024-25
```
Returns statistics for a financial year including:
- Total certificates issued
- Current sequence number
- Generation rate
- Last issued date

## Usage Examples

### Generate Certificate
```typescript
import { receipt80GService } from '@/lib/services/receipt-80g.service'

// Process 80G certificate for a donation
const result = await receipt80GService.process80GCertificate(donationData)
console.log(result.certificateNumber) // KMWF-80G-2024-25-000123
```

### Validate Certificate
```typescript
// Check format
const isValid = receipt80GService.isValidCertificateNumber('KMWF-80G-2024-25-000123')

// Extract components
const fy = receipt80GService.extractFinancialYearFromCertificate('KMWF-80G-2024-25-000123')
const sequence = receipt80GService.extractSequenceFromCertificate('KMWF-80G-2024-25-000123')
```

### Get Statistics
```typescript
const stats = await receipt80GService.getCertificateStats('2024-25')
console.log(stats.totalIssued) // Number of certificates issued this FY
```

## Financial Year Logic
- **FY Start**: April 1st
- **FY End**: March 31st
- **Format**: YYYY-YY (e.g., 2024-25)
- **Auto-detection**: Based on donation date

## Compliance Features

### Receipt Enhancement
- **Clear Certificate Display**: Shows certificate number prominently
- **Format Explanation**: Explains numbering system to donors
- **Organization Details**: Complete 80G registration information
- **Verification Instructions**: How to validate certificates

### Audit Trail
- **Sequential Numbering**: No gaps in certificate sequences
- **Timestamping**: All generation and delivery events tracked
- **Status Tracking**: Generated, sent, resent, cancelled statuses
- **Delivery Confirmation**: Email, SMS, download tracking

### Form 10BD Preparation
- **Financial Year Grouping**: Easy export by FY
- **Complete Records**: All required fields captured
- **Status Tracking**: Track Form 10BD filing status
- **Acknowledgment Storage**: Store ITD acknowledgment numbers

## Database Models

### ReceiptCounter
```typescript
{
  financialYear: string (indexed, unique)
  sequence: number
  prefix: string
  lastUsed: Date
  createdAt: Date
  updatedAt: Date
}
```

### CampaignDonation (Enhanced)
- Added `certificate80G.sequenceNumber`
- Added `certificate80G.issuedBy`
- Added `certificate80G.status`
- Added `certificate80G.deliveryMethods[]`
- Added `certificate80G.formFilingStatus`

## Best Practices

### For Administrators
1. **Regular Monitoring**: Check certificate statistics monthly
2. **Backup Counters**: Export ReceiptCounter collection regularly
3. **Form 10BD Filing**: Use certificate stats for annual filing
4. **Validation**: Periodically validate certificate sequences

### For Developers
1. **Error Handling**: Always use try-catch for certificate generation
2. **Atomic Operations**: Use MongoDB transactions for critical operations
3. **Logging**: Log all certificate generation events
4. **Testing**: Test with multiple concurrent donations

## Migration Notes
- Existing certificates retain their original numbers
- New format applies to certificates generated after system update
- Legacy certificate validation available via separate methods
- No impact on existing donations or receipts

## Security Considerations
- Certificate numbers are not cryptographically secure
- Validation API has no authentication (public verification)
- Sequential numbers may reveal donation volume
- Consider rate limiting on validation endpoint

---

**Last Updated:** October 2025  
**Version:** 2.0  
**Compliance:** Income Tax Act, 1961 - Section 80G