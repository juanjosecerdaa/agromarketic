"use client";

import { useActionState } from "react";

import {
  acceptReservation,
  cancelReservation,
  completeReservation,
  rejectReservation,
  type ReservationDecisionState,
} from "@/app/dashboard/reservas/actions";
import { Button } from "@/components/ui";

const initialState: ReservationDecisionState = {};

export function ReservationDecisionActions({
  reservationId,
  status,
}: {
  reservationId: string;
  status: "PENDING" | "CONFIRMED";
}) {
  const [rejectState, rejectAction, isRejecting] = useActionState(
    rejectReservation,
    initialState,
  );
  const [acceptState, acceptAction, isAccepting] = useActionState(
    acceptReservation,
    initialState,
  );
  const [cancelState, cancelAction, isCancelling] = useActionState(
    cancelReservation,
    initialState,
  );
  const [completeState, completeAction, isCompleting] = useActionState(
    completeReservation,
    initialState,
  );

  const isPending =
    isRejecting || isAccepting || isCancelling || isCompleting;
  const error =
    rejectState.error ||
    acceptState.error ||
    cancelState.error ||
    completeState.error;

  return (
    <div className="mt-5">
      {status === "PENDING" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <form action={rejectAction}>
            <input type="hidden" name="reservationId" value={reservationId} />
            <Button
              className="w-full"
              variant="outline"
              type="submit"
              disabled={isPending}
            >
              {isRejecting ? "Rechazando..." : "Rechazar"}
            </Button>
          </form>
          <form action={acceptAction}>
            <input type="hidden" name="reservationId" value={reservationId} />
            <Button className="w-full" type="submit" disabled={isPending}>
              {isAccepting ? "Aceptando..." : "Aceptar"}
            </Button>
          </form>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-cream px-4 py-3 text-sm leading-6 text-ink/60">
            Confirma esta opción únicamente cuando la operación y la entrega
            hayan sido coordinadas con el comprador. AgroMarketNIC no procesa
            el pago.
          </div>
          <div className="mt-3 rounded-xl border border-terracotta/20 bg-[#fff8f2] px-4 py-3 text-sm leading-6 text-ink/60">
            Al cancelar, el animal volverá a estar disponible en el marketplace.
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <form action={cancelAction}>
              <input type="hidden" name="reservationId" value={reservationId} />
              <Button
                className="w-full border-terracotta/30 text-terracotta hover:border-terracotta"
                variant="outline"
                type="submit"
                disabled={isPending}
              >
                {isCancelling ? "Cancelando..." : "Cancelar reserva"}
              </Button>
            </form>
            <form action={completeAction}>
              <input type="hidden" name="reservationId" value={reservationId} />
              <Button className="w-full" type="submit" disabled={isPending}>
                {isCompleting ? "Completando..." : "Marcar como completada"}
              </Button>
            </form>
          </div>
        </>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
