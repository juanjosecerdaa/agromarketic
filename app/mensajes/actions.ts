"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export type MessageFormState = {
  error?: string;
};

export async function markConversationAsRead(conversationId: string) {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    return;
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { buyerId: session.user.id },
        { sellerId: session.user.id },
      ],
    },
    select: { id: true },
  });

  if (!conversation) {
    return;
  }

  await prisma.message.updateMany({
    where: {
      conversationId: conversation.id,
      recipientId: session.user.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/mensajes");
  revalidatePath(`/mensajes/${conversation.id}`);
  revalidatePath("/dashboard");
}

function getCallbackPath(value: string) {
  return `/animal/${value}`;
}

export async function startConversation(formData: FormData) {
  const animalId = formData.get("animalId");
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect(
      typeof animalId === "string" && animalId
        ? `/login?callbackUrl=${getCallbackPath(animalId)}`
        : "/login?callbackUrl=/mensajes",
    );
  }

  if (!session.user.roles.includes(ROLES.BUYER)) {
    redirect(
      session.user.roles.includes(ROLES.ADMIN) ? "/admin" : "/catalogo",
    );
  }

  if (typeof animalId !== "string" || !animalId) {
    redirect("/catalogo");
  }

  const animal = await prisma.animal.findFirst({
    where: {
      id: animalId,
      status: { not: "INACTIVE" },
    },
    select: {
      id: true,
      finca: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!animal || animal.finca.ownerId === session.user.id) {
    redirect(`/animal/${animalId}`);
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      buyerId: session.user.id,
      sellerId: animal.finca.ownerId,
      animalId: animal.id,
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });

  const conversation = existing ?? await prisma.conversation.create({
    data: {
      buyerId: session.user.id,
      sellerId: animal.finca.ownerId,
      animalId: animal.id,
    },
    select: { id: true },
  });

  redirect(`/mensajes/${conversation.id}`);
}

export async function sendMessage(
  _previousState: MessageFormState,
  formData: FormData,
): Promise<MessageFormState> {
  const conversationId = formData.get("conversationId");
  const contentValue = formData.get("content");
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    (!session.user.roles.includes(ROLES.BUYER) &&
      !session.user.roles.includes(ROLES.FARMER))
  ) {
    return { error: "No tienes permisos para enviar mensajes." };
  }

  if (typeof conversationId !== "string" || !conversationId) {
    return { error: "La conversación no es válida." };
  }

  if (typeof contentValue !== "string" || !contentValue.trim()) {
    return { error: "Escribe un mensaje antes de enviarlo." };
  }

  const content = contentValue.trim();
  if (content.length > 2000) {
    return { error: "El mensaje no puede superar 2000 caracteres." };
  }

  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { buyerId: session.user.id },
          { sellerId: session.user.id },
        ],
      },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
      },
    });

    if (!conversation) {
      return { error: "La conversación no está disponible." };
    }

    if (conversation.status !== "OPEN") {
      return { error: "Esta conversación no está abierta para nuevos mensajes." };
    }

    const recipientId =
      conversation.buyerId === session.user.id
        ? conversation.sellerId
        : conversation.buyerId;

    await prisma.$transaction(async (transaction) => {
      await transaction.message.create({
        data: {
          conversationId: conversation.id,
          senderId: session.user.id,
          recipientId,
          type: "TEXT",
          content,
        },
        select: { id: true },
      });
      await createNotification(transaction, {
        userId: recipientId,
        type: "MESSAGE",
        title: "Nuevo mensaje",
        message: "Tienes un nuevo mensaje.",
        href: `/mensajes/${conversation.id}`,
      });
      await transaction.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
        select: { id: true },
      });
    });

    revalidatePath("/mensajes");
    revalidatePath(`/mensajes/${conversation.id}`);
    revalidatePath("/dashboard");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { error: "No se pudo enviar el mensaje. Intenta nuevamente." };
    }

    return { error: "No se pudo enviar el mensaje. Intenta nuevamente." };
  }

  return {};
}
