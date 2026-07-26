import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";
import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

const providers = [
  Credentials({
    name: "البريد وكلمة المرور",
    credentials: {
      email: { label: "البريد الإلكتروني", type: "email" },
      password: { label: "كلمة المرور", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      if (!user?.isActive || !user.passwordHash) return null;
      if (!(await compare(parsed.data.password, user.passwordHash))) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        sessionVersion: user.sessionVersion,
      };
    },
  }),
  ...(googleClientId && googleClientSecret
    ? [
        Google({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          authorization: {
            params: process.env.GOOGLE_WORKSPACE_DOMAIN
              ? { hd: process.env.GOOGLE_WORKSPACE_DOMAIN }
              : undefined,
          },
        }),
      ]
    : []),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
      });
      if (!dbUser?.isActive) return false;

      if (account?.provider === "google") {
        const emailVerified = (profile as { email_verified?: boolean } | undefined)
          ?.email_verified;
        if (emailVerified === false) return false;
        const domain = process.env.GOOGLE_WORKSPACE_DOMAIN?.toLowerCase();
        if (domain && !dbUser.email.toLowerCase().endsWith(`@${domain}`)) return false;
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: dbUser.id },
          data: { lastLoginAt: new Date() },
        }),
        prisma.auditLog.create({
          data: {
            userId: dbUser.id,
            action: "USER_LOGIN",
            entityType: "User",
            entityId: dbUser.id,
            details: { provider: account?.provider ?? "credentials" },
          },
        }),
      ]);
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { id: true, role: true, isActive: true, sessionVersion: true },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.isActive = dbUser.isActive;
          token.sessionVersion = dbUser.sessionVersion;
        }
      } else if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.userId) },
          select: { role: true, isActive: true, sessionVersion: true },
        });
        if (!dbUser || !dbUser.isActive || dbUser.sessionVersion !== token.sessionVersion) {
          token.isActive = false;
        } else {
          token.role = dbUser.role;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? token.sub ?? "");
        session.user.role = token.role as UserRole | undefined;
        session.user.isActive = token.isActive !== false;
        session.user.sessionVersion = Number(token.sessionVersion ?? 0);
      }
      return session;
    },
  },
});
