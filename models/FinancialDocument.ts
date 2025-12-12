import mongoose, { Schema, Document } from 'mongoose'

export interface IFinancialDocument extends Document {
  title: string
  description?: string
  documentType: 'annual_report' | 'quarterly_report' | 'monthly_report' | 'audit_report' | 'impact_assessment' | 'utilization_report'
  period: {
    startDate: Date
    endDate: Date
    year: number
    quarter?: number
    month?: number
  }
  fileUrl?: string // Cloudinary URL for generated PDF
  fileSize?: number // File size in bytes
  generatedBy: string // Clerk user ID
  generatedAt: Date
  isPublic: boolean // Whether members can access this document
  memberAccessLevel: 'all' | 'verified_only' | 'none'
  summary: {
    totalDonations: number
    totalExpenses: number
    netAmount: number
    beneficiariesHelped: number
    programsSupported: number
  }
  metadata: {
    version: string
    generationMethod: 'auto' | 'manual'
    dataSourcePeriod: {
      from: Date
      to: Date
    }
    originalFileName?: string
    fileType?: string
    cloudinaryPublicId?: string
  }
  createdAt: Date
  updatedAt: Date
}

const financialDocumentSchema = new Schema<IFinancialDocument>({
  title: { type: String, required: true },
  description: { type: String },
  documentType: {
    type: String,
    required: true,
    enum: ['annual_report', 'quarterly_report', 'monthly_report', 'audit_report', 'impact_assessment', 'utilization_report']
  },
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    year: { type: Number, required: true },
    quarter: { type: Number, min: 1, max: 4 },
    month: { type: Number, min: 1, max: 12 }
  },
  fileUrl: { type: String },
  fileSize: { type: Number },
  generatedBy: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  isPublic: { type: Boolean, default: false },
  memberAccessLevel: {
    type: String,
    enum: ['all', 'verified_only', 'none'],
    default: 'verified_only'
  },
  summary: {
    totalDonations: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    beneficiariesHelped: { type: Number, default: 0 },
    programsSupported: { type: Number, default: 0 }
  },
  metadata: {
    version: { type: String, default: '1.0' },
    generationMethod: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    dataSourcePeriod: {
      from: { type: Date, required: true },
      to: { type: Date, required: true }
    },
    originalFileName: { type: String },
    fileType: { type: String },
    cloudinaryPublicId: { type: String }
  }
}, { timestamps: true })

// Indexes for efficient querying
financialDocumentSchema.index({ documentType: 1, 'period.year': -1, 'period.quarter': -1 })
financialDocumentSchema.index({ isPublic: 1, memberAccessLevel: 1 })
financialDocumentSchema.index({ generatedAt: -1 })
financialDocumentSchema.index({ 'period.startDate': 1, 'period.endDate': 1 })

export default mongoose.models.FinancialDocument || mongoose.model<IFinancialDocument>('FinancialDocument', financialDocumentSchema)