"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export type ProfileFormState = {
  error?: string;
  success?: string;
};

export type PasswordFormState = {
  error?: string;
  success?: string;
};

const phonePattern = /^[0-9+()\-\s.]+$/;

function canUpdateAccount(
  session: { user: { status: string; roles: readonly string[] } } | null,
) {
  return (
    session &&
    session.user.status === "ACTIVE" &&
    (session.user.roles.includes(ROLES.FARMER) ||
      session.user.roles.includes(ROLES.BUYER))
  );
}

export async function updateProfile(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth();

  if (!session || !canUpdateAccount(session)) {
    return { error: "No tienes permisos para actualizar tu perfil." };
  }

  const nameValue = formData.get("name");
  const phoneValue = formData.get("phone");

  if (typeof nameValue !== "string" || !nameValue.trim()) {
    return { error: "Ingresa tu nombre completo." };
  }

  const validatedName = nameValue.trim();
  if (validatedName.length > 120) {
    return { error: "El nombre no puede superar 120 caracteres." };
  }

  if (typeof phoneValue !== "string") {
    return { error: "El teléfono no es válido." };
  }

  const normalizedPhone = phoneValue.trim() || null;
  if (normalizedPhone && normalizedPhone.length > 30) {
    return { error: "El teléfono no puede superar 30 caracteres." };
  }

  if (normalizedPhone && !phonePattern.test(normalizedPhone)) {
    return { error: "Ingresa un teléfono válido." };
  }

  const digitCount = normalizedPhone?.replace(/\D/g, "").length ?? 0;
  if (normalizedPhone && (digitCount < 7 || digitCount > 15)) {
    return { error: "Ingresa un teléfono válido." };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: validatedName,
        phone: normalizedPhone,
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { error: "La cuenta ya no está disponible." };
    }

    return { error: "No se pudo actualizar tu perfil. Intenta nuevamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/configuracion");
  revalidatePath("/cuenta");

  return { success: "Tus datos se actualizaron correctamente." };
}

export async function changePassword(
  _previousState: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const session = await auth();

  if (!session || !canUpdateAccount(session)) {
    return { error: "No se pudo actualizar la contraseña." };
  }

  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof currentPassword !== "string" ||
    !currentPassword ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return { error: "La contraseña actual no es correcta." };
  }

  let user: { passwordHash: string | null } | null;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
  } catch {
    return { error: "No se pudo actualizar la contraseña." };
  }

  if (!user?.passwordHash) {
    return { error: "La contraseña actual no es correcta." };
  }

  let currentPasswordMatches = false;
  try {
    currentPasswordMatches = await verifyPassword(
      user.passwordHash,
      currentPassword,
    );
  } catch {
    return { error: "La contraseña actual no es correcta." };
  }

  if (!currentPasswordMatches) {
    return { error: "La contraseña actual no es correcta." };
  }

  if (newPassword.length < 8) {
    return { error: "La nueva contraseña no cumple los requisitos." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  let isSamePassword = false;
  try {
    isSamePassword = await verifyPassword(user.passwordHash, newPassword);
  } catch {
    return { error: "No se pudo actualizar la contraseña." };
  }

  if (isSamePassword) {
    return { error: "La nueva contraseña debe ser diferente de la actual." };
  }

  try {
    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newPasswordHash },
      select: { id: true },
    });
  } catch {
    return { error: "No se pudo actualizar la contraseña." };
  }

  revalidatePath("/dashboard/configuracion");
  revalidatePath("/cuenta");
  return { success: "Contraseña actualizada correctamente." };
}
