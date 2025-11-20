import mongoose, { Schema, Document } from "mongoose"

export interface IExpenseCategory extends Document {
    name: string
    description?: string
    isActive: boolean
    createdBy: string // Clerk ID
    parentCategory?: mongoose.Types.ObjectId
}

const expenseCategorySchema = new Schema<IExpenseCategory>({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory' }
}, { timestamps: true })

// Indexes for efficient querying
expenseCategorySchema.index({ isActive: 1 })
expenseCategorySchema.index({ name: 1 })
expenseCategorySchema.index({ parentCategory: 1 })

const ExpenseCategory = mongoose.models.ExpenseCategory || mongoose.model<IExpenseCategory>("ExpenseCategory", expenseCategorySchema, 'expense-categories')
export default ExpenseCategory