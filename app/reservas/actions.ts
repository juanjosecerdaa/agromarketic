"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export type ReservationFormState = {
  error?: string;
};

export async function createReservation(
  _previousState: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const animalId = formData.get("animalId");
  const messageValue = formData.get("message");
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect(
      typeof animalId === "string" && animalId
        ? `/login?callbackUrl=/animal/${animalId}`
        : "/login?callbackUrl=/reservas",
    );
  }

  if (!session.user.roles.includes(ROLES.BUYER)) {
    redirect(
      session.user.roles.includes(ROLES.ADMIN) ? "/admin" : "/dashboard",
    );
  }

  if (typeof animalId !== "string" || !animalId) {
    return { error: "La publicación seleccionada no es válida." };
  }

  const message =
    typeof messageValue === "string" && messageValue.trim()
      ? messageValue.trim()
      : null;

  if (message && message.length > 1000) {
    return { error: "La nota no puede superar 1000 caracteres." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const animal = await transaction.animal.findUnique({
        where: { id: animalId },
        select: {
          id: true,
          status: true,
          price: true,
          currency: true,
          finca: {
            select: {
              ownerId: true,
            },
          },
        },
      });

      if (!animal) {
        throw new Error("INVALID_ANIMAL");
      }

      if (animal.finca.ownerId === session.user.id) {
        throw new Error("OWN_ANIMAL");
      }

      if (animal.status !== "AVAILABLE") {
        throw new Error("ANIMAL_UNAVAILABLE");
      }

      const duplicate = await transaction.reservation.findFirst({
        where: {
          buyerId: session.user.id,
          sellerId: animal.finca.ownerId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          items: {
            some: {
              animalId: animal.id,
            },
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new Error("DUPLICATE_RESERVATION");
      }

      const reservation = await transaction.reservation.create({
        data: {
          buyerId: session.user.id,
          sellerId: animal.finca.ownerId,
          status: "PENDING",
          message,
          totalAmount: animal.price,
          currency: animal.currency,
          items: {
            create: {
              animalId: animal.id,
              quantity: 1,
              unitPrice: animal.price,
            },
          },
        },
        select: { id: true },
      });

      await createNotification(transaction, {
        userId: animal.finca.ownerId,
        type: "RESERVATION_REQUEST",
        title: "Nueva solicitud de reserva",
        message: "Recibiste una nueva solicitud de reserva.",
        href: "/dashboard/reservas",
      });

      return reservation;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { error: "No se pudo registrar la solicitud. Intenta nuevamente." };
    }

    if (error instanceof Error && error.message === "INVALID_ANIMAL") {
      return { error: "La publicación no está disponible." };
    }

    if (error instanceof Error && error.message === "OWN_ANIMAL") {
      return { error: "No puedes reservar una publicación propia." };
    }

    if (error instanceof Error && error.message === "ANIMAL_UNAVAILABLE") {
      return { error: "Este animal ya no está disponible para reserva." };
    }

    if (error instanceof Error && error.message === "DUPLICATE_RESERVATION") {
      return {
        error: "Ya tienes una solicitud activa para este animal.",
      };
    }

    return { error: "No se pudo registrar la solicitud. Intenta nuevamente." };
  }

  revalidatePath("/reservas");
  revalidatePath(`/animal/${animalId}`);
  redirect("/reservas?created=1");
}
