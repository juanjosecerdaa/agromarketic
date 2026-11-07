"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ROLES } from "@/lib/auth/roles";

export type RegistrationState = {
  error?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerUser(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const name = formData.get("name");
  const phone = formData.get("phone");
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const accountType = formData.get("accountType");
  const termsAccepted = formData.get("terms");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Ingresa tu nombre completo." };
  }

  if (typeof email !== "string") {
    return { error: "Ingresa un correo electrónico válido." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!emailPattern.test(normalizedEmail)) {
    return { error: "Ingresa un correo electrónico válido." };
  }

  if (typeof password !== "string" || password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  if (accountType !== ROLES.BUYER && accountType !== ROLES.FARMER) {
    return { error: "Selecciona un tipo de cuenta válido." };
  }

  if (termsAccepted !== "on") {
    return { error: "Debes aceptar los términos de uso y la política de privacidad." };
  }

  const normalizedPhone =
    typeof phone === "string" && phone.trim() ? phone.trim() : null;

  try {
    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (transaction) => {
      const role = await transaction.role.findUnique({
        where: { name: accountType },
        select: { id: true },
      });

      if (!role) {
        throw new Error("ROLE_NOT_INITIALIZED");
      }

      const existingUser = await transaction.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (existingUser) {
        throw new Error("EMAIL_ALREADY_REGISTERED");
      }

      const user = await transaction.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: normalizedPhone,
          passwordHash,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      await transaction.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ROLE_NOT_INITIALIZED") {
      return {
        error: "El tipo de cuenta seleccionado todavía no está disponible.",
      };
    }

    if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
      return { error: "No se pudo crear la cuenta con esos datos." };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "No se pudo crear la cuenta con esos datos." };
    }

    return { error: "Ocurrió un error inesperado. Intenta nuevamente." };
  }

  redirect("/login?registered=1");
}
