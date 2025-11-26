import { Roles } from '@/types/globals'
import { auth } from '@clerk/nextjs/server'

export const checkRole = async (role: Roles) => {
    const { sessionClaims } = await auth()
    return sessionClaims?.metadata.role === role
}

export const ASSIGNABLE_ROLES = ["admin", "moderator", "field_executive", "surveyor", "accountant", "neki_bank_manager", "gullak_caretaker"] as const
export const ROLES = ASSIGNABLE_ROLES // For backward compatibility
export type Role = (typeof ROLES)[number]

export function isValidRole(v: any): v is Role {
  return ROLES.includes(v)
}
