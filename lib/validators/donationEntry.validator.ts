import { z } from "zod";

export const donationEntryCreateSchema = z.object({
    donor: z.string().length(24),
    items: z.array(z.string().length(24)).optional(),
    status: z.enum(["pending", "verified", "collected", "done"]).optional(),
});

export const donationEntryUpdateSchema = donationEntryCreateSchema.partial();
