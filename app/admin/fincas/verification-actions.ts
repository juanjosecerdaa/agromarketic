"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export type FincaVerificationReviewState = {
  error?: string;
  success?: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function getActiveAdminId() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      roles: {
        select: { role: { select: { name: true } } },
      },
    },
  });

  if (
    !user ||
    user.status !== "ACTIVE" ||
    !user.roles.some(({ role }) => role.name === ROLES.ADMIN)
  ) {
    return null;
  }

  return user.id;
}

async function reviewFincaVerification(
  formData: FormData,
  decision: "VERIFIED" | "REJECTED",
): Promise<FincaVerificationReviewState> {
  const adminId = await getActiveAdminId();

  if (!adminId) {
    return { error: "No tienes autorización para revisar verificaciones." };
  }

  const requestId = formData.get("requestId");
  if (typeof requestId !== "string" || !isUuid(requestId.trim())) {
    return { error: "La solicitud seleccionada no es válida." };
  }

  let rejectionReason: string | null = null;
  if (decision === "REJECTED") {
    const reasonValue = formData.get("rejectionReason");
    if (typeof reasonValue !== "string") {
      return { error: "Ingresa el motivo del rechazo." };
    }

    rejectionReason = reasonValue.trim();
    if (!rejectionReason) {
      return { error: "Ingresa el motivo del rechazo." };
    }

    if (rejectionReason.length > 1000) {
      return { error: "El motivo no puede superar 1000 caracteres." };
    }
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const request = await transaction.fincaVerification.findUnique({
          where: { id: requestId.trim() },
          select: {
            id: true,
            fincaId: true,
            requestedById: true,
            status: true,
          },
        });

        if (!request) {
          throw new Error("VERIFICATION_NOT_FOUND");
        }

        if (request.status !== "PENDING") {
          throw new Error("VERIFICATION_ALREADY_REVIEWED");
        }

        const finca = await transaction.finca.findUnique({
          where: { id: request.fincaId },
          select: { id: true, ownerId: true },
        });

        if (!finca) {
          throw new Error("FINCA_NOT_FOUND");
        }

        if (finca.ownerId !== request.requestedById) {
          throw new Error("VERIFICATION_REQUESTER_MISMATCH");
        }

        const updated = await transaction.fincaVerification.updateMany({
          where: {
            id: request.id,
            status: "PENDING",
          },
          data: {
            status: decision,
            reviewedById: adminId,
            reviewedAt: new Date(),
            rejectionReason,
          },
        });

        if (updated.count !== 1) {
          throw new Error("VERIFICATION_ALREADY_REVIEWED");
        }

        if (decision === "VERIFIED") {
          await transaction.finca.update({
            where: { id: finca.id },
            data: { status: "VERIFIED" },
            select: { id: true },
          });
        }

        await createNotification(transaction, {
          userId: request.requestedById,
          type:
            decision === "VERIFIED"
              ? "FINCA_VERIFICATION_APPROVED"
              : "FINCA_VERIFICATION_REJECTED",
          title:
            decision === "VERIFIED"
              ? "Finca verificada"
              : "Solicitud de verificación revisada",
          message:
            decision === "VERIFIED"
              ? "AgroMarketNIC aprobó la verificación interna de tu finca."
              : "Tu solicitud de verificación de finca fue rechazada. Revisa el motivo y vuelve a solicitar cuando corresponda.",
          href: "/dashboard/finca",
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "VERIFICATION_NOT_FOUND") {
        return { error: "La solicitud ya no está disponible." };
      }

      if (error.message === "VERIFICATION_ALREADY_REVIEWED") {
        return { error: "Esta solicitud ya fue revisada." };
      }

      if (error.message === "FINCA_NOT_FOUND") {
        return { error: "La finca asociada a la solicitud ya no existe." };
      }

      if (error.message === "VERIFICATION_REQUESTER_MISMATCH") {
        return {
          error: "La solicitud no corresponde al propietario de la finca.",
        };
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return { error: "La solicitud cambió durante la revisión. Actualiza la página." };
    }

    throw error;
  }

  revalidatePath("/admin/fincas");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finca");
  revalidatePath("/notificaciones");
  return {
    success:
      decision === "VERIFIED"
        ? "La finca fue verificada."
        : "La solicitud fue rechazada.",
  };
}

export async function approveFincaVerification(
  _previousState: FincaVerificationReviewState,
  formData: FormData,
): Promise<FincaVerificationReviewState> {
  return reviewFincaVerification(formData, "VERIFIED");
}

export async function rejectFincaVerification(
  _previousState: FincaVerificationReviewState,
  formData: FormData,
): Promise<FincaVerificationReviewState> {
  return reviewFincaVerification(formData, "REJECTED");
}
