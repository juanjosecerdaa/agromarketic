"use server";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export type PasswordResetRequestState = {
  message?: string;
};

const genericMessage =
  "Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña.";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(
  _previousState: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const emailValue = formData.get("email");
  const email =
    typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";

  if (!email) {
    return { message: genericMessage };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, status: true, passwordHash: true },
    });

    if (user?.status !== "ACTIVE" || !user.passwordHash) {
      return { message: genericMessage };
    }

    const now = new Date();
    const cooldownStart = new Date(now.getTime() - 60_000);
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: cooldownStart },
      },
      select: { id: true },
    });

    if (recentToken) {
      return { message: genericMessage };
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(now.getTime() + 30 * 60_000);

    await prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });
      await transaction.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    const appUrl = process.env.APP_URL?.replace(/\/+$/, "");
    if (!appUrl) {
      throw new Error("APP_URL_NOT_CONFIGURED");
    }

    await sendPasswordResetEmail(
      user.email,
      `${appUrl}/restablecer-contrasena?token=${encodeURIComponent(token)}`,
    );
  } catch (error) {
    console.error("Password reset request failed", error);
  }

  return { message: genericMessage };
}
