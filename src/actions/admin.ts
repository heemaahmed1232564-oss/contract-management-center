"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { UserRole } from "@/generated/prisma/enums";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth/permissions";
import { extractGoogleFileIdFromUrl } from "@/lib/drive/google-drive-service";
import { prisma } from "@/lib/prisma";
import {
  agencySchema,
  packageSchema,
  templateSchema,
  userAdminSchema,
} from "@/lib/validation/admin";

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function saveAgencyAction(formData: FormData) {
  const user = await requireRole([UserRole.ADMIN]);
  const stamp = pngFile(formData, "stampImage");
  const signature = pngFile(formData, "signatureImage");
  const data = agencySchema.parse({
    id: value(formData, "id"),
    name: value(formData, "name"),
    nameAr: value(formData, "nameAr"),
    code: value(formData, "code"),
    googleDriveFolderId: value(formData, "googleDriveFolderId"),
    brandingNotes: value(formData, "brandingNotes"),
    certificationAlignment: value(formData, "certificationAlignment") || "RIGHT",
    certificationLayout: value(formData, "certificationLayout") || "SIGNATURE_RIGHT_STAMP_LEFT",
    certificationGapAfterTablePt: value(formData, "certificationGapAfterTablePt") || "12",
    certificationHorizontalOffsetPt: value(formData, "certificationHorizontalOffsetPt") || "18",
    certificationItemGapPt: value(formData, "certificationItemGapPt") || "12",
    certificationSignatureWidthPt: value(formData, "certificationSignatureWidthPt") || "150",
    certificationStampWidthPt: value(formData, "certificationStampWidthPt") || "115",
    isActive: checked(formData, "isActive"),
  });
  const identityUpdate = {
    ...(stamp
      ? { stampImage: new Uint8Array(await stamp.arrayBuffer()), stampImageMime: stamp.type }
      : {}),
    ...(signature
      ? { signatureImage: new Uint8Array(await signature.arrayBuffer()), signatureImageMime: signature.type }
      : {}),
  };
  const agencyData = {
    name: data.name,
    nameAr: data.nameAr,
    code: data.code,
    googleDriveFolderId: data.googleDriveFolderId,
    brandingNotes: data.brandingNotes,
    certificationAlignment: data.certificationAlignment,
    certificationLayout: data.certificationLayout,
    certificationGapAfterTablePt: data.certificationGapAfterTablePt,
    certificationHorizontalOffsetPt: data.certificationHorizontalOffsetPt,
    certificationItemGapPt: data.certificationItemGapPt,
    certificationSignatureWidthPt: data.certificationSignatureWidthPt,
    certificationStampWidthPt: data.certificationStampWidthPt,
    isActive: data.isActive,
    ...identityUpdate,
  };
  const agency = data.id
    ? await prisma.agency.update({
        where: { id: data.id },
        data: agencyData,
      })
    : await prisma.agency.create({ data: agencyData });
  await writeAuditLog({
    userId: user.id,
    action: data.id ? "AGENCY_UPDATED" : "AGENCY_CREATED",
    entityType: "Agency",
    entityId: agency.id,
    details: {
      code: agency.code,
      stampUpdated: Boolean(stamp),
      signatureUpdated: Boolean(signature),
      certificationAlignment: agency.certificationAlignment,
      certificationLayout: agency.certificationLayout,
    },
  });
  revalidatePath("/admin/agencies");
  revalidatePath("/admin");
}

export async function savePackageAction(formData: FormData) {
  const user = await requireRole([UserRole.ADMIN]);
  const parsed = packageSchema.parse({
    id: value(formData, "id"),
    name: value(formData, "name"),
    code: value(formData, "code"),
    category: value(formData, "category"),
    description: value(formData, "description"),
    defaultDuration: value(formData, "defaultDuration"),
    defaultPrice: value(formData, "defaultPrice"),
    currency: value(formData, "currency") || "SAR",
    isActive: checked(formData, "isActive"),
  });
  const data = {
    name: parsed.name,
    code: parsed.code,
    category: parsed.category,
    description: parsed.description,
    defaultDuration: parsed.defaultDuration === "" ? null : parsed.defaultDuration,
    defaultPrice: parsed.defaultPrice === "" ? null : parsed.defaultPrice,
    currency: parsed.currency,
    isActive: parsed.isActive,
  };
  const packageRecord = parsed.id
    ? await prisma.package.update({ where: { id: parsed.id }, data })
    : await prisma.package.create({ data });
  await writeAuditLog({
    userId: user.id,
    action: parsed.id ? "PACKAGE_UPDATED" : "PACKAGE_CREATED",
    entityType: "Package",
    entityId: packageRecord.id,
    details: { code: packageRecord.code },
  });
  revalidatePath("/admin/packages");
}

export async function saveTemplateAction(formData: FormData) {
  const user = await requireRole([UserRole.ADMIN, UserRole.SUPERVISOR]);
  const parsed = templateSchema.parse({
    id: value(formData, "id"),
    agencyId: value(formData, "agencyId"),
    packageId: value(formData, "packageId"),
    templateName: value(formData, "templateName"),
    templateCode: value(formData, "templateCode"),
    contractType: value(formData, "contractType"),
    googleFileInput: value(formData, "googleFileInput"),
    duration: value(formData, "duration"),
    price: value(formData, "price"),
    currency: value(formData, "currency") || "SAR",
    offerCode: value(formData, "offerCode"),
    version: value(formData, "version"),
    effectiveFrom: value(formData, "effectiveFrom"),
    effectiveTo: value(formData, "effectiveTo"),
    isActive: checked(formData, "isActive"),
    notes: value(formData, "notes"),
  });

  const googleFileId = extractGoogleFileIdFromUrl(parsed.googleFileInput);
  const googleFileUrl = `https://docs.google.com/document/d/${encodeURIComponent(googleFileId)}/edit`;
  const duration = parsed.duration === "" ? null : parsed.duration;
  const price = parsed.price === "" ? null : parsed.price;
  const effectiveTo = parsed.effectiveTo === "" ? null : parsed.effectiveTo;
  const data = {
    agencyId: parsed.agencyId,
    packageId: parsed.packageId,
    templateName: parsed.templateName,
    templateCode: parsed.templateCode,
    contractType: parsed.contractType,
    googleFileId,
    googleFileUrl,
    duration,
    price,
    currency: parsed.currency,
    offerCode: parsed.offerCode,
    version: parsed.version,
    effectiveFrom: parsed.effectiveFrom,
    effectiveTo,
    isActive: parsed.isActive,
    notes: parsed.notes,
  };

  const template = parsed.id
    ? await prisma.contractTemplate.update({ where: { id: parsed.id }, data })
    : await prisma.contractTemplate.create({ data });

  await writeAuditLog({
    userId: user.id,
    action: parsed.id ? "TEMPLATE_UPDATED" : "TEMPLATE_CREATED",
    entityType: "ContractTemplate",
    entityId: template.id,
    details: {
      templateCode: template.templateCode,
      version: template.version,
      googleFileIdChanged: Boolean(parsed.id),
    },
  });
  revalidatePath("/admin/templates");
  revalidatePath("/contracts/new");
}

export async function saveUserAction(formData: FormData) {
  const actor = await requireRole([UserRole.ADMIN]);
  const parsed = userAdminSchema.parse({
    id: value(formData, "id"),
    name: value(formData, "name"),
    email: value(formData, "email"),
    password: value(formData, "password"),
    role: value(formData, "role"),
    googleFolderId: value(formData, "googleFolderId"),
    managerId: value(formData, "managerId"),
    department: value(formData, "department"),
    isActive: checked(formData, "isActive"),
  });
  const passwordHash = parsed.password ? await hash(parsed.password, 12) : undefined;
  const data = {
    name: parsed.name,
    email: parsed.email,
    role: parsed.role,
    googleFolderId: parsed.googleFolderId,
    managerId: parsed.managerId,
    department: parsed.department,
    isActive: parsed.isActive,
    ...(passwordHash ? { passwordHash } : {}),
  };
  const target = parsed.id
    ? await prisma.user.update({
        where: { id: parsed.id },
        data: { ...data, ...(passwordHash ? { sessionVersion: { increment: 1 } } : {}) },
      })
    : await prisma.user.create({ data });
  await writeAuditLog({
    userId: actor.id,
    action: parsed.id ? "USER_UPDATED" : "USER_CREATED",
    entityType: "User",
    entityId: target.id,
    details: {
      email: target.email,
      role: target.role,
      googleFolderChanged: Boolean(parsed.id),
      passwordChanged: Boolean(passwordHash),
    },
  });
  revalidatePath("/admin/users");
}

export async function updateSystemSettingsAction(formData: FormData) {
  const user = await requireRole([UserRole.ADMIN]);
  const namingPattern = value(formData, "namingPattern").trim();
  const referencePrefix = value(formData, "referencePrefix").trim().toUpperCase();
  if (!namingPattern.includes("{reference_number}")) {
    throw new Error("Naming pattern must contain {reference_number}");
  }
  const setting = await prisma.systemSetting.upsert({
    where: { id: "default" },
    update: {
      namingPattern,
      referencePrefix,
      googleDriveRootFolderId: value(formData, "googleDriveRootFolderId") || null,
      sharedDriveId: value(formData, "sharedDriveId") || null,
    },
    create: {
      id: "default",
      namingPattern,
      referencePrefix,
      googleDriveRootFolderId: value(formData, "googleDriveRootFolderId") || null,
      sharedDriveId: value(formData, "sharedDriveId") || null,
    },
  });
  await writeAuditLog({
    userId: user.id,
    action: "SYSTEM_SETTINGS_UPDATED",
    entityType: "SystemSetting",
    entityId: setting.id,
    details: { referencePrefix: setting.referencePrefix },
  });
  revalidatePath("/admin");
}

function pngFile(formData: FormData, key: string) {
  const entry = formData.get(key);
  if (!(entry instanceof File) || entry.size === 0) return null;
  if (entry.type !== "image/png") throw new Error("يجب أن تكون الصورة بصيغة PNG.");
  if (entry.size > 5 * 1024 * 1024) throw new Error("حجم صورة PNG يجب ألا يتجاوز 5MB.");
  return entry;
}

export async function archiveAgencyAction(id: string) {
  const user = await requireRole([UserRole.ADMIN]);
  const agency = await prisma.agency.update({
    where: { id },
    data: { isActive: false, archivedAt: new Date() },
  });
  await writeAuditLog({ userId: user.id, action: "AGENCY_ARCHIVED", entityType: "Agency", entityId: id, details: { code: agency.code } });
  revalidatePath("/admin/agencies");
}

export async function archivePackageAction(id: string) {
  const user = await requireRole([UserRole.ADMIN]);
  const item = await prisma.package.update({
    where: { id },
    data: { isActive: false, archivedAt: new Date() },
  });
  await writeAuditLog({ userId: user.id, action: "PACKAGE_ARCHIVED", entityType: "Package", entityId: id, details: { code: item.code } });
  revalidatePath("/admin/packages");
}

export async function archiveTemplateAction(id: string) {
  const user = await requireRole([UserRole.ADMIN, UserRole.SUPERVISOR]);
  await prisma.contractTemplate.update({ where: { id }, data: { isActive: false, archivedAt: new Date() } });
  await writeAuditLog({ userId: user.id, action: "TEMPLATE_ARCHIVED", entityType: "ContractTemplate", entityId: id });
  revalidatePath("/admin/templates");
  revalidatePath("/contracts/new");
}

export async function disableUserAction(id: string) {
  const actor = await requireRole([UserRole.ADMIN]);
  if (actor.id === id) throw new Error("لا يمكنك تعطيل حسابك الحالي.");
  await prisma.user.update({
    where: { id },
    data: { isActive: false, sessionVersion: { increment: 1 } },
  });
  await writeAuditLog({ userId: actor.id, action: "USER_DISABLED", entityType: "User", entityId: id });
  revalidatePath("/admin/users");
}
