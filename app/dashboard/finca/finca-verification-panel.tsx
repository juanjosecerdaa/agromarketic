"use client";

import "@uploadcare/file-uploader/index.css";
import * as UC from "@uploadcare/file-uploader";
import type { OutputFileEntry } from "@uploadcare/file-uploader";
import { createElement, useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { FincaVerificationEvidencePreview } from "@/components/finca-verification-evidence-preview";
import {
  createFincaVerification,
  type FincaVerificationFormState,
} from "./actions";
import { isUploadcareCdnUrl } from "@/lib/uploadcare-url";

type VerificationRequest = {
  status: "PENDING" | "VERIFIED" | "REJECTED";
  requestedAt: string;
  evidenceUrl: string;
  note: string | null;
  rejectionReason: string | null;
};

type UploadedEvidence = {
  publicId: string;
  url: string;
  mimeType: string;
  size: number;
};

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumFileSize = 5 * 1024 * 1024;
const initialState: FincaVerificationFormState = {};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-NI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function FincaVerificationPanel({
  fincaId,
  fincaVerified,
  latestRequest,
}: {
  fincaId: string;
  fincaVerified: boolean;
  latestRequest: VerificationRequest | null;
}) {
  const router = useRouter();
  const contextRef = useRef<HTMLElement | null>(null);
  const [state, formAction, isPending] = useActionState(
    createFincaVerification,
    initialState,
  );
  const [evidence, setEvidence] = useState<UploadedEvidence | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadVersion, setUploadVersion] = useState(0);
  const publicKey = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY;
  const requestStatus = latestRequest?.status;
  const isVerified = requestStatus === "VERIFIED" || fincaVerified;
  const canRequest = !isVerified && requestStatus !== "PENDING";
  const contextName = `finca-verification-${fincaId}-${uploadVersion}`;
  const savedEvidenceUrl =
    latestRequest && isUploadcareCdnUrl(latestRequest.evidenceUrl)
      ? latestRequest.evidenceUrl
      : null;

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
        !isUploadcareCdnUrl(detail.cdnUrl) ||
        !allowedMimeTypes.has(detail.mimeType) ||
        !Number.isSafeInteger(detail.size) ||
        detail.size <= 0 ||
        detail.size > maximumFileSize
      ) {
        setEvidence(null);
        setUploadError(
          "El formato no está permitido. Usa JPEG, PNG o WebP de hasta 5 MB.",
        );
        return;
      }

      setEvidence({
        publicId: detail.uuid,
        url: detail.cdnUrl,
        mimeType: detail.mimeType,
        size: detail.size,
      });
      setUploadError(null);
    };

    context.addEventListener("file-upload-success", handleSuccess);
    return () => {
      context.removeEventListener("file-upload-success", handleSuccess);
    };
  }, [contextName]);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <section className="mt-5 rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
      <h3 className="font-display text-xl font-bold">Verificación de finca</h3>
      <p className="mt-2 text-sm leading-6 text-ink/55">
        La verificación es una revisión interna de AgroMarketNIC y no constituye
        certificación gubernamental, sanitaria ni jurídica.
      </p>

      {isVerified ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="font-semibold text-green-800">Finca verificada</p>
        </div>
      ) : latestRequest?.status === "PENDING" ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="font-semibold text-amber-900">Solicitud en revisión</p>
          <p className="mt-1 text-sm text-amber-800">
            Solicitada el {formatDate(latestRequest.requestedAt)}.
          </p>
        </div>
      ) : latestRequest?.status === "REJECTED" ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="font-semibold text-red-800">Solicitud rechazada</p>
          {latestRequest.rejectionReason && (
            <p className="mt-1 text-sm text-red-700">
              Motivo: {latestRequest.rejectionReason}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-ink/10 bg-cream px-4 py-3 text-sm text-ink/65">
          Tu finca aún no está verificada.
        </p>
      )}

      {latestRequest && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink">
            {requestStatus === "VERIFIED"
              ? "Evidencia aprobada"
              : "Evidencia enviada"}
          </p>
          {savedEvidenceUrl ? (
            <>
              <FincaVerificationEvidencePreview src={savedEvidenceUrl} />
              <a
                href={savedEvidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm font-semibold text-forest underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              >
                Ver imagen completa
              </a>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink/55">
              La evidencia no está disponible para previsualización.
            </p>
          )}
          {latestRequest.note && (
            <p className="mt-3 text-sm text-ink/60">
              Nota enviada: {latestRequest.note}
            </p>
          )}
        </div>
      )}

      {canRequest && (
        <form action={formAction} className="mt-5 space-y-4">
          {state.error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {state.error}
            </p>
          )}
          {uploadError && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {uploadError}
            </p>
          )}

          <p className="text-sm text-ink/60">
            Sube únicamente una imagen no sensible de la finca o sus
            instalaciones.
          </p>

          {publicKey ? (
            <div>
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
              })}
              {evidence && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-ink">
                    Evidencia seleccionada
                  </p>
                  <FincaVerificationEvidencePreview src={evidence.url} />
                  <p className="mt-2 text-sm font-medium text-forest">
                    Imagen lista para enviar.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidence(null);
                      setUploadError(null);
                      setUploadVersion((version) => version + 1);
                    }}
                    className="mt-2 text-sm font-semibold text-forest underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                  >
                    Cambiar imagen
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              La carga de evidencia no está configurada actualmente.
            </p>
          )}

          <label className="block text-sm font-semibold text-ink">
            Nota opcional
            <textarea
              name="note"
              rows={3}
              maxLength={1000}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/20"
              placeholder="Agrega información útil para revisar tu solicitud."
            />
          </label>

          <input type="hidden" name="fincaId" value={fincaId} />
          <input type="hidden" name="publicId" value={evidence?.publicId ?? ""} />
          <input type="hidden" name="evidenceUrl" value={evidence?.url ?? ""} />
          <input type="hidden" name="mimeType" value={evidence?.mimeType ?? ""} />
          <input type="hidden" name="size" value={evidence?.size ?? ""} />

          <button
            type="submit"
            disabled={!publicKey || !evidence || isPending}
            className="inline-flex w-full items-center justify-center rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isPending
              ? "Enviando solicitud..."
              : requestStatus === "REJECTED"
                ? "Volver a solicitar"
                : "Solicitar verificación"}
          </button>
        </form>
      )}
    </section>
  );
}
