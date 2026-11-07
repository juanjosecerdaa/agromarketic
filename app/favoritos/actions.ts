"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function requireBuyer() {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.BUYER)
  ) {
    return null;
  }

  return session.user.id;
}

export async function addFavorite(formData: FormData) {
  const animalId = formData.get("animalId");

  if (typeof animalId !== "string" || !isUuid(animalId)) {
    return;
  }

  const userId = await requireBuyer();
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/animal/${animalId}`)}`);
  }

  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    select: { id: true, status: true },
  });

  if (!animal || animal.status === "INACTIVE") {
    return;
  }

  try {
    await prisma.favorite.create({
      data: { userId, animalId: animal.id },
    });
  } catch (error) {
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
    ) {
      throw error;
    }
  }

  revalidatePath("/favoritos");
  revalidatePath("/catalogo");
  revalidatePath(`/animal/${animalId}`);
  revalidatePath("/");
}

export async function removeFavorite(formData: FormData) {
  const animalId = formData.get("animalId");

  if (typeof animalId !== "string" || !isUuid(animalId)) {
    return;
  }

  const userId = await requireBuyer();
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/animal/${animalId}`)}`);
  }

  await prisma.favorite.deleteMany({
    where: { userId, animalId },
  });

  revalidatePath("/favoritos");
  revalidatePath("/catalogo");
  revalidatePath(`/animal/${animalId}`);
  revalidatePath("/");
}
