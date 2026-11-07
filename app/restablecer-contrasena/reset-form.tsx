"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, Input } from "@/components/ui";
import { resetPassword, type PasswordResetState } from "./actions";

const initialState: PasswordResetState = {};

export function PasswordResetForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    resetPassword,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 grid gap-5">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <p>{state.success}</p>
          <Link href="/login" className="mt-2 inline-block font-bold underline">
            Iniciar sesión
          </Link>
        </div>
      )}
      <label className="text-sm font-semibold">
        Nueva contraseña
        <Input
          className="mt-2"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isPending || Boolean(state.success)}
        />
      </label>
      <label className="text-sm font-semibold">
        Confirmar nueva contraseña
        <Input
          className="mt-2"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isPending || Boolean(state.success)}
        />
      </label>
      <Button
        type="submit"
        className="w-full py-3.5"
        disabled={isPending || Boolean(state.success)}
      >
        {isPending ? "Actualizando..." : "Restablecer contraseña"}
      </Button>
    </form>
  );
}
