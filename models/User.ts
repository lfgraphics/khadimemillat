// models/User.ts
import mongoose, { Schema, Document } from "mongoose"
import { Roles, RolesEnum } from "@/types/globals"

// Clerk-first architecture note:
// - phone and address are stored primarily in Clerk privateMetadata (PII) for a single source of truth.
// - This Mongo model acts as a secondary cache for name/email/role and optionally phone/address for convenience.
// - Avoid treating phone/address here as authoritative.

export interface IUser extends Document {
    clerkUserId: string
    name: string
    email?: string
    phone?: string // non-authoritative; Clerk privateMetadata is source of truth
    address?: string // non-authoritative; Clerk privateMetadata is source of truth
    role: Roles
    lastSyncedFromClerkAt?: Date
}

const userSchema = new Schema<IUser>({
    clerkUserId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    role: { type: String, enum: RolesEnum, default: "user" },
    lastSyncedFromClerkAt: { type: Date }
}, { timestamps: true })

export default mongoose.models.User || mongoose.model<IUser>("User", userSchema, 'users')