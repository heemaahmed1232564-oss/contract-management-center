import { z } from "zod";

export const generateContractSchema = z.object({
  agencyId: z.string().min(1),
  packageId: z.string().min(1),
  templateId: z.string().min(1).optional(),
  contractType: z.string().trim().min(1),
  duration: z.number().int().positive().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()),
  offerCode: z.string().trim().max(80).nullable().optional(),
  clientName: z.string().trim().max(160).nullable().optional(),
  clientPhone: z.string().trim().max(40).nullable().optional(),
  clientEmail: z.email().nullable().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).nullable().optional(),
  idempotencyKey: z.uuid(),
  allowDuplicate: z.boolean().default(false),
});

export type GenerateContractInput = z.infer<typeof generateContractSchema>;
