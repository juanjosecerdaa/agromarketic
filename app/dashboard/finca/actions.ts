"use server";

import { Prisma } from "@prisma/client";
import {
  fileInfo,
  RestClientError,
  UploadcareAuthSchema,
} from "@uploadcare/rest-client/node";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isUploadcareCdnUrl } from "@/lib/uploadcare-url";

export type FincaFormState = {
  error?: string;
};

export type FincaVerificationFormState = {
  error?: string;
  success?: string;
};

const allowedEvidenceMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const maximumEvidenceSize = 5 * 1024 * 1024;
const maximumVerificationNoteLength = 1000;
const invalidEvidenceMessage =
  "La evidencia debe ser una imagen JPEG, PNG o WebP de hasta 5 MB.";

function readOptionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getUploadcareFileUuid(value: string) {
  if (!isUploadcareCdnUrl(value)) {
    return null;
  }

  const match = new URL(value).pathname.match(
    /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

type VerifiedEvidenceResult =
  | { url: string }
  | { error: "invalid" | "unavailable" };

async function verifyUploadcareEvidence(
  uuid: string,
): Promise<VerifiedEvidenceResult> {
  const publicKey = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY;
  const secretKey = process.env.UPLOADCARE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return { error: "unavailable" };
  }

  try {
    const file = await fileInfo(
      { uuid },
      {
        authSchema: new UploadcareAuthSchema({ publicKey, secretKey }),
      },
    );

    const uuidMatches =
      typeof file.uuid === "string" &&
      file.uuid.toLowerCase() === uuid.toLowerCase();
    const isImage = file.isImage === true;
    const isReady = file.isReady === true;
    const mimeAllowed =
      typeof file.mimeType === "string" &&
      allowedEvidenceMimeTypes.has(file.mimeType.trim().toLowerCase());
    const sizeAllowed =
      Number.isFinite(file.size) &&
      file.size > 0 &&
      file.size <= maximumEvidenceSize;
    const notRemoved = file.datetimeRemoved === null;
    const originalFileUrlPresent =
      typeof file.originalFileUrl === "string" &&
      file.originalFileUrl.length > 0;
    const originalFileUrlAllowed =
      originalFileUrlPresent &&
      typeof file.originalFileUrl === "string" &&
      isUploadcareCdnUrl(file.originalFileUrl) &&
      getUploadcareFileUuid(file.originalFileUrl) === uuid.toLowerCase();

    if (
      !uuidMatches ||
      !isImage ||
      !isReady ||
      !mimeAllowed ||
      !sizeAllowed ||
      !notRemoved ||
      !originalFileUrlAllowed ||
      typeof file.originalFileUrl !== "string"
    ) {
      return { error: "invalid" };
    }

    return { url: file.originalFileUrl };
  } catch (error) {
    if (error instanceof RestClientError && error.status === 404) {
      return { error: "invalid" };
    }

    return { error: "unavailable" };
  }
}

export async function createFincaVerification(
  _previousState: FincaVerificationFormState,
  formData: FormData,
): Promise<FincaVerificationFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Inicia sesión con una cuenta ganadera para continuar." };
  }

  const fincaId = formData.get("fincaId");
  const publicId = formData.get("publicId");
  const noteValue = formData.get("note");

  if (
    typeof fincaId !== "string" ||
    !isUuid(fincaId.trim()) ||
    typeof publicId !== "string" ||
    !isUuid(publicId.trim())
  ) {
    return { error: invalidEvidenceMessage };
  }

  if (noteValue !== null && typeof noteValue !== "string") {
    return { error: "La nota no es válida." };
  }

  const note = typeof noteValue === "string" ? noteValue.trim() : "";
  if (note.length > maximumVerificationNoteLength) {
    return {
      error: `La nota no puede superar ${maximumVerificationNoteLength} caracteres.`,
    };
  }

  const preflightUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      status: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  });
  const preflightRoleNames =
    preflightUser?.roles.map(({ role }) => role.name) ?? [];
  if (
    !preflightUser ||
    preflightUser.status !== "ACTIVE" ||
    !preflightRoleNames.includes(ROLES.FARMER) ||
    preflightRoleNames.includes(ROLES.BUYER) ||
    preflightRoleNames.includes(ROLES.ADMIN)
  ) {
    return { error: "No tienes autorización para solicitar la verificación." };
  }

  const preflightFinca = await prisma.finca.findFirst({
    where: {
      id: fincaId.trim(),
      ownerId: session.user.id,
    },
    select: { id: true, status: true },
  });
  if (!preflightFinca) {
    return { error: "No tienes autorización para esta finca." };
  }

  const preflightLatestRequest = await prisma.fincaVerification.findFirst({
    where: { fincaId: preflightFinca.id },
    orderBy: [{ requestedAt: "desc" }, { createdAt: "desc" }],
    select: { status: true },
  });
  if (preflightLatestRequest?.status === "PENDING") {
    return { error: "Ya existe una solicitud pendiente para esta finca." };
  }
  if (
    preflightLatestRequest?.status === "VERIFIED" ||
    preflightFinca.status === "VERIFIED"
  ) {
    return { error: "Esta finca ya está verificada." };
  }

  const verifiedEvidence = await verifyUploadcareEvidence(
    publicId.trim().toLowerCase(),
  );
  if ("error" in verifiedEvidence) {
    return {
      error:
        verifiedEvidence.error === "invalid"
          ? invalidEvidenceMessage
          : "No se pudo verificar la imagen. Intenta nuevamente.",
    };
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: session.user.id },
          select: {
            status: true,
            roles: {
              select: { role: { select: { name: true } } },
            },
          },
        });

        const roleNames = user?.roles.map(({ role }) => role.name) ?? [];
        if (
          !user ||
          user.status !== "ACTIVE" ||
          !roleNames.includes(ROLES.FARMER) ||
          roleNames.includes(ROLES.BUYER) ||
          roleNames.includes(ROLES.ADMIN)
        ) {
          throw new Error("UNAUTHORIZED_FARMER");
        }

        const finca = await transaction.finca.findFirst({
          where: {
            id: fincaId.trim(),
            ownerId: session.user.id,
          },
          select: { id: true, status: true },
        });

        if (!finca) {
          throw new Error("FINCA_NOT_OWNED");
        }

        const latestRequest = await transaction.fincaVerification.findFirst({
          where: { fincaId: finca.id },
          orderBy: [{ requestedAt: "desc" }, { createdAt: "desc" }],
          select: { status: true },
        });

        if (latestRequest?.status === "PENDING") {
          throw new Error("VERIFICATION_PENDING");
        }

        if (
          latestRequest?.status === "VERIFIED" ||
          finca.status === "VERIFIED"
        ) {
          throw new Error("VERIFICATION_ALREADY_APPROVED");
        }

        const activeAdmins = await transaction.user.findMany({
          where: {
            status: "ACTIVE",
            roles: {
              some: {
                role: { name: ROLES.ADMIN },
              },
            },
          },
          select: { id: true },
        });

        await transaction.fincaVerification.create({
          data: {
            fincaId: finca.id,
            requestedById: session.user.id,
            evidenceUrl: verifiedEvidence.url,
            note: note || null,
          },
          select: { id: true },
        });

        for (const admin of activeAdmins) {
          await createNotification(transaction, {
            userId: admin.id,
            type: "FINCA_VERIFICATION_REQUESTED",
            title: "Nueva solicitud de verificación",
            message:
              "Un ganadero envió una solicitud de verificación de finca para revisión.",
            href: "/admin/fincas",
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED_FARMER") {
        return {
          error: "No tienes autorización para solicitar la verificación.",
        };
      }

      if (error.message === "FINCA_NOT_OWNED") {
        return { error: "No tienes autorización para esta finca." };
      }

      if (error.message === "VERIFICATION_PENDING") {
        return { error: "Ya existe una solicitud pendiente para esta finca." };
      }

      if (error.message === "VERIFICATION_ALREADY_APPROVED") {
        return { error: "Esta finca ya está verificada." };
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      const latestRequest = await prisma.fincaVerification.findFirst({
        where: {
          fincaId: fincaId.trim(),
          finca: { ownerId: session.user.id },
        },
        orderBy: [{ requestedAt: "desc" }, { createdAt: "desc" }],
        select: { status: true },
      });

      if (latestRequest?.status === "PENDING") {
        return { error: "Ya existe una solicitud pendiente para esta finca." };
      }

      return {
        error: "No se pudo enviar la solicitud. Intenta de nuevo.",
      };
    }

    throw error;
  }

  revalidatePath("/admin/fincas");
  revalidatePath("/dashboard/finca");
  revalidatePath("/dashboard");
  return { success: "La solicitud de verificación fue enviada." };
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
