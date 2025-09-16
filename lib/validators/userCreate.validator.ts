import { z } from 'zod';

export const userQuickCreateSchema = z.object({
  name: z.string().min(2).max(120),
  mobile: z.string().min(7).max(20).regex(/^[0-9+\-() ]+$/),
});

export type UserQuickCreateInput = z.infer<typeof userQuickCreateSchema>;
