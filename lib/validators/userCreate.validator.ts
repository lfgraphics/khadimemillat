import { z } from 'zod';

export const userQuickCreateSchema = z.object({
  name: z.string().min(2).max(120),
  mobile: z.string().min(10).max(25).regex(/^\+\d{1,4}\s\d{4,15}$/),
});

export type UserQuickCreateInput = z.infer<typeof userQuickCreateSchema>;
