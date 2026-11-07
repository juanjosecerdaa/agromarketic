"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export type ReservationDecisionState = {
  error?: string;
};

async function authorizeFarmer(reservationIdValue: FormDataEntryValue | null) {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    return { error: "No tienes permiso para gestionar esta solicitud." } as const;
  }

  if (!session.user.roles.includes(ROLES.FARMER)) {
    return { error: "No tienes permiso para gestionar esta solicitud." } as const;
  }

  if (
    typeof reservationIdValue !== "string" ||
    !reservationIdValue.trim()
  ) {
    return { error: "La solicitud seleccionada no es válida." } as const;
  }

  return { session, reservationId: reservationIdValue.trim() } as const;
}

function revalidateReservationPaths(animalIds: string[]) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reservas");
  revalidatePath("/reservas");
  revalidatePath("/catalogo");

  for (const animalId of animalIds) {
    revalidatePath(`/animal/${animalId}`);
  }
}

export async function acceptReservation(
  _previousState: ReservationDecisionState,
  formData: FormData,
): Promise<ReservationDecisionState> {
  const authorization = await authorizeFarmer(formData.get("reservationId"));

  if ("error" in authorization) {
    return authorization;
  }

  try {
    const animalIds = await prisma.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.findFirst({
        where: {
          id: authorization.reservationId,
          sellerId: authorization.session.user.id,
          status: "PENDING",
        },
        select: {
          id: true,
          buyerId: true,
          items: {
            select: {
              animalId: true,
              animal: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!reservation) {
        throw new Error("NOT_PENDING_OR_FORBIDDEN");
      }

      if (
        reservation.items.length === 0 ||
        reservation.items.some((item) => item.animal.status !== "AVAILABLE")
      ) {
        throw new Error("ANIMAL_UNAVAILABLE");
      }

      const ids = reservation.items.map((item) => item.animalId);
      const updatedAnimals = await transaction.animal.updateMany({
        where: {
          id: { in: ids },
          status: "AVAILABLE",
        },
        data: { status: "RESERVED" },
      });

      if (updatedAnimals.count !== ids.length) {
        throw new Error("ANIMAL_UNAVAILABLE");
      }

      await transaction.reservation.update({
        where: { id: reservation.id },
        data: { status: "CONFIRMED" },
      });
      await createNotification(transaction, {
        userId: reservation.buyerId,
        type: "RESERVATION_CONFIRMED",
        title: "Reserva confirmada",
        message: "Tu solicitud de reserva fue confirmada.",
        href: "/reservas",
      });

      return ids;
    });

    revalidateReservationPaths(animalIds);
    return {};
  } catch (error) {
    if (error instanceof Error && error.message === "ANIMAL_UNAVAILABLE") {
      return {
        error: "El animal ya no está disponible para reserva.",
      };
    }

    if (
      error instanceof Error &&
      error.message === "NOT_PENDING_OR_FORBIDDEN"
    ) {
      return {
        error: "La solicitud ya no está pendiente.",
      };
    }

    return { error: "No se pudo aceptar la solicitud. Intenta nuevamente." };
  }
}

export async function rejectReservation(
  _previousState: ReservationDecisionState,
  formData: FormData,
): Promise<ReservationDecisionState> {
  const authorization = await authorizeFarmer(formData.get("reservationId"));

  if ("error" in authorization) {
    return authorization;
  }

  try {
    const reservation = await prisma.$transaction(async (transaction) => {
      const current = await transaction.reservation.findFirst({
        where: {
          id: authorization.reservationId,
          sellerId: authorization.session.user.id,
          status: "PENDING",
        },
        select: {
          id: true,
          buyerId: true,
          items: { select: { animalId: true } },
        },
      });

      if (!current) {
        throw new Error("NOT_PENDING_OR_FORBIDDEN");
      }

      const updated = await transaction.reservation.updateMany({
        where: {
          id: current.id,
          sellerId: authorization.session.user.id,
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      });

      if (updated.count !== 1) {
        throw new Error("NOT_PENDING_OR_FORBIDDEN");
      }

      await createNotification(transaction, {
        userId: current.buyerId,
        type: "RESERVATION_REJECTED",
        title: "Reserva rechazada",
        message: "Tu solicitud de reserva fue rechazada.",
        href: "/reservas",
      });

      return current;
    });

    revalidatePath("/dashboard/reservas");
    revalidatePath("/reservas");
    revalidatePath("/catalogo");
    for (const item of reservation.items) {
      revalidatePath(`/animal/${item.animalId}`);
    }
    return {};
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "NOT_PENDING_OR_FORBIDDEN"
    ) {
      return { error: "La solicitud ya no está pendiente." };
    }
    return { error: "No se pudo rechazar la solicitud. Intenta nuevamente." };
  }
}

export async function completeReservation(
  _previousState: ReservationDecisionState,
  formData: FormData,
): Promise<ReservationDecisionState> {
  const authorization = await authorizeFarmer(formData.get("reservationId"));

  if ("error" in authorization) {
    return authorization;
  }

  try {
    const animalIds = await prisma.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.findFirst({
        where: {
          id: authorization.reservationId,
          sellerId: authorization.session.user.id,
          status: "CONFIRMED",
        },
        select: {
          id: true,
          buyerId: true,
          items: {
            select: {
              animalId: true,
              animal: { select: { status: true } },
            },
          },
        },
      });

      if (!reservation) {
        throw new Error("NOT_CONFIRMED_OR_FORBIDDEN");
      }

      if (
        reservation.items.length === 0 ||
        reservation.items.some((item) => item.animal.status !== "RESERVED")
      ) {
        throw new Error("ANIMAL_STATE_CHANGED");
      }

      const ids = reservation.items.map((item) => item.animalId);
      const updatedAnimals = await transaction.animal.updateMany({
        where: {
          id: { in: ids },
          status: "RESERVED",
        },
        data: { status: "SOLD" },
      });

      if (updatedAnimals.count !== ids.length) {
        throw new Error("ANIMAL_STATE_CHANGED");
      }

      await transaction.reservation.update({
        where: { id: reservation.id },
        data: { status: "COMPLETED" },
      });
      await createNotification(transaction, {
        userId: reservation.buyerId,
        type: "RESERVATION_COMPLETED",
        title: "Reserva completada",
        message: "Tu reserva fue completada.",
        href: "/reservas",
      });

      return ids;
    });

    revalidateReservationPaths(animalIds);
    revalidatePath("/dashboard/animales");
    return {};
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "NOT_CONFIRMED_OR_FORBIDDEN"
    ) {
      return { error: "La reserva ya no está confirmada." };
    }

    if (error instanceof Error && error.message === "ANIMAL_STATE_CHANGED") {
      return {
        error: "La reserva ya no puede completarse porque el estado del animal cambió.",
      };
    }

    return { error: "No se pudo completar la reserva. Intenta nuevamente." };
  }
}

export async function cancelReservation(
  _previousState: ReservationDecisionState,
  formData: FormData,
): Promise<ReservationDecisionState> {
  const authorization = await authorizeFarmer(formData.get("reservationId"));

  if ("error" in authorization) {
    return authorization;
  }

  try {
    const animalIds = await prisma.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.findFirst({
        where: {
          id: authorization.reservationId,
          sellerId: authorization.session.user.id,
          status: "CONFIRMED",
        },
        select: {
          id: true,
          buyerId: true,
          items: { select: { animalId: true } },
        },
      });

      if (!reservation) {
        throw new Error("NOT_CONFIRMED_OR_FORBIDDEN");
      }

      const ids = reservation.items.map((item) => item.animalId);

      if (ids.length > 0) {
        await transaction.animal.updateMany({
          where: {
            id: { in: ids },
            status: "RESERVED",
          },
          data: { status: "AVAILABLE" },
        });
      }

      await transaction.reservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELLED" },
      });
      await createNotification(transaction, {
        userId: reservation.buyerId,
        type: "RESERVATION_CANCELLED",
        title: "Reserva cancelada",
        message: "Tu reserva confirmada fue cancelada.",
        href: "/reservas",
      });

      return ids;
    });

    revalidateReservationPaths(animalIds);
    revalidatePath("/dashboard/animales");
    return {};
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "NOT_CONFIRMED_OR_FORBIDDEN"
    ) {
      return { error: "La reserva ya no está confirmada." };
    }

    return { error: "No se pudo cancelar la reserva. Intenta nuevamente." };
  }
}
