// models/User.ts
import mongoose, { Schema, Document } from "mongoose"
import { Roles, RolesEnum } from "@/types/globals"

export interface IUser extends Document {
    clerkUserId: string
    name: string
    email?: string
    phone?: string
    address?: string
    role: Roles
}

const userSchema = new Schema<IUser>({
    clerkUserId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    role: { type: String, enum: RolesEnum, default: "user" },
}, { timestamps: true })

export default mongoose.models.User || mongoose.model<IUser>("User", userSchema, 'users')