"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { FincaVerificationEvidencePreview } from "@/components/finca-verification-evidence-preview";
import { isUploadcareCdnUrl } from "@/lib/uploadcare-url";
import {
  approveFincaVerification,
  rejectFincaVerification,
  type FincaVerificationReviewState,
} from "./verification-actions";

type PendingVerification = {
  id: string;
  fincaName: string;
  requesterName: string;
  requestedAt: string;
  evidenceUrl: string;
  note: string | null;
};

const initialState: FincaVerificationReviewState = {};

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-NI", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function VerificationReviewCard({
  request,
}: {
  request: PendingVerification;
}) {
  const router = useRouter();
  const [approveState, approveAction, isApproving] = useActionState(
    approveFincaVerification,
    initialState,
  );
  const [rejectState, rejectAction, isRejecting] = useActionState(
    rejectFincaVerification,
    initialState,
  );
  const evidenceUrl = isUploadcareCdnUrl(request.evidenceUrl)
    ? request.evidenceUrl
    : null;
  const isPending = isApproving || isRejecting;

  useEffect(() => {
    if (approveState.success || rejectState.success) {
      router.refresh();
    }
  }, [approveState.success, rejectState.success, router]);

  return (
    <article className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-xl font-bold">{request.fincaName}</h4>
          <p className="mt-1 text-sm text-ink/60">
            Propietario: {request.requesterName.trim() || "Sin nombre"}
          </p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
          Pendiente
        </span>
      </div>

      <p className="mt-4 text-sm text-ink/55">
        Solicitada el {formatDate(request.requestedAt)}
      </p>
      {request.note && (
        <div className="mt-4 rounded-xl bg-cream px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
            Nota del ganadero
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/75">
            {request.note}
          </p>
        </div>
      )}

      <div className="mt-4">
        <p className="text-sm font-semibold text-ink">Evidencia enviada</p>
        {evidenceUrl ? (
          <>
            <FincaVerificationEvidencePreview src={evidenceUrl} />
            <a
              href={evidenceUrl}
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
      </div>

      {(approveState.error || rejectState.error) && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {approveState.error || rejectState.error}
        </p>
      )}

      <div className="mt-5 grid gap-4 border-t border-ink/10 pt-5 sm:grid-cols-2">
        <form action={approveAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApproving ? "Aprobando..." : "Aprobar verificación"}
          </button>
        </form>

        <form action={rejectAction} className="space-y-3">
          <input type="hidden" name="requestId" value={request.id} />
          <label className="block text-sm font-semibold text-ink">
            Motivo del rechazo
            <textarea
              name="rejectionReason"
              required
              maxLength={1000}
              rows={3}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/20"
              placeholder="Explica brevemente qué debe corregirse."
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRejecting ? "Rechazando..." : "Rechazar solicitud"}
          </button>
        </form>
      </div>
    </article>
  );
}

export function FincaVerificationReview({
  requests,
}: {
  requests: PendingVerification[];
}) {
  return (
    <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl font-bold">
          Verificaciones pendientes
        </h3>
        <p className="text-sm text-ink/50">
          {requests.length} {requests.length === 1 ? "solicitud" : "solicitudes"}
        </p>
      </div>

      {requests.length > 0 ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {requests.map((request) => (
            <VerificationReviewCard key={request.id} request={request} />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/55">
          No hay solicitudes pendientes de revisión.
        </p>
      )}
    </section>
  );
}
