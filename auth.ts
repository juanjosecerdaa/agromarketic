import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { isRoleName, type RoleName } from "@/lib/auth/roles";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

function isUserStatus(value: unknown): value is "ACTIVE" | "SUSPENDED" | "PENDING" | "DELETED" {
  return (
    value === "ACTIVE" ||
    value === "SUSPENDED" ||
    value === "PENDING" ||
    value === "DELETED"
  );
}

function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

const googleClientId = process.env.AUTH_GOOGLE_ID?.trim();
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET?.trim();
const googleProvider =
  googleClientId && googleClientSecret
    ? Google({ clientId: googleClientId, clientSecret: googleClientSecret })
    : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Correo electrónico",
          type: "email",
        },
        password: {
          label: "Contraseña",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        });

        if (
          !user ||
          user.status !== "ACTIVE" ||
          !user.passwordHash ||
          !(await verifyPassword(user.passwordHash, password))
        ) {
          return null;
        }

        const roles = user.roles
          .map(({ role }) => role.name)
          .filter(isRoleName);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles,
          status: user.status,
        };
      },
    }),
    ...(googleProvider ? [googleProvider] : []),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      if (
        profile?.email_verified !== true ||
        !isValidEmail(profile.email) ||
        typeof profile.name !== "string" ||
        !profile.name.trim()
      ) {
        return false;
      }

      const email = profile.email.toLowerCase();
      const [existingUser, linkedAccount] = await Promise.all([
        prisma.user.findUnique({
          where: { email },
          select: { status: true },
        }),
        prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          select: { user: { select: { status: true } } },
        }),
      ]);

      return (
        existingUser?.status !== "SUSPENDED" &&
        linkedAccount?.user.status !== "SUSPENDED"
      );
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      if (typeof token.id === "string") {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            status: true,
            roles: {
              select: {
                role: { select: { name: true } },
              },
            },
          },
        });

        token.status = currentUser?.status ?? "DELETED";
        token.roles = currentUser
          ? currentUser.roles.map(({ role }) => role.name).filter(isRoleName)
          : [];
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
        session.user.roles = Array.isArray(token.roles)
          ? token.roles.filter(
              (role): role is RoleName =>
                typeof role === "string" && isRoleName(role),
            )
          : [];
        session.user.status = isUserStatus(token.status)
          ? token.status
          : "PENDING";
      }

      return session;
    },
  },
});
