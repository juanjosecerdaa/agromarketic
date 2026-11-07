"use client";

import { useActionState } from "react";

import { Button, Input } from "@/components/ui";
import {
  changePassword,
  type PasswordFormState,
} from "./actions";

const initialState: PasswordFormState = {};

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePassword,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 grid gap-5">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {state.success}
        </p>
      )}

      <label className="text-sm font-semibold">
        Contraseña actual
        <Input
          className="mt-2"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
        />
      </label>

      <label className="text-sm font-semibold">
        Nueva contraseña
        <Input
          className="mt-2"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isPending}
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
          disabled={isPending}
        />
      </label>

      <Button className="w-full sm:w-fit" type="submit" disabled={isPending}>
        {isPending ? "Actualizando..." : "Actualizar contraseña"}
      </Button>

      {state.success && (
        <p className="text-xs text-ink/55">
          La sesión actual continúa activa. Cierra sesión cuando termines para
          volver a iniciar con la nueva contraseña.
        </p>
      )}
    </form>
  );
}
