"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import {
  deleteUploadcareImage,
  verifyUploadcareImage,
} from "@/lib/uploadcare-image";
import { prisma } from "@/lib/prisma";

export type FincaIdentityImageState = {
  error?: string;
  success?: string;
  warning?: string;
  savedPublicId?: string;
};

type FincaImageType = "PRIMARY" | "GALLERY";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function getActiveFarmerId() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      status: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  });
  const roles = user?.roles.map(({ role }) => role.name) ?? [];

  if (
    !user ||
    user.status !== "ACTIVE" ||
    !roles.includes(ROLES.FARMER) ||
    roles.includes(ROLES.BUYER) ||
    roles.includes(ROLES.ADMIN)
  ) {
    return null;
  }

  return user.id;
}

async function assertActiveFarmer(
  transaction: Prisma.TransactionClient,
  userId: string,
) {
  const user = await transaction.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  });
  const roles = user?.roles.map(({ role }) => role.name) ?? [];

  if (
    !user ||
    user.status !== "ACTIVE" ||
    !roles.includes(ROLES.FARMER) ||
    roles.includes(ROLES.BUYER) ||
    roles.includes(ROLES.ADMIN)
  ) {
    throw new Error("UNAUTHORIZED_FARMER");
  }
}

function getUploadcareErrorMessage(error: string) {
  switch (error) {
    case "not-found":
      return "No se encontró el archivo en Uploadcare o ya fue eliminado.";
    case "not-configured":
      return "La gestión de imágenes no está configurada actualmente.";
    case "unsupported-format":
      return "El archivo debe ser una imagen JPEG, PNG o WebP.";
    case "too-large":
      return "La imagen no puede superar 5 MiB.";
    case "unavailable":
      return "No se pudo validar el archivo en Uploadcare. Intenta nuevamente.";
    default:
      return "El archivo o su URL no son válidos.";
  }
}

function getActionError(error: unknown, operation: "save" | "delete") {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED_FARMER") {
      return "No tienes autorización para modificar imágenes de fincas.";
    }
    if (error.message === "FINCA_NOT_OWNED") {
      return "La finca no existe o no tienes autorización para modificarla.";
    }
    if (error.message === "DUPLICATE_IMAGE") {
      return "El archivo ya está asociado a otro elemento.";
    }
    if (error.message === "UPLOADCARE_NOT_CONFIGURED") {
      return "La gestión de imágenes no está configurada actualmente.";
    }
    if (error.message === "UPLOADCARE_DELETE_FAILED") {
      return "No se pudo eliminar la imagen de Uploadcare.";
    }
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return "La operación coincidió con otro cambio. Intenta nuevamente.";
  }

  return operation === "save"
    ? "No se pudo guardar la imagen. Intenta nuevamente."
    : "No se pudo eliminar la imagen. Intenta nuevamente.";
}

function revalidateFincaImagePaths(fincaId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finca");
  revalidatePath(`/dashboard/finca/${fincaId}/editar`);
  revalidatePath(`/finca/${fincaId}`);
  revalidatePath("/catalogo");
  revalidatePath("/");
}

async function saveFincaImage(
  _previousState: FincaIdentityImageState,
  formData: FormData,
  type: FincaImageType,
): Promise<FincaIdentityImageState> {
  let userId: string | null;
  try {
    userId = await getActiveFarmerId();
  } catch {
    return { error: "No se pudo verificar tu autorización. Intenta nuevamente." };
  }
  if (!userId) {
    return { error: "No tienes autorización para modificar imágenes de fincas." };
  }

  const fincaId = formData.get("fincaId");
  const publicId = formData.get("publicId");
  if (typeof fincaId !== "string" || !isUuid(fincaId.trim())) {
    return { error: "La finca seleccionada no es válida." };
  }
  if (typeof publicId !== "string" || !isUuid(publicId.trim())) {
    return { error: "Selecciona una imagen válida de Uploadcare." };
  }

  try {
    const finca = await prisma.finca.findFirst({
      where: { id: fincaId.trim(), ownerId: userId },
      select: { id: true, name: true },
    });
    if (!finca) {
      return {
        error: "La finca no existe o no tienes autorización para modificarla.",
      };
    }

    const verified = await verifyUploadcareImage(publicId);
    if ("error" in verified) {
      return { error: getUploadcareErrorMessage(verified.error) };
    }

    const replacedPublicIds = await prisma.$transaction(
      async (transaction) => {
        await assertActiveFarmer(transaction, userId);

        const ownedFinca = await transaction.finca.findFirst({
          where: { id: finca.id, ownerId: userId },
          select: { id: true },
        });
        if (!ownedFinca) {
          throw new Error("FINCA_NOT_OWNED");
        }

        const existingImages = await transaction.image.findMany({
          where: {
            fincaId: finca.id,
            animalId: null,
            type,
          },
          select: { id: true, publicId: true },
        });
        const duplicate = await transaction.image.findUnique({
          where: { publicId: verified.image.publicId },
          select: { id: true, fincaId: true, animalId: true, type: true },
        });

        if (
          duplicate &&
          !(
            duplicate.fincaId === finca.id &&
            duplicate.animalId === null &&
            duplicate.type === type
          )
        ) {
          throw new Error("DUPLICATE_IMAGE");
        }

        await transaction.image.deleteMany({
          where: {
            fincaId: finca.id,
            animalId: null,
            type,
          },
        });
        await transaction.image.create({
          data: {
            fincaId: finca.id,
            animalId: null,
            userId,
            publicId: verified.image.publicId,
            url: verified.image.url,
            type,
            altText:
              type === "PRIMARY"
                ? `Foto de perfil de ${finca.name}`
                : `Portada de ${finca.name}`,
            sortOrder: 0,
          },
          select: { id: true },
        });

        return existingImages
          .map((image) => image.publicId)
          .filter((id) => id !== verified.image.publicId);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    let cleanupWarning = false;
    for (const replacedPublicId of replacedPublicIds) {
      try {
        await deleteUploadcareImage(replacedPublicId);
      } catch {
        cleanupWarning = true;
      }
    }

    revalidateFincaImagePaths(finca.id);
    return {
      success:
        type === "PRIMARY"
          ? "La foto de perfil de la finca se guardó correctamente."
          : "La foto de portada de la finca se guardó correctamente.",
      savedPublicId: verified.image.publicId,
      ...(cleanupWarning
        ? {
            warning:
              "La imagen se actualizó, pero no se pudo eliminar una imagen anterior de Uploadcare.",
          }
        : {}),
    };
  } catch (error) {
    return { error: getActionError(error, "save") };
  }
}

async function deleteFincaImage(
  _previousState: FincaIdentityImageState,
  formData: FormData,
  type: FincaImageType,
): Promise<FincaIdentityImageState> {
  let userId: string | null;
  try {
    userId = await getActiveFarmerId();
  } catch {
    return { error: "No se pudo verificar tu autorización. Intenta nuevamente." };
  }
  if (!userId) {
    return { error: "No tienes autorización para modificar imágenes de fincas." };
  }

  const fincaId = formData.get("fincaId");
  if (typeof fincaId !== "string" || !isUuid(fincaId.trim())) {
    return { error: "La finca seleccionada no es válida." };
  }

  try {
    const finca = await prisma.finca.findFirst({
      where: { id: fincaId.trim(), ownerId: userId },
      select: { id: true },
    });
    if (!finca) {
      return {
        error: "La finca no existe o no tienes autorización para modificarla.",
      };
    }

    const images = await prisma.image.findMany({
      where: {
        fincaId: finca.id,
        animalId: null,
        type,
      },
      select: { id: true, publicId: true },
    });
    if (images.length === 0) {
      return {
        error:
          type === "PRIMARY"
            ? "La finca no tiene una foto de perfil para eliminar."
            : "La finca no tiene una foto de portada para eliminar.",
      };
    }

    for (const image of images) {
      await deleteUploadcareImage(image.publicId);
    }

    await prisma.$transaction(
      async (transaction) => {
        await assertActiveFarmer(transaction, userId);
        const ownedFinca = await transaction.finca.findFirst({
          where: { id: finca.id, ownerId: userId },
          select: { id: true },
        });
        if (!ownedFinca) {
          throw new Error("FINCA_NOT_OWNED");
        }

        await transaction.image.deleteMany({
          where: {
            id: { in: images.map((image) => image.id) },
            fincaId: finca.id,
            animalId: null,
            type,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    revalidateFincaImagePaths(finca.id);
    return {
      success:
        type === "PRIMARY"
          ? "La foto de perfil fue eliminada."
          : "La foto de portada fue eliminada.",
    };
  } catch (error) {
    return { error: getActionError(error, "delete") };
  }
}

export async function saveFincaProfileImage(
  previousState: FincaIdentityImageState,
  formData: FormData,
) {
  return saveFincaImage(previousState, formData, "PRIMARY");
}

export async function deleteFincaProfileImage(
  previousState: FincaIdentityImageState,
  formData: FormData,
) {
  return deleteFincaImage(previousState, formData, "PRIMARY");
}

export async function saveFincaCoverImage(
  previousState: FincaIdentityImageState,
  formData: FormData,
) {
  return saveFincaImage(previousState, formData, "GALLERY");
}

export async function deleteFincaCoverImage(
  previousState: FincaIdentityImageState,
  formData: FormData,
) {
  return deleteFincaImage(previousState, formData, "GALLERY");
}
