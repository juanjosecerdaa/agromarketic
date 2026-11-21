"use client";

import "@uploadcare/file-uploader/index.css";
import * as UC from "@uploadcare/file-uploader";
import type { OutputFileEntry } from "@uploadcare/file-uploader";
import Image from "next/image";
import { createElement, useEffect, useRef, useState } from "react";
import { useActionState } from "react";

import {
  deleteFincaCoverImage,
  deleteFincaProfileImage,
  saveFincaCoverImage,
  saveFincaProfileImage,
  type FincaIdentityImageState,
} from "./identity-image-actions";
import { isUploadcareCdnUrl } from "@/lib/uploadcare-url";

type IdentityAction = (
  previousState: FincaIdentityImageState,
  formData: FormData,
) => Promise<FincaIdentityImageState>;

type IdentityImageCardProps = {
  fincaId: string;
  fincaName: string;
  imageUrl: string | null;
  hasImage: boolean;
  kind: "profile" | "cover";
  saveAction: IdentityAction;
  deleteAction: IdentityAction;
};

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumFileSize = 5 * 1024 * 1024;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const initialState: FincaIdentityImageState = {};

function IdentityImageCard({
  fincaId,
  fincaName,
  imageUrl,
  hasImage,
  kind,
  saveAction,
  deleteAction,
}: IdentityImageCardProps) {
  const contextRef = useRef<HTMLElement | null>(null);
  const [saveState, saveFormAction, isSaving] = useActionState(
    saveAction,
    initialState,
  );
  const [deleteState, deleteFormAction, isDeleting] = useActionState(
    deleteAction,
    initialState,
  );
  const [selectedImage, setSelectedImage] = useState<{
    publicId: string;
    url: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [uploadVersion, setUploadVersion] = useState(0);
  const publicKey = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY;
  const isProfile = kind === "profile";
  const label = isProfile ? "foto de perfil" : "foto de portada";
  const alt = isProfile
    ? `Foto de perfil de ${fincaName}`
    : `Portada de ${fincaName}`;
  const contextName = `finca-${kind}-${fincaId}-${uploadVersion}-${hasImage}-${saveState.savedPublicId ?? "new"}`;
  const isWorking = isSaving || isDeleting;
  const pendingImage =
    selectedImage?.publicId === saveState.savedPublicId ? null : selectedImage;
  const previewSource = pendingImage?.url ?? imageUrl;
  const previewUrl =
    previewSource && previewSource !== failedImageUrl ? previewSource : null;

  useEffect(() => {
    UC.defineComponents(UC);
    const context = contextRef.current;

    if (!context || !publicKey || isWorking) {
      return;
    }

    const handleSuccess = (event: Event) => {
      const detail = (event as CustomEvent<OutputFileEntry>).detail;

      if (
        detail.status !== "success" ||
        !detail.uuid ||
        !uuidPattern.test(detail.uuid) ||
        !detail.cdnUrl ||
        !isUploadcareCdnUrl(detail.cdnUrl) ||
        !allowedMimeTypes.has(detail.mimeType) ||
        !Number.isSafeInteger(detail.size) ||
        detail.size <= 0 ||
        detail.size > maximumFileSize
      ) {
        setSelectedImage(null);
        setUploadError(
          "El archivo debe ser JPEG, PNG o WebP de hasta 5 MiB.",
        );
        return;
      }

      setSelectedImage({ publicId: detail.uuid, url: detail.cdnUrl });
      setUploadError(null);
    };

    context.addEventListener("file-upload-success", handleSuccess);
    return () => {
      context.removeEventListener("file-upload-success", handleSuccess);
    };
  }, [contextName, isWorking, publicKey]);

  return (
    <section className="min-w-0 rounded-2xl border border-ink/10 bg-cream p-4 sm:p-5">
      <h3 className="font-display text-lg font-bold">
        {isProfile ? "Foto de perfil" : "Foto de portada"}
      </h3>
      <p className="mt-1 text-sm text-ink/55">
        {isProfile
          ? "Identifica visualmente tu finca."
          : "Presenta tu finca con una imagen horizontal."}
      </p>

      <div
        className={`relative mt-4 overflow-hidden border border-forest/15 bg-forest ${
          isProfile
            ? "mx-auto aspect-square w-32 rounded-full ring-4 ring-white sm:w-36"
            : "aspect-[16/7] w-full rounded-xl"
        }`}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={selectedImage ? `Vista previa: ${alt}` : alt}
            fill
            sizes={
              isProfile
                ? "144px"
                : "(max-width: 640px) 100vw, (max-width: 768px) 50vw, 600px"
            }
            unoptimized
            onError={() => setFailedImageUrl(previewUrl)}
            className="object-cover"
          />
        ) : isProfile ? (
          <div
            aria-label={`Sin ${label}: inicial de ${fincaName}`}
            className="grid h-full w-full place-items-center text-4xl font-extrabold text-white"
          >
            {fincaName.trim().charAt(0).toLocaleUpperCase("es-NI") || "F"}
          </div>
        ) : (
          <div
            aria-label="Sin foto de portada"
            className="h-full w-full bg-gradient-to-br from-forest via-forest to-leaf"
          />
        )}
      </div>
      {pendingImage && (
        <p className="mt-2 text-center text-xs font-semibold text-forest">
          Vista previa antes de guardar
        </p>
      )}

      {uploadError && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {uploadError}
        </p>
      )}
      {saveState.error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {saveState.error}
        </p>
      )}
      {deleteState.error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {deleteState.error}
        </p>
      )}
      {((saveState.success && hasImage && !pendingImage) ||
        (deleteState.success && !hasImage && !pendingImage)) && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {saveState.success && hasImage
            ? saveState.success
            : deleteState.success}
        </p>
      )}
      {saveState.warning && hasImage && !pendingImage && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {saveState.warning}
        </p>
      )}

      {publicKey ? (
        <div className={`mt-4 ${isWorking ? "pointer-events-none opacity-60" : ""}`}>
          <p className="mb-2 text-sm font-semibold text-ink">
            {isProfile ? "Subir o cambiar foto" : "Subir o cambiar portada"}
          </p>
          {createElement("uc-config", {
            "ctx-name": contextName,
            pubkey: publicKey,
            "img-only": "true",
            multiple: "false",
            "multiple-max": "1",
            "max-local-file-size-bytes": String(maximumFileSize),
            accept: "image/jpeg,image/png,image/webp",
            "source-list": "local",
            "confirm-uploads": "true",
          })}
          {createElement("uc-upload-ctx-provider", {
            key: `provider-${uploadVersion}`,
            ref: contextRef,
            "ctx-name": contextName,
          })}
          {createElement("uc-file-uploader-regular", {
            key: `uploader-${uploadVersion}`,
            "ctx-name": contextName,
            "aria-label": isProfile
              ? "Subir foto de perfil de la finca"
              : "Subir foto de portada de la finca",
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          La carga de imágenes no está configurada actualmente.
        </p>
      )}

      {pendingImage && (
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={saveFormAction}>
            <input type="hidden" name="fincaId" value={fincaId} />
            <input
              type="hidden"
              name="publicId"
              value={pendingImage.publicId}
            />
            <button
              type="submit"
              disabled={isWorking}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Guardando imagen..."
                : isProfile
                  ? "Guardar foto de perfil"
                  : "Guardar portada"}
            </button>
          </form>
          <button
            type="button"
            disabled={isWorking}
            onClick={() => {
              setSelectedImage(null);
              setUploadError(null);
              setUploadVersion((version) => version + 1);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-forest/20 bg-white px-4 py-2.5 text-sm font-semibold text-forest hover:border-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      )}

      {hasImage && !pendingImage && (
        <form
          action={deleteFormAction}
          className="mt-3"
          onSubmit={(event) => {
            if (!window.confirm(`¿Eliminar la ${label} de la finca?`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="fincaId" value={fincaId} />
          <button
            type="submit"
            disabled={isWorking}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Eliminando imagen..." : "Eliminar"}
          </button>
        </form>
      )}
    </section>
  );
}

export function FincaIdentityImageManager({
  fincaId,
  fincaName,
  profileImageUrl,
  hasProfileImage,
  coverImageUrl,
  hasCoverImage,
}: {
  fincaId: string;
  fincaName: string;
  profileImageUrl: string | null;
  hasProfileImage: boolean;
  coverImageUrl: string | null;
  hasCoverImage: boolean;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold">
        Identidad visual de la finca
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink/55">
        Las imágenes se muestran en el perfil público de tu finca.
      </p>
      <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-2">
        <IdentityImageCard
          fincaId={fincaId}
          fincaName={fincaName}
          imageUrl={profileImageUrl}
          hasImage={hasProfileImage}
          kind="profile"
          saveAction={saveFincaProfileImage}
          deleteAction={deleteFincaProfileImage}
        />
        <IdentityImageCard
          fincaId={fincaId}
          fincaName={fincaName}
          imageUrl={coverImageUrl}
          hasImage={hasCoverImage}
          kind="cover"
          saveAction={saveFincaCoverImage}
          deleteAction={deleteFincaCoverImage}
        />
      </div>
    </section>
  );
}
