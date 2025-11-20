import { z } from "zod"

// Expense Entry validation schemas
export const expenseEntryCreateSchema = z.object({
    amount: z.number().positive("Amount must be greater than 0"),
    currency: z.string().default("INR"),
    category: z.string().length(24, "Invalid category ID"),
    description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
    vendor: z.string().max(200, "Vendor name cannot exceed 200 characters").optional(),
    expenseDate: z.date(),
    receipts: z.array(z.string().url("Invalid receipt URL")).optional(),
    reason: z.string().optional() // For audit trail
})

export const expenseEntryUpdateSchema = z.object({
    amount: z.number().positive("Amount must be greater than 0").optional(),
    currency: z.string().optional(),
    category: z.string().length(24, "Invalid category ID").optional(),
    description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
    vendor: z.string().max(200, "Vendor name cannot exceed 200 characters").optional(),
    expenseDate: z.date().optional(),
    receipts: z.array(z.string().url("Invalid receipt URL")).optional(),
    reason: z.string().optional() // For audit trail
})

export const expenseEntryFiltersSchema = z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    category: z.string().length(24).optional(),
    minAmount: z.number().nonnegative().optional(),
    maxAmount: z.number().positive().optional(),
    clerkUserId: z.string().optional(),
    includeDeleted: z.boolean().default(false),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20)
}).refine(data => {
    if (data.minAmount && data.maxAmount) {
        return data.minAmount <= data.maxAmount
    }
    return true
}, {
    message: "Minimum amount cannot be greater than maximum amount",
    path: ["minAmount"]
}).refine(data => {
    if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate
    }
    return true
}, {
    message: "Start date cannot be after end date",
    path: ["startDate"]
})

export const expenseEntryDeleteSchema = z.object({
    reason: z.string().min(1, "Reason for deletion is required")
})

// Expense Category validation schemas
export const expenseCategoryCreateSchema = z.object({
    name: z.string().min(1, "Category name is required").max(100, "Category name cannot exceed 100 characters"),
    description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
    parentCategory: z.string().length(24, "Invalid parent category ID").optional()
})

export const expenseCategoryUpdateSchema = z.object({
    name: z.string().min(1, "Category name is required").max(100, "Category name cannot exceed 100 characters").optional(),
    description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
    parentCategory: z.string().length(24, "Invalid parent category ID").optional()
})

export const expenseCategoryFiltersSchema = z.object({
    includeInactive: z.boolean().default(false),
    parentCategory: z.string().length(24).optional(),
    search: z.string().optional()
})

// Receipt upload validation
export const receiptUploadSchema = z.object({
    expenseId: z.string().length(24, "Invalid expense ID"),
    files: z.array(z.object({
        url: z.string().url("Invalid file URL"),
        publicId: z.string().min(1, "Public ID is required")
    })).min(1, "At least one receipt file is required")
})

// Report generation validation
export const expenseReportSchema = z.object({
    startDate: z.date(),
    endDate: z.date(),
    categories: z.array(z.string().length(24)).optional(),
    users: z.array(z.string()).optional(),
    includeDeleted: z.boolean().default(false),
    groupBy: z.enum(["category", "user", "date", "none"]).default("none"),
    format: z.enum(["json", "csv", "pdf"]).default("json")
}).refine(data => data.startDate <= data.endDate, {
    message: "Start date cannot be after end date",
    path: ["startDate"]
})

// Type exports for use in components and services
export type ExpenseEntryCreateInput = z.infer<typeof expenseEntryCreateSchema>
export type ExpenseEntryUpdateInput = z.infer<typeof expenseEntryUpdateSchema>
export type ExpenseEntryFilters = z.infer<typeof expenseEntryFiltersSchema>
export type ExpenseCategoryCreateInput = z.infer<typeof expenseCategoryCreateSchema>
export type ExpenseCategoryUpdateInput = z.infer<typeof expenseCategoryUpdateSchema>
export type ExpenseCategoryFilters = z.infer<typeof expenseCategoryFiltersSchema>
export type ReceiptUploadInput = z.infer<typeof receiptUploadSchema>
export type ExpenseReportInput = z.infer<typeof expenseReportSchema>