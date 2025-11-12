import mongoose, { Schema, Document } from "mongoose"

export interface ICampaignDonation extends Document {
    campaignId?: mongoose.Types.ObjectId
    programId: mongoose.Types.ObjectId
    donorId?: string // Clerk user ID (optional for logged out users)
    donorName: string // Display name for the donation
    donorEmail: string // Required email for all donations
    donorPhone?: string // Phone number for logged out users
    donorAddress?: string // Address for 80G certificate
    donorCity?: string // City for 80G certificate
    donorState?: string // State for 80G certificate
    donorPincode?: string // Pincode for 80G certificate
    amount: number
    message?: string // Optional message from donor
    paymentMethod: 'online' | 'cash' | 'bank_transfer' | 'other'
    paymentReference?: string // Transaction ID or reference
    status: 'pending' | 'completed' | 'failed' | 'refunded'
    processedBy?: string // Clerk user ID of admin who processed
    processedAt?: Date
    // Razorpay tracking fields
    razorpayOrderId?: string
    razorpayPaymentId?: string
    razorpaySignature?: string
    paymentVerified?: boolean
    paymentVerifiedAt?: Date
    // Receipt and 80G preferences
    wants80GReceipt?: boolean // Whether donor wants 80G tax exemption receipt
    donorPAN?: string // PAN number (required for 80G receipt)
    receiptPreferences?: {
        email?: boolean // Allow receipt via email
        sms?: boolean // Allow receipt via SMS
        razorpayManaged?: boolean // Let Razorpay handle receipt generation
    }
    // 80G Certificate tracking
    certificate80G?: {
        generated?: boolean
        generatedAt?: Date
        certificateNumber?: string
        financialYear?: string
        sequenceNumber?: number
        issuedBy?: string
        status?: 'generated' | 'sent' | 'resent' | 'cancelled'
        deliveryMethods?: Array<{
            method: 'email' | 'sms' | 'download'
            sentAt: Date
            status: 'success' | 'failed' | 'pending'
        }>
        formFilingStatus?: {
            form10BD?: {
                filed?: boolean
                filedAt?: Date
                acknowledgmentNumber?: string
            }
        }
    }
    // Notification tracking
    notificationsSent?: boolean
    notificationsSentAt?: Date
    // Audit and visibility controls
    auditStatus?: 'pending' | 'verified' | 'rejected' | 'under_review'
    isVisibleInReports?: boolean
    isVisibleInPublic?: boolean
    // Audit trail
    auditLog?: Array<{
        action: 'created' | 'payment_verified' | 'audit_approved' | 'audit_rejected' | 'visibility_changed' | 'payment_rechecked'
        performedBy: string // Clerk user ID
        performedAt: Date
        details?: string
        previousValues?: Record<string, any>
    }>
    // Payment recheck tracking
    paymentRecheckHistory?: Array<{
        recheckId: string
        performedBy: string // Clerk user ID
        performedAt: Date
        razorpayPaymentId: string
        previousStatus: string
        newStatus: string
        razorpayResponse: any
        success: boolean
        errorMessage?: string
        retryAttempt: number
    }>
}

const campaignDonationSchema = new Schema<ICampaignDonation>({
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },
    programId: { type: Schema.Types.ObjectId, ref: "WelfareProgram", required: true },
    donorId: { type: String }, // Optional for logged out users
    donorName: { type: String, required: true },
    donorEmail: { type: String, required: true }, // Required for all donations
    donorPhone: { type: String }, // For logged out users
    donorAddress: { type: String }, // Address for 80G certificate
    donorCity: { type: String }, // City for 80G certificate
    donorState: { type: String }, // State for 80G certificate
    donorPincode: { 
        type: String,
        validate: {
            validator: function(v: string) {
                // Pincode validation - should be 6 digits if provided
                if (v && !/^[0-9]{6}$/.test(v)) return false;
                return true;
            },
            message: 'Pincode must be exactly 6 digits'
        }
    },
    amount: { type: Number, required: true, min: 0 },
    message: { type: String },
    paymentMethod: { 
        type: String, 
        enum: ['online', 'cash', 'bank_transfer', 'other'], 
        required: true 
    },
    paymentReference: { type: String },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed', 'refunded'], 
        default: 'pending' 
    },
    processedBy: { type: String },
    processedAt: { type: Date },
    // Razorpay fields
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },
    paymentVerified: { type: Boolean, default: false },
    paymentVerifiedAt: { type: Date },
    // Receipt and 80G preferences
    wants80GReceipt: { type: Boolean, default: false },
    donorPAN: { 
        type: String, 
        uppercase: true,
        validate: {
            validator: function(v: string) {
                // PAN validation - required only if wants80GReceipt is true
                if (this.wants80GReceipt && !v) return false;
                if (v && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v)) return false;
                return true;
            },
            message: 'PAN must be in format ABCDE1234F and is required for 80G receipt'
        }
    },
    receiptPreferences: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        razorpayManaged: { type: Boolean, default: false }
    },
    // 80G Certificate tracking
    certificate80G: {
        generated: { type: Boolean, default: false },
        generatedAt: { type: Date },
        certificateNumber: { type: String, index: true }, // Indexed for fast lookups
        financialYear: { type: String, index: true }, // Indexed for FY-based reports
        sequenceNumber: { type: Number }, // The sequential number used in certificate
        issuedBy: { type: String, default: 'System' }, // Track who issued the certificate
        status: { 
            type: String, 
            enum: ['generated', 'sent', 'resent', 'cancelled'], 
            default: 'generated' 
        },
        deliveryMethods: [{
            method: { type: String, enum: ['email', 'sms', 'download'] },
            sentAt: { type: Date },
            status: { type: String, enum: ['success', 'failed', 'pending'] }
        }],
        // Compliance tracking
        formFilingStatus: {
            form10BD: { 
                filed: { type: Boolean, default: false },
                filedAt: { type: Date },
                acknowledgmentNumber: { type: String }
            }
        }
    },
    // Notification tracking
    notificationsSent: { type: Boolean, default: false },
    notificationsSentAt: { type: Date },
    // Audit and visibility controls
    auditStatus: { 
        type: String, 
        enum: ['pending', 'verified', 'rejected', 'under_review'], 
        default: 'pending' 
    },
    isVisibleInReports: { type: Boolean, default: false },
    isVisibleInPublic: { type: Boolean, default: false },
    // Audit trail
    auditLog: [{
        action: { 
            type: String, 
            enum: ['created', 'payment_verified', 'audit_approved', 'audit_rejected', 'visibility_changed', 'payment_rechecked'],
            required: true
        },
        performedBy: { type: String, required: true },
        performedAt: { type: Date, required: true },
        details: { type: String },
        previousValues: { type: Schema.Types.Mixed }
    }],
    // Payment recheck tracking
    paymentRecheckHistory: [{
        recheckId: { type: String, required: true },
        performedBy: { type: String, required: true },
        performedAt: { type: Date, required: true },
        razorpayPaymentId: { type: String, required: true },
        previousStatus: { type: String, required: true },
        newStatus: { type: String, required: true },
        razorpayResponse: { type: Schema.Types.Mixed },
        success: { type: Boolean, required: true },
        errorMessage: { type: String },
        retryAttempt: { type: Number, required: true }
    }]
}, { timestamps: true })

// Pre-save middleware to automatically update visibility rules
campaignDonationSchema.pre('save', function(next) {
  // Initialize audit fields if not set
  if (this.auditStatus === undefined) {
    this.auditStatus = 'pending'
  }
  
  // Update visibility based on payment verification and audit status
  const isPaymentVerified = this.paymentVerified === true
  const isAuditVerified = this.auditStatus === 'verified'
  const isCompleted = this.status === 'completed'
  
  // Set visibility rules
  this.isVisibleInReports = isPaymentVerified && isCompleted
  this.isVisibleInPublic = isPaymentVerified && isAuditVerified && isCompleted
  
  // Initialize audit log if not exists
  if (!this.auditLog) {
    this.auditLog = []
  }
  
  // Initialize recheck history if not exists
  if (!this.paymentRecheckHistory) {
    this.paymentRecheckHistory = []
  }
  
  next()
})

campaignDonationSchema.index({ campaignId: 1 })
campaignDonationSchema.index({ programId: 1 })
campaignDonationSchema.index({ donorId: 1 })
campaignDonationSchema.index({ status: 1 })
campaignDonationSchema.index({ createdAt: -1 })
campaignDonationSchema.index({ auditStatus: 1 })
campaignDonationSchema.index({ paymentVerified: 1 })
campaignDonationSchema.index({ isVisibleInReports: 1 })
campaignDonationSchema.index({ isVisibleInPublic: 1 })
campaignDonationSchema.index({ 'paymentRecheckHistory.recheckId': 1 })

export default mongoose.models.CampaignDonation || mongoose.model<ICampaignDonation>("CampaignDonation", campaignDonationSchema, 'campaign-donations')