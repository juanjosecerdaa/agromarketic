"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export type EditFincaFormState = {
  error?: string;
};

function readOptionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function updateFinca(
  _previousState: EditFincaFormState,
  formData: FormData,
): Promise<EditFincaFormState> {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.FARMER)
  ) {
    return { error: "No tienes permisos para editar esta finca." };
  }

  const fincaId = formData.get("fincaId");
  const name = formData.get("name");
  const description = readOptionalText(formData.get("description"));
  const address = readOptionalText(formData.get("address"));
  const departmentId = formData.get("departmentId");
  const municipalityId = formData.get("municipalityId");

  if (typeof fincaId !== "string" || !fincaId) {
    return { error: "La finca seleccionada no es válida." };
  }

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
      const finca = await transaction.finca.findFirst({
        where: {
          id: fincaId,
          ownerId: session.user.id,
        },
        select: { id: true },
      });

      if (!finca) {
        throw new Error("INVALID_FINCA");
      }

      const department = await transaction.department.findUnique({
        where: { id: departmentId },
        select: { id: true },
      });

      if (!department) {
        throw new Error("INVALID_DEPARTMENT");
      }

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

      await transaction.finca.update({
        where: { id: finca.id },
        data: {
          name: normalizedName,
          description,
          address,
          departmentId,
          municipalityId,
        },
        select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_FINCA") {
      return { error: "La finca seleccionada no está disponible." };
    }

    if (
      error instanceof Error &&
      (error.message === "INVALID_DEPARTMENT" ||
        error.message === "INVALID_MUNICIPALITY")
    ) {
      return {
        error: "El municipio seleccionado no pertenece al departamento indicado.",
      };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2025" || error.code === "P2003")
    ) {
      return { error: "No se pudo actualizar la finca con esos datos." };
    }

    return { error: "No se pudo actualizar la finca. Intenta nuevamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finca");
  revalidatePath("/dashboard/animales");
  revalidatePath("/catalogo");
  redirect("/dashboard/finca");
}
