"use server";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export type PasswordResetState = {
  error?: string;
  success?: string;
};

const invalidTokenMessage = "El enlace no es válido o ha expirado.";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function resetPassword(
  _previousState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const tokenValue = formData.get("token");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof tokenValue !== "string" ||
    !tokenValue ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return { error: invalidTokenMessage };
  }

  if (newPassword.length < 8) {
    return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  const tokenHash = hashToken(tokenValue);
  const now = new Date();

  try {
    await prisma.$transaction(async (transaction) => {
      const resetToken = await transaction.passwordResetToken.findFirst({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true, userId: true },
      });

      if (!resetToken) {
        throw new Error("INVALID_RESET_TOKEN");
      }

      const newPasswordHash = await hashPassword(newPassword);

      await transaction.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: newPasswordHash },
        select: { id: true },
      });

      await transaction.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
        select: { id: true },
      });

      await transaction.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_RESET_TOKEN") {
      return { error: invalidTokenMessage };
    }

    return { error: "No se pudo actualizar la contraseña. Intenta nuevamente." };
  }

  return { success: "Contraseña actualizada correctamente." };
}
