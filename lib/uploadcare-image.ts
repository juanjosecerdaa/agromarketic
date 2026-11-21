import "server-only";

import {
  deleteFile,
  fileInfo,
  RestClientError,
  UploadcareAuthSchema,
} from "@uploadcare/rest-client/node";

import { isUploadcareCdnUrl } from "@/lib/uploadcare-url";

const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const maximumImageSize = 5 * 1024 * 1024;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UploadcareImageValidation =
  | { image: { publicId: string; url: string } }
  | {
      error:
        | "invalid"
        | "not-found"
        | "not-configured"
        | "unsupported-format"
        | "too-large"
        | "unavailable";
    };

function getUploadcareAuth() {
  const publicKey = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY;
  const secretKey = process.env.UPLOADCARE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw new Error("UPLOADCARE_NOT_CONFIGURED");
  }

  return new UploadcareAuthSchema({ publicKey, secretKey });
}

function getUploadcareFileUuid(url: string) {
  if (!isUploadcareCdnUrl(url)) {
    return null;
  }

  const match = new URL(url).pathname.match(
    /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

export async function verifyUploadcareImage(
  publicId: string,
): Promise<UploadcareImageValidation> {
  const normalizedPublicId = publicId.trim().toLowerCase();
  if (!uuidPattern.test(normalizedPublicId)) {
    return { error: "invalid" };
  }

  let file: Awaited<ReturnType<typeof fileInfo>>;
  try {
    file = await fileInfo(
      { uuid: normalizedPublicId },
      { authSchema: getUploadcareAuth() },
    );
  } catch (error) {
    if (error instanceof RestClientError && error.status === 404) {
      return { error: "not-found" };
    }
    if (error instanceof Error && error.message === "UPLOADCARE_NOT_CONFIGURED") {
      return { error: "not-configured" };
    }

    return { error: "unavailable" };
  }

  if (
    typeof file.uuid !== "string" ||
    file.uuid.toLowerCase() !== normalizedPublicId ||
    file.datetimeRemoved !== null
  ) {
    return { error: "not-found" };
  }

  if (
    file.isImage !== true ||
    typeof file.mimeType !== "string" ||
    !allowedImageMimeTypes.has(file.mimeType.trim().toLowerCase())
  ) {
    return { error: "unsupported-format" };
  }

  if (
    !Number.isSafeInteger(file.size) ||
    file.size <= 0 ||
    file.size > maximumImageSize
  ) {
    return { error: "too-large" };
  }

  if (
    file.isReady !== true ||
    typeof file.originalFileUrl !== "string" ||
    getUploadcareFileUuid(file.originalFileUrl) !== normalizedPublicId
  ) {
    return { error: "invalid" };
  }

  return {
    image: {
      publicId: normalizedPublicId,
      url: file.originalFileUrl,
    },
  };
}

export async function deleteUploadcareImage(publicId: string) {
  try {
    await deleteFile(
      { uuid: publicId },
      { authSchema: getUploadcareAuth() },
    );
  } catch (error) {
    if (error instanceof RestClientError && error.status === 404) {
      return;
    }

    if (error instanceof Error && error.message === "UPLOADCARE_NOT_CONFIGURED") {
      throw error;
    }

    throw new Error("UPLOADCARE_DELETE_FAILED");
  }
}
