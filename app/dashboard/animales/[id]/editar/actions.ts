"use server";

import { Prisma } from "@prisma/client";
import {
  deleteFile,
  RestClientError,
  UploadcareAuthSchema,
} from "@uploadcare/rest-client/node";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export type EditAnimalFormState = {
  error?: string;
  success?: string;
};

export type AnimalImageState = {
  error?: string;
  success?: string;
};

function revalidateAnimalImagePaths(animalId: string, fincaId: string) {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/animales");
  revalidatePath(`/dashboard/animales/${animalId}/editar`);
  revalidatePath("/catalogo");
  revalidatePath(`/animal/${animalId}`);
  revalidatePath(`/finca/${fincaId}`);
  revalidatePath("/admin/animales");
}

const animalTypes = ["INDIVIDUAL", "LOT"] as const;
const animalSexes = ["MALE", "FEMALE", "MIXED", "UNKNOWN"] as const;

function readOptionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseDecimal(
  value: FormDataEntryValue | null,
  label: string,
  options: { required?: boolean; maximum?: number; positive?: boolean } = {},
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
  if (decimal.isNegative() || (options.positive && decimal.isZero())) {
    return { error: `${label} debe ser mayor que cero.` };
  }

  if (options.maximum !== undefined && decimal.gt(options.maximum)) {
    return { error: `${label} supera el límite permitido.` };
  }

  return { value: decimal };
}

function parseNonNegativeInteger(value: FormDataEntryValue | null, label: string) {
  if (typeof value !== "string" || !value.trim() || !/^\d+$/.test(value.trim())) {
    return { error: `${label} debe ser un número entero válido.` };
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed)
    ? { value: parsed }
    : { error: `${label} no es válido.` };
}

export async function updateAnimal(
  _previousState: EditAnimalFormState,
  formData: FormData,
): Promise<EditAnimalFormState> {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.FARMER)
  ) {
    return { error: "No tienes permisos para editar animales." };
  }

  const animalId = formData.get("animalId");
  const fincaId = formData.get("fincaId");
  const categoryId = formData.get("categoryId");
  const name = readOptionalText(formData.get("name"));
  const identifier = readOptionalText(formData.get("identifier"));
  const type = formData.get("type");
  const sex = formData.get("sex");
  const breed = readOptionalText(formData.get("breed"));
  const description = readOptionalText(formData.get("description"));
  const currency = formData.get("currency");
  if (typeof animalId !== "string" || !animalId) {
    return { error: "La publicación no es válida." };
  }

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
  );
  if (age.error || age.value === undefined) {
    return { error: age.error ?? "La edad no es válida." };
  }

  const quantity = parseNonNegativeInteger(
    formData.get("quantity"),
    "La cantidad",
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
    positive: true,
  });
  if (weight.error) {
    return { error: weight.error };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const animal = await transaction.animal.findFirst({
        where: {
          id: animalId,
          finca: {
            ownerId: session.user.id,
          },
        },
        select: { id: true },
      });

      if (!animal) {
        throw new Error("INVALID_ANIMAL");
      }

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
        select: { id: true },
      });

      if (!category) {
        throw new Error("INVALID_CATEGORY");
      }

      await transaction.animal.update({
        where: { id: animal.id },
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
    if (error instanceof Error && error.message === "INVALID_ANIMAL") {
      return { error: "La publicación no está disponible." };
    }

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
        error: "Ya existe otro animal con ese identificador en la finca seleccionada.",
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

    return { error: "No se pudo actualizar el animal. Intenta nuevamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/animales");
  revalidatePath("/catalogo");
  revalidatePath(`/animal/${animalId}`);
  redirect("/dashboard/animales");
}

type StatusActionState = {
  error?: string;
  success?: string;
};

async function authorizeStatusAction(formData: FormData) {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.FARMER)
  ) {
    return { error: "No tienes permisos para cambiar este estado." } as const;
  }

  const animalId = formData.get("animalId");
  if (typeof animalId !== "string" || !animalId.trim()) {
    return { error: "La publicación no es válida." } as const;
  }

  return { animalId: animalId.trim(), session } as const;
}

async function hasConfirmedReservation(
  transaction: Prisma.TransactionClient,
  animalId: string,
) {
  return transaction.reservation.findFirst({
    where: {
      status: "CONFIRMED",
      items: {
        some: { animalId },
      },
    },
    select: { id: true },
  });
}

async function changeManualStatus(
  formData: FormData,
  from: "AVAILABLE" | "INACTIVE",
  to: "INACTIVE" | "AVAILABLE",
) {
  const authorization = await authorizeStatusAction(formData);
  if ("error" in authorization) {
    return authorization;
  }

  try {
    const result = await prisma.$transaction(
      async (transaction) => {
      const animal = await transaction.animal.findFirst({
        where: {
          id: authorization.animalId,
          finca: { ownerId: authorization.session.user.id },
        },
        select: { id: true, fincaId: true, status: true },
      });

      if (!animal) {
        throw new Error("INVALID_ANIMAL");
      }

      if (animal.status !== from) {
        throw new Error("UNEXPECTED_STATUS");
      }

      if (await hasConfirmedReservation(transaction, animal.id)) {
        throw new Error("CONFIRMED_RESERVATION");
      }

      const updated = await transaction.animal.updateMany({
        where: {
          id: animal.id,
          status: from,
          finca: { ownerId: authorization.session.user.id },
        },
        data: { status: to },
      });

      if (updated.count !== 1) {
        throw new Error("UNEXPECTED_STATUS");
      }

        return { animalId: animal.id, fincaId: animal.fincaId };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/animales");
    revalidatePath("/catalogo");
    revalidatePath(`/animal/${result.animalId}`);
    revalidatePath(`/finca/${result.fincaId}`);

    return {
      success:
        to === "INACTIVE"
          ? "La publicación fue desactivada."
          : "La publicación volvió a estar disponible.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ANIMAL") {
      return { error: "La publicación no está disponible." };
    }

    if (error instanceof Error && error.message === "CONFIRMED_RESERVATION") {
      return { error: "No puedes cambiar un animal con una reserva confirmada." };
    }

    if (error instanceof Error && error.message === "UNEXPECTED_STATUS") {
      return { error: "La publicación ya no se encuentra en el estado esperado." };
    }

    return { error: "No se pudo cambiar el estado. Intenta nuevamente." };
  }
}

export async function deactivateAnimal(
  _previousState: StatusActionState,
  formData: FormData,
): Promise<StatusActionState> {
  return changeManualStatus(formData, "AVAILABLE", "INACTIVE");
}

export async function reactivateAnimal(
  _previousState: StatusActionState,
  formData: FormData,
): Promise<StatusActionState> {
  return changeManualStatus(formData, "INACTIVE", "AVAILABLE");
}

const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const maximumImageSize = 5 * 1024 * 1024;
const maximumAnimalImages = 6;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isUploadcareCdnUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isOfficialHost =
      hostname.endsWith(".ucarecd.net") ||
      hostname === "ucarecd.net" ||
      hostname.endsWith(".ucarecdn.com") ||
      hostname === "ucarecdn.com";

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      isOfficialHost
    );
  } catch {
    return false;
  }
}

export async function registerAnimalImage(
  _previousState: AnimalImageState,
  formData: FormData,
): Promise<AnimalImageState> {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.FARMER)
  ) {
    return { error: "No tienes permiso para modificar esta publicación." };
  }

  const animalId = formData.get("animalId");
  const publicId = formData.get("publicId");
  const url = formData.get("url");
  const mimeType = formData.get("mimeType");
  const sizeValue = formData.get("size");

  if (
    typeof animalId !== "string" ||
    !isUuid(animalId.trim()) ||
    typeof publicId !== "string" ||
    !isUuid(publicId.trim()) ||
    typeof url !== "string" ||
    !isUploadcareCdnUrl(url.trim())
  ) {
    return { error: "La fotografía subida no es válida." };
  }

  if (
    typeof mimeType !== "string" ||
    !allowedImageMimeTypes.has(mimeType)
  ) {
    return { error: "El archivo no es una imagen admitida." };
  }

  const size = Number(sizeValue);
  if (!Number.isSafeInteger(size) || size <= 0 || size > maximumImageSize) {
    return { error: "El archivo supera el tamaño máximo permitido." };
  }

  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        const animal = await transaction.animal.findFirst({
          where: {
            id: animalId.trim(),
            finca: { ownerId: session.user.id },
          },
          select: { id: true, fincaId: true },
        });

        if (!animal) {
          throw new Error("INVALID_ANIMAL");
        }

        const existingImages = await transaction.image.findMany({
          where: { animalId: animal.id },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });

        if (existingImages.length >= maximumAnimalImages) {
          throw new Error("IMAGE_LIMIT");
        }

        const duplicate = await transaction.image.findUnique({
          where: { publicId: publicId.trim() },
          select: { id: true },
        });

        if (duplicate) {
          throw new Error("DUPLICATE_IMAGE");
        }

        const image = await transaction.image.create({
          data: {
            animalId: animal.id,
            fincaId: animal.fincaId,
            userId: session.user.id,
            publicId: publicId.trim(),
            url: url.trim(),
            type: existingImages.length === 0 ? "PRIMARY" : "GALLERY",
            sortOrder: existingImages.length,
          },
          select: { id: true },
        });

        return { animalId: animal.id, fincaId: animal.fincaId, imageId: image.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    revalidateAnimalImagePaths(result.animalId, result.fincaId);

    return { success: "La fotografía se registró correctamente." };
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ANIMAL") {
      return { error: "No tienes permiso para modificar esta publicación." };
    }

    if (error instanceof Error && error.message === "IMAGE_LIMIT") {
      return { error: "Este animal ya tiene el máximo de 6 fotografías." };
    }

    if (error instanceof Error && error.message === "DUPLICATE_IMAGE") {
      return { error: "La fotografía subida no es válida." };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return { error: "La fotografía no pudo registrarse. Intenta nuevamente." };
    }

    return { error: "No se pudo registrar la fotografía." };
  }
}

function getUploadcareAuth() {
  const publicKey = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY;
  const secretKey = process.env.UPLOADCARE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw new Error("UPLOADCARE_NOT_CONFIGURED");
  }

  return new UploadcareAuthSchema({
    publicKey,
    secretKey,
  });
}

function isUploadcareNotFound(error: unknown) {
  return error instanceof RestClientError && error.status === 404;
}

export async function setPrimaryAnimalImage(
  _previousState: AnimalImageState,
  formData: FormData,
): Promise<AnimalImageState> {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.FARMER)
  ) {
    return { error: "No tienes permiso para modificar esta fotografía." };
  }

  const animalId = formData.get("animalId");
  const imageId = formData.get("imageId");

  if (
    typeof animalId !== "string" ||
    !isUuid(animalId.trim()) ||
    typeof imageId !== "string" ||
    !isUuid(imageId.trim())
  ) {
    return { error: "No se pudo cambiar la imagen principal." };
  }

  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        const animal = await transaction.animal.findFirst({
          where: {
            id: animalId.trim(),
            finca: { ownerId: session.user.id },
          },
          select: {
            id: true,
            fincaId: true,
            images: {
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              select: { id: true },
            },
          },
        });

        if (!animal) {
          throw new Error("INVALID_IMAGE_OWNER");
        }

        if (!animal.images.some((image) => image.id === imageId.trim())) {
          throw new Error("INVALID_IMAGE_OWNER");
        }

        await transaction.image.updateMany({
          where: { animalId: animal.id },
          data: { type: "GALLERY" },
        });

        for (const [index, image] of animal.images.entries()) {
          await transaction.image.update({
            where: { id: image.id },
            data: {
              sortOrder: image.id === imageId.trim() ? 0 : index + 1,
            },
          });
        }

        await transaction.image.update({
          where: { id: imageId.trim() },
          data: { type: "PRIMARY", sortOrder: 0 },
        });

        return { animalId: animal.id, fincaId: animal.fincaId };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    revalidateAnimalImagePaths(result.animalId, result.fincaId);
    return { success: "La imagen principal fue actualizada." };
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_IMAGE_OWNER") {
      return { error: "No tienes permiso para modificar esta fotografía." };
    }

    return { error: "No se pudo cambiar la imagen principal." };
  }
}

export async function deleteAnimalImage(
  _previousState: AnimalImageState,
  formData: FormData,
): Promise<AnimalImageState> {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.FARMER)
  ) {
    return { error: "No tienes permiso para modificar esta fotografía." };
  }

  const animalId = formData.get("animalId");
  const imageId = formData.get("imageId");

  if (
    typeof animalId !== "string" ||
    !isUuid(animalId.trim()) ||
    typeof imageId !== "string" ||
    !isUuid(imageId.trim())
  ) {
    return { error: "No se pudo eliminar la fotografía." };
  }

  let image: {
    id: string;
    publicId: string;
    animalId: string | null;
    fincaId: string | null;
    type: "PRIMARY" | "GALLERY" | "DOCUMENT";
  } | null = null;

  try {
    image = await prisma.image.findFirst({
      where: {
        id: imageId.trim(),
        animalId: animalId.trim(),
        animal: { finca: { ownerId: session.user.id } },
      },
      select: {
        id: true,
        publicId: true,
        animalId: true,
        fincaId: true,
        type: true,
      },
    });
  } catch {
    return { error: "No se pudo eliminar la fotografía." };
  }

  if (!image || !image.animalId || !image.fincaId) {
    return { error: "No tienes permiso para modificar esta fotografía." };
  }

  const imageAnimalId = image.animalId;
  const imageFincaId = image.fincaId;

  try {
    await deleteFile(
      { uuid: image.publicId },
      { authSchema: getUploadcareAuth() },
    );
  } catch (error) {
    if (!isUploadcareNotFound(error)) {
      if (error instanceof Error && error.message === "UPLOADCARE_NOT_CONFIGURED") {
        return { error: "No se pudo eliminar la fotografía." };
      }
      return { error: "No se pudo eliminar la fotografía." };
    }
  }

  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        const currentImage = await transaction.image.findFirst({
          where: {
            id: image.id,
            animalId: imageAnimalId,
            animal: { finca: { ownerId: session.user.id } },
          },
          select: { id: true },
        });

        if (!currentImage) {
          throw new Error("IMAGE_UNAVAILABLE");
        }

        await transaction.image.delete({ where: { id: currentImage.id } });

        const remainingImages = await transaction.image.findMany({
          where: { animalId: imageAnimalId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });

        for (const [index, remainingImage] of remainingImages.entries()) {
          await transaction.image.update({
            where: { id: remainingImage.id },
            data: {
              type: index === 0 ? "PRIMARY" : "GALLERY",
              sortOrder: index,
            },
          });
        }

        return { animalId: imageAnimalId, fincaId: imageFincaId };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    revalidateAnimalImagePaths(result.animalId, result.fincaId);
    return { success: "La fotografía fue eliminada." };
  } catch (error) {
    if (error instanceof Error && error.message === "IMAGE_UNAVAILABLE") {
      return { error: "La fotografía ya no está disponible." };
    }

    return { error: "No se pudo eliminar la fotografía." };
  }
}
