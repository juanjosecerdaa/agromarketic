import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
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
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
        token.status = user.status;
      } else if (typeof token.id === "string") {
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
