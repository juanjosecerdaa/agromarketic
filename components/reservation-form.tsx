"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  createReservation,
  type ReservationFormState,
} from "@/app/reservas/actions";

const initialState: ReservationFormState = {};

export function ReservationForm({
  animalId,
  animalName,
  price,
}: {
  animalId: string;
  animalName: string;
  price: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createReservation,
    initialState,
  );

  return (
    <form action={formAction} className="rounded-2xl bg-cream p-5">
      <input type="hidden" name="animalId" value={animalId} />
      <p className="text-sm font-semibold text-ink">
        Solicitar reserva de {animalName}
      </p>
      <div className="mt-5 grid grid-cols-3 gap-4 border-y border-ink/10 py-4 text-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
            Cantidad
          </p>
          <p className="mt-1 whitespace-nowrap font-display text-base font-extrabold text-ink">
            1
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
            Precio
          </p>
          <p className="mt-1 whitespace-nowrap font-display text-base font-extrabold text-forest">
            {price}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
            Total
          </p>
          <p className="mt-1 whitespace-nowrap font-display text-base font-extrabold text-forest">
            {price}
          </p>
        </div>
      </div>
      <label className="mt-5 block text-sm font-semibold">
        Nota opcional
        <textarea
          name="message"
          className="mt-2 min-h-20 w-full rounded-xl border border-ink/10 bg-white px-3 py-3 text-sm outline-none placeholder:text-ink/35 focus:border-leaf"
          placeholder="Escribe una consulta breve para el propietario."
          maxLength={1000}
          disabled={isPending}
        />
      </label>
      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-ink/55">
        AgroMarketNIC registra la solicitud. El pago y la entrega se coordinan
        directamente con el propietario.
      </p>
      <Button className="mt-4 w-full" type="submit" disabled={isPending}>
        {isPending ? "Registrando solicitud..." : "Confirmar solicitud"}
      </Button>
    </form>
  );
}
