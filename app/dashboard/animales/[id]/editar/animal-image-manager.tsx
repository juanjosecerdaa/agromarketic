"use client";

import "@uploadcare/file-uploader/index.css";
import * as UC from "@uploadcare/file-uploader";
import type { OutputFileEntry } from "@uploadcare/file-uploader";
import { createElement, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useActionState } from "react";

import {
  deleteAnimalImage,
  registerAnimalImage,
  setPrimaryAnimalImage,
  type AnimalImageState,
} from "./actions";

type AnimalImage = {
  id: string;
  url: string;
  type: "PRIMARY" | "GALLERY" | "DOCUMENT";
};

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumFileSize = 5 * 1024 * 1024;
const maximumImages = 6;

export function AnimalImageManager({
  animalId,
  images,
  isNewPublication = false,
}: {
  animalId: string;
  images: AnimalImage[];
  isNewPublication?: boolean;
}) {
  const router = useRouter();
  const contextRef = useRef<HTMLElement | null>(null);
  const [state, formAction, isPending] = useActionState<AnimalImageState, FormData>(
    registerAnimalImage,
    {},
  );
  const [isRegistering, startTransition] = useTransition();
  const [primaryState, primaryAction, isPrimaryPending] = useActionState<
    AnimalImageState,
    FormData
  >(setPrimaryAnimalImage, {});
  const [deleteState, deleteAction, isDeletePending] = useActionState<
    AnimalImageState,
    FormData
  >(deleteAnimalImage, {});
  const remaining = Math.max(0, maximumImages - images.length);
  const publicKey = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY;

  useEffect(() => {
    UC.defineComponents(UC);
    const context = contextRef.current;

    if (!context) {
      return;
    }

    const handleSuccess = (event: Event) => {
      const detail = (event as CustomEvent<OutputFileEntry>).detail;

      if (
        detail.status !== "success" ||
        !detail.uuid ||
        !detail.cdnUrl ||
        !allowedMimeTypes.has(detail.mimeType) ||
        detail.size > maximumFileSize
      ) {
        return;
      }

      const data = new FormData();
      data.set("animalId", animalId);
      data.set("publicId", detail.uuid);
      data.set("url", detail.cdnUrl);
      data.set("mimeType", detail.mimeType);
      data.set("size", String(detail.size));
      startTransition(() => formAction(data));
    };

    context.addEventListener("file-upload-success", handleSuccess);
    return () => {
      context.removeEventListener("file-upload-success", handleSuccess);
    };
  }, [animalId, formAction, startTransition]);

  useEffect(() => {
    if (state.success || primaryState.success || deleteState.success) {
      router.refresh();
    }
  }, [deleteState.success, primaryState.success, router, state.success]);

  if (!publicKey) {
    return (
      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        La carga de fotografías no está configurada actualmente.
      </section>
    );
  }

  return (
    <section
      id="fotografias"
      className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Fotografías</h2>
          <p className="mt-2 text-sm text-ink/55">
            Puedes subir hasta 6 fotografías. La primera será la imagen principal.
          </p>
          <p className="mt-1 text-sm text-ink/55">
            Las fotografías se guardan automáticamente al finalizar la subida.
          </p>
        </div>
        <p className="text-sm font-semibold text-ink/55">
          {images.length}/6 · {remaining} disponibles
        </p>
      </div>

      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {state.success}
        </p>
      )}
      {primaryState.error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {primaryState.error}
        </p>
      )}
      {deleteState.error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {deleteState.error}
        </p>
      )}
      {(isPending || isRegistering || isPrimaryPending || isDeletePending) && (
        <p className="mt-4 text-sm text-ink/55">
          {isPrimaryPending
            ? "Actualizando imagen principal..."
            : isDeletePending
              ? "Eliminando fotografía..."
              : "Registrando la fotografía..."}
        </p>
      )}

      {remaining > 0 && (
        <div className="mt-5">
          {createElement("uc-config", {
            "ctx-name": "animal-image-uploader",
            pubkey: publicKey,
            "img-only": "true",
            multiple: "true",
            "multiple-max": String(remaining),
            "max-local-file-size-bytes": String(maximumFileSize),
            accept: "image/jpeg,image/png,image/webp",
            "source-list": "local",
            "confirm-uploads": "true",
          })}
          {createElement(
            "uc-upload-ctx-provider",
            { ref: contextRef, "ctx-name": "animal-image-uploader" },
          )}
          {createElement("uc-file-uploader-regular", {
            "ctx-name": "animal-image-uploader",
          })}
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-2xl border border-ink/10 bg-cream"
            >
              <img
                src={image.url}
                alt={image.type === "PRIMARY" ? "Imagen principal" : "Imagen de galería"}
                className="h-40 w-full object-cover"
              />
              <p className="px-3 py-2 text-xs font-semibold text-ink/60">
                {image.type === "PRIMARY" ? "Principal" : "Galería"}
              </p>
              <div className="flex flex-wrap gap-2 px-3 pb-3">
                {image.type !== "PRIMARY" && (
                  <form action={primaryAction}>
                    <input type="hidden" name="animalId" value={animalId} />
                    <input type="hidden" name="imageId" value={image.id} />
                    <button
                      type="submit"
                      disabled={isPrimaryPending || isDeletePending}
                      className="rounded-lg border border-forest px-3 py-2 text-xs font-semibold text-forest transition hover:bg-forest/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPrimaryPending ? "Actualizando..." : "Hacer principal"}
                    </button>
                  </form>
                )}
                <form
                  action={deleteAction}
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        "¿Quieres eliminar esta fotografía? Se eliminará permanentemente del almacenamiento.",
                      )
                    ) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="animalId" value={animalId} />
                  <input type="hidden" name="imageId" value={image.id} />
                  <button
                    type="submit"
                    disabled={isPrimaryPending || isDeletePending}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeletePending ? "Eliminando..." : "Eliminar"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {isNewPublication && (
        <div className="mt-6 flex flex-wrap gap-3 border-t border-ink/10 pt-5">
          <Link
            href={`/animal/${animalId}`}
            className="inline-flex items-center justify-center rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink"
          >
            Finalizar y ver publicación
          </Link>
          <Link
            href="/dashboard/animales"
            className="inline-flex items-center justify-center rounded-xl border border-forest/20 bg-white px-4 py-2.5 text-sm font-semibold text-forest hover:border-forest"
          >
            Volver a Mis animales
          </Link>
        </div>
      )}
    </section>
  );
}
