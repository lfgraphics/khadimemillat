import { z } from "zod"

export const roleSchema = z.object({
    id: z.string().min(1, "User ID required"),
    role: z.enum(["admin", "moderator", "field_executive", "surveyor", "accountant", "neki_bank_manager", "gullak_caretaker"]).optional(),
})
