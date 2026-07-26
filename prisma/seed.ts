import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole } from "../src/generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error("Set SEED_PASSWORD to a development-only value with at least 12 characters.");
  }
  const developmentPassword = await hash(seedPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@contracthub.local" },
    update: { passwordHash: developmentPassword, isActive: true },
    create: {
      name: "مسؤول النظام",
      email: "admin@contracthub.local",
      passwordHash: developmentPassword,
      role: UserRole.ADMIN,
      googleFolderId: "folder-admin-development",
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: "manager@contracthub.local" },
    update: { passwordHash: developmentPassword, isActive: true },
    create: {
      name: "مدير العقود",
      email: "manager@contracthub.local",
      passwordHash: developmentPassword,
      role: UserRole.SUPERVISOR,
      googleFolderId: "folder-manager-development",
    },
  });

  await prisma.user.upsert({
    where: { email: "employee@contracthub.local" },
    update: { managerId: supervisor.id, passwordHash: developmentPassword, isActive: true },
    create: {
      name: "إبراهيم أحمد",
      email: "employee@contracthub.local",
      passwordHash: developmentPassword,
      role: UserRole.CONTRACT_EMPLOYEE,
      googleFolderId: "folder-employee-development",
      managerId: supervisor.id,
      department: "فريق العقود",
    },
  });

  const agency = await prisma.agency.upsert({
    where: { code: "AG01" },
    update: {},
    create: {
      name: "Agency One",
      nameAr: "وكالة الأولى",
      code: "AG01",
      googleDriveFolderId: "folder-agency-one-development",
      brandingNotes: "هوية خضراء داكنة — بيانات تجريبية فقط.",
    },
  });

  const vip = await prisma.package.upsert({
    where: { code: "VIP-3M" },
    update: {},
    create: {
      name: "VIP — ثلاثة أشهر",
      code: "VIP-3M",
      category: "VIP",
      defaultDuration: 3,
      defaultPrice: 5000,
      currency: "SAR",
      description: "باقة تسويق رقمية كاملة لمدة ثلاثة أشهر.",
    },
  });

  await prisma.contractTemplate.upsert({
    where: {
      agencyId_templateCode_version: {
        agencyId: agency.id,
        templateCode: "AG01-VIP-03M-SUMMER",
        version: "1.0",
      },
    },
    update: {},
    create: {
      agencyId: agency.id,
      packageId: vip.id,
      templateName: "AG01 VIP 3M Summer Offer",
      templateCode: "AG01-VIP-03M-SUMMER",
      contractType: "Marketing",
      googleFileId: "mock-template-ag01-vip-3m",
      googleFileUrl: "https://docs.google.com/document/d/mock-template-ag01-vip-3m/edit",
      duration: 3,
      price: 5000,
      currency: "SAR",
      offerCode: "SUMMER",
      version: "1.0",
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      isActive: true,
      notes: "قالب تجريبي يعمل مع GOOGLE_DRIVE_MODE=mock.",
    },
  });

  await prisma.systemSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      googleDriveRootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null,
      sharedDriveId: process.env.GOOGLE_SHARED_DRIVE_ID || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED_COMPLETED",
      entityType: "System",
      entityId: "default",
      details: { mode: process.env.GOOGLE_DRIVE_MODE ?? "mock" },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
