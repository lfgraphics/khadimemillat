import mongoose, { Schema, Document } from "mongoose"

export interface IAuditEntry {
    action: 'created' | 'updated' | 'deleted'
    performedBy: string // Clerk ID
    performedAt: Date
    changes?: Record<string, any>
    reason?: string
}

export interface IExpenseEntry extends Document {
    clerkUserId: string // Creator's Clerk ID (admin/moderator only)
    amount: number // Expense amount in rupees
    currency: string // Default: 'INR'
    category: mongoose.Types.ObjectId // Reference to ExpenseCategory
    description?: string // Optional - category may be sufficient (e.g., "Tea expense")
    vendor?: string
    expenseDate: Date
    receipts?: string[] // Cloudinary URLs (optional)
    auditTrail: IAuditEntry[]
    isDeleted: boolean // For soft deletion
    deletedAt?: Date
    deletedBy?: string // Clerk ID
    createdAt: Date // Mongoose timestamp
    updatedAt: Date // Mongoose timestamp
}

const auditEntrySchema = new Schema<IAuditEntry>({
    action: { type: String, enum: ['created', 'updated', 'deleted'], required: true },
    performedBy: { type: String, required: true },
    performedAt: { type: Date, default: Date.now },
    changes: { type: Schema.Types.Mixed },
    reason: { type: String }
}, { _id: false })

const expenseEntrySchema = new Schema<IExpenseEntry>({
    clerkUserId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    category: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true },
    description: { type: String, maxlength: 500 },
    vendor: { type: String, maxlength: 200 },
    expenseDate: { type: Date, required: true },
    receipts: [{ type: String }], // Cloudinary URLs
    auditTrail: [auditEntrySchema],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String }
}, { timestamps: true })

// Indexes for efficient querying
expenseEntrySchema.index({ clerkUserId: 1, expenseDate: -1 })
expenseEntrySchema.index({ category: 1, expenseDate: -1 })
expenseEntrySchema.index({ expenseDate: -1 })
expenseEntrySchema.index({ isDeleted: 1 })
expenseEntrySchema.index({ amount: 1 })

// Compound index for filtering
expenseEntrySchema.index({ 
    clerkUserId: 1, 
    category: 1, 
    expenseDate: -1, 
    isDeleted: 1 
})

const ExpenseEntry = mongoose.models.ExpenseEntry || mongoose.model<IExpenseEntry>("ExpenseEntry", expenseEntrySchema, 'expense-entries')
export default ExpenseEntry