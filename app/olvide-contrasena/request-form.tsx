"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, Input } from "@/components/ui";
import {
  requestPasswordReset,
  type PasswordResetRequestState,
} from "./actions";

const initialState: PasswordResetRequestState = {};

export function PasswordResetRequestForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 grid gap-5">
      {state.message && (
        <p
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {state.message}
        </p>
      )}
      <label className="text-sm font-semibold">
        Correo electrónico
        <Input
          className="mt-2"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
        />
      </label>
      <Button type="submit" className="w-full py-3.5" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar instrucciones"}
      </Button>
      <Link href="/login" className="text-center text-sm font-bold text-forest">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
