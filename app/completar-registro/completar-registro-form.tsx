"use client";

import { useActionState } from "react";
import { Building2, Phone, UserRound } from "lucide-react";

import { Button, Input } from "@/components/ui";
import {
  completeGoogleRegistration,
  type CompleteRegistrationState,
} from "./actions";

const initialState: CompleteRegistrationState = {};

export function CompletarRegistroForm() {
  const [state, formAction, isPending] = useActionState(
    completeGoogleRegistration,
    initialState,
  );

  return (
    <form action={formAction} className="mt-7 space-y-6">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-semibold">Elige una opción</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="cursor-pointer rounded-2xl border border-ink/10 bg-white p-5 transition hover:border-forest has-[:checked]:border-2 has-[:checked]:border-forest has-[:checked]:bg-[#f1f7ed] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest">
            <input
              className="sr-only"
              type="radio"
              name="accountType"
              value="FARMER"
              required
            />
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest text-white">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="mt-4 block font-bold">SOY GANADERO</span>
            <span className="mt-1 block text-sm leading-6 text-ink/55">
              Quiero publicar y gestionar animales de mi finca.
            </span>
          </label>

          <label className="cursor-pointer rounded-2xl border border-ink/10 bg-white p-5 transition hover:border-forest has-[:checked]:border-2 has-[:checked]:border-forest has-[:checked]:bg-[#f1f7ed] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest">
            <input
              className="sr-only"
              type="radio"
              name="accountType"
              value="BUYER"
              required
            />
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sand text-forest">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="mt-4 block font-bold">SOY COMPRADOR</span>
            <span className="mt-1 block text-sm leading-6 text-ink/55">
              Quiero explorar publicaciones y contactar ganaderos.
            </span>
          </label>
        </div>
      </fieldset>

      <label className="block text-sm font-semibold">
        Teléfono
        <div className="relative mt-2">
          <Phone
            className="absolute left-3 top-3 h-4 w-4 text-ink/35"
            aria-hidden="true"
          />
          <Input
            className="pl-10"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+505 8888 8888"
            maxLength={30}
            required
          />
        </div>
      </label>

      <Button className="w-full py-3.5" type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Continuar"}
      </Button>
    </form>
  );
}
