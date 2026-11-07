"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { isSupportedAnimalCategorySlug } from "@/lib/animal-categories";
import { prisma } from "@/lib/prisma";

export type AnimalFormState = {
  error?: string;
};

const animalTypes = ["INDIVIDUAL", "LOT"] as const;
const animalSexes = ["MALE", "FEMALE", "MIXED", "UNKNOWN"] as const;

function readOptionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseDecimal(
  value: FormDataEntryValue | null,
  label: string,
  options: { required?: boolean; maximum?: number } = {},
) {
  if (typeof value !== "string" || !value.trim()) {
    return options.required
      ? { error: `${label} es obligatorio.` }
      : { value: null };
  }

  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { error: `${label} debe ser un número válido.` };
  }

  const decimal = new Prisma.Decimal(normalized);
  if (decimal.isNegative()) {
    return { error: `${label} no puede ser negativo.` };
  }

  if (options.maximum !== undefined && decimal.gt(options.maximum)) {
    return { error: `${label} supera el límite permitido.` };
  }

  return { value: decimal };
}

function parseNonNegativeInteger(
  value: FormDataEntryValue | null,
  label: string,
  defaultValue?: number,
) {
  if (typeof value !== "string" || !value.trim()) {
    return defaultValue === undefined
      ? { error: `${label} es obligatorio.` }
      : { value: defaultValue };
  }

  if (!/^\d+$/.test(value.trim())) {
    return { error: `${label} debe ser un número entero válido.` };
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed)
    ? { value: parsed }
    : { error: `${label} no es válido.` };
}

export async function createAnimal(
  _previousState: AnimalFormState,
  formData: FormData,
): Promise<AnimalFormState> {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.FARMER)
  ) {
    return { error: "No tienes permisos para publicar animales." };
  }

  const fincaId = formData.get("fincaId");
  const categoryId = formData.get("categoryId");
  const name = readOptionalText(formData.get("name"));
  const identifier = readOptionalText(formData.get("identifier"));
  const type = formData.get("type");
  const sex = formData.get("sex");
  const breed = readOptionalText(formData.get("breed"));
  const description = readOptionalText(formData.get("description"));
  const currency = formData.get("currency");

  if (typeof fincaId !== "string" || !fincaId) {
    return { error: "Selecciona una finca." };
  }

  if (typeof categoryId !== "string" || !categoryId) {
    return { error: "Selecciona una categoría." };
  }

  if (name && name.length > 120) {
    return { error: "El nombre no puede superar 120 caracteres." };
  }

  if (identifier && identifier.length > 120) {
    return { error: "El identificador no puede superar 120 caracteres." };
  }

  if (breed && breed.length > 120) {
    return { error: "La raza no puede superar 120 caracteres." };
  }

  if (description && description.length > 2000) {
    return { error: "La descripción no puede superar 2000 caracteres." };
  }

  if (
    typeof type !== "string" ||
    !animalTypes.includes(type as (typeof animalTypes)[number])
  ) {
    return { error: "Selecciona un tipo de animal válido." };
  }

  if (
    typeof sex !== "string" ||
    !animalSexes.includes(sex as (typeof animalSexes)[number])
  ) {
    return { error: "Selecciona un sexo válido." };
  }

  if (currency !== "NIO") {
    return { error: "La moneda seleccionada no es válida." };
  }

  const age = parseNonNegativeInteger(
    formData.get("approximateAgeMonths"),
    "La edad",
    0,
  );
  if (age.error || age.value === undefined) {
    return { error: age.error ?? "La edad no es válida." };
  }

  const quantity = parseNonNegativeInteger(
    formData.get("quantity"),
    "La cantidad",
    1,
  );
  if (quantity.error || !quantity.value || quantity.value < 1) {
    return { error: quantity.error ?? "La cantidad debe ser positiva." };
  }

  const price = parseDecimal(formData.get("price"), "El precio", {
    required: true,
    maximum: 9999999999.99,
  });
  if (price.error || !price.value) {
    return { error: price.error ?? "El precio no es válido." };
  }

  const weight = parseDecimal(formData.get("weightKg"), "El peso", {
    maximum: 99999999.99,
  });
  if (weight.error) {
    return { error: weight.error };
  }

  let createdAnimal: { id: string };

  try {
    createdAnimal = await prisma.$transaction(async (transaction) => {
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

      const category = await transaction.category.findFirst({
        where: {
          id: categoryId,
          isActive: true,
        },
        select: { id: true, slug: true },
      });

      if (!category || !isSupportedAnimalCategorySlug(category.slug)) {
        throw new Error("INVALID_CATEGORY");
      }

      return transaction.animal.create({
        data: {
          fincaId: finca.id,
          categoryId: category.id,
          name,
          identifier,
          type: type as (typeof animalTypes)[number],
          sex: sex as (typeof animalSexes)[number],
          breed,
          approximateAgeMonths: age.value,
          weightKg: weight.value,
          quantity: quantity.value,
          price: price.value,
          currency: "NIO",
          description,
        },
        select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_FINCA") {
      return { error: "La finca seleccionada no te pertenece." };
    }

    if (error instanceof Error && error.message === "INVALID_CATEGORY") {
      return { error: "La categoría seleccionada no está disponible." };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Ya existe un animal con ese identificador en la finca seleccionada.",
      };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2025" || error.code === "P2003")
    ) {
      return {
        error: "La finca o categoría seleccionada no es válida.",
      };
    }

    return { error: "No se pudo publicar el animal. Intenta nuevamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/animales");
  revalidatePath("/catalogo");
  revalidatePath("/");
  redirect(
    `/dashboard/animales/${createdAnimal.id}/editar?seccion=fotografias&nuevo=1#fotografias`,
  );
}
