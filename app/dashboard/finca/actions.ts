"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export type FincaFormState = {
  error?: string;
};

function readOptionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function createFinca(
  _previousState: FincaFormState,
  formData: FormData,
): Promise<FincaFormState> {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.FARMER)
  ) {
    return { error: "No tienes permisos para registrar una finca." };
  }

  const name = formData.get("name");
  const description = readOptionalText(formData.get("description"));
  const address = readOptionalText(formData.get("address"));
  const departmentId = formData.get("departmentId");
  const municipalityId = formData.get("municipalityId");

  if (typeof name !== "string" || name.trim().length < 2) {
    return { error: "Ingresa un nombre de finca válido." };
  }

  const normalizedName = name.trim();
  if (normalizedName.length > 120) {
    return { error: "El nombre de la finca no puede superar 120 caracteres." };
  }

  if (description && description.length > 2000) {
    return { error: "La descripción no puede superar 2000 caracteres." };
  }

  if (address && address.length > 250) {
    return { error: "La dirección no puede superar 250 caracteres." };
  }

  if (typeof departmentId !== "string" || !departmentId) {
    return { error: "Selecciona un departamento." };
  }

  if (typeof municipalityId !== "string" || !municipalityId) {
    return { error: "Selecciona un municipio." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const municipality = await transaction.municipality.findFirst({
        where: {
          id: municipalityId,
          departmentId,
        },
        select: { id: true },
      });

      if (!municipality) {
        throw new Error("INVALID_MUNICIPALITY");
      }

      const duplicate = await transaction.finca.findFirst({
        where: {
          ownerId: session.user.id,
          departmentId,
          municipalityId,
          name: normalizedName,
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new Error("DUPLICATE_FINCA");
      }

      await transaction.finca.create({
        data: {
          ownerId: session.user.id,
          departmentId,
          municipalityId,
          name: normalizedName,
          description,
          address,
        },
        select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MUNICIPALITY") {
      return {
        error: "El municipio seleccionado no pertenece al departamento indicado.",
      };
    }

    if (error instanceof Error && error.message === "DUPLICATE_FINCA") {
      return { error: "Ya tienes una finca con esos mismos datos." };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "No se pudo registrar la finca con esos datos." };
    }

    return { error: "Ocurrió un error inesperado. Intenta nuevamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finca");
  redirect("/dashboard/finca");
}
