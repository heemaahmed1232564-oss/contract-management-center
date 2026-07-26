import { z } from "zod";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);

export const agencySchema = z.object({
  id: optionalText,
  name: z.string().trim().min(2).max(120),
  nameAr: optionalText,
  code: z.string().trim().min(2).max(24).transform((v) => v.toUpperCase()),
  googleDriveFolderId: optionalText,
  brandingNotes: optionalText,
  certificationAlignment: z.enum(["RIGHT", "CENTER", "LEFT"]).default("RIGHT"),
  certificationLayout: z.enum([
    "SIGNATURE_RIGHT_STAMP_LEFT",
    "STAMP_RIGHT_SIGNATURE_LEFT",
    "SIGNATURE_ABOVE_STAMP",
    "STAMP_ABOVE_SIGNATURE",
  ]).default("SIGNATURE_RIGHT_STAMP_LEFT"),
  certificationGapAfterTablePt: z.coerce.number().int().min(0).max(120).default(12),
  certificationHorizontalOffsetPt: z.coerce.number().int().min(0).max(180).default(18),
  certificationItemGapPt: z.coerce.number().int().min(0).max(100).default(12),
  certificationSignatureWidthPt: z.coerce.number().int().min(40).max(320).default(150),
  certificationStampWidthPt: z.coerce.number().int().min(40).max(320).default(115),
  isActive: z.coerce.boolean().default(true),
});

export const packageSchema = z.object({
  id: optionalText,
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(32).transform((v) => v.toUpperCase()),
  category: z.string().trim().min(2).max(80),
  description: optionalText,
  defaultDuration: z.coerce.number().int().positive().optional().or(z.literal("")),
  defaultPrice: z.coerce.number().nonnegative().optional().or(z.literal("")),
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()),
  isActive: z.coerce.boolean().default(true),
});

export const templateSchema = z.object({
  id: optionalText,
  agencyId: z.string().min(1),
  packageId: z.string().min(1),
  templateName: z.string().trim().min(2).max(180),
  templateCode: z.string().trim().min(2).max(80).transform((v) => v.toUpperCase()),
  contractType: z.string().trim().min(2).max(80),
  googleFileInput: z.string().trim().min(10),
  duration: z.coerce.number().int().positive().optional().or(z.literal("")),
  price: z.coerce.number().nonnegative().optional().or(z.literal("")),
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()),
  offerCode: optionalText,
  version: z.string().trim().min(1).max(30),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
  notes: optionalText,
});

export const userAdminSchema = z.object({
  id: optionalText,
  name: z.string().trim().min(2).max(120),
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(100).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "SUPERVISOR", "CONTRACT_EMPLOYEE"]),
  googleFolderId: optionalText,
  managerId: optionalText,
  department: optionalText,
  isActive: z.coerce.boolean().default(true),
});
