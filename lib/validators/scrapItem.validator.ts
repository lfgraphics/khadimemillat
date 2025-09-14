import { z } from "zod";

export const scrapItemCreateSchema = z.object({
    scrapEntry: z.string().length(24),
    name: z.string().min(2).max(200),
    condition: z.enum(["new", "good", "repairable", "scrap", "not applicable"]),
    photos: z.object({
        before: z.array(z.string()).optional(),
        after: z.array(z.string()).optional(),
    }).optional(),
    marketplaceListing: z.object({
        listed: z.boolean().optional(),
        demandedPrice: z.number().positive().optional(),
        salePrice: z.number().positive().optional(),
        sold: z.boolean().optional(),
    }).optional(),
    repairingCost: z.number().nonnegative().optional(),
});

export const scrapItemUpdateSchema = scrapItemCreateSchema.partial();
