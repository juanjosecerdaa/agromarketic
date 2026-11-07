"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { getAuthorizedDestination } from "@/lib/auth/redirects";
import { isRoleName } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loginUser(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = formData.get("callbackUrl");

  if (typeof email !== "string") {
    return { error: "Ingresa un correo electrónico válido." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!emailPattern.test(normalizedEmail)) {
    return { error: "Ingresa un correo electrónico válido." };
  }

  if (typeof password !== "string" || !password) {
    return { error: "Ingresa tu contraseña." };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      status: true,
      roles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  });

  const roles = user?.roles
    .map(({ role }) => role.name)
    .filter(isRoleName) ?? [];
  const destination =
    user?.status === "ACTIVE"
      ? getAuthorizedDestination(
          roles,
          typeof callbackUrl === "string" ? callbackUrl : null,
        )
      : null;

  if (!destination) {
    return { error: "Correo o contraseña incorrectos." };
  }

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo: destination,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Correo o contraseña incorrectos." };
    }

    throw error;
  }

  return { error: "No se pudo iniciar sesión. Intenta nuevamente." };
}
