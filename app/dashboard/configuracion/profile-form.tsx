"use client";

import { useActionState } from "react";

import { Button, Input } from "@/components/ui";
import {
  updateProfile,
  type ProfileFormState,
} from "./actions";

const initialState: ProfileFormState = {};

export function ProfileForm({
  name,
  phone,
}: {
  name: string;
  phone: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateProfile,
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
        Nombre
        <Input
          className="mt-2"
          name="name"
          defaultValue={name}
          autoComplete="name"
          maxLength={120}
          required
          disabled={isPending}
        />
      </label>

      <label className="text-sm font-semibold">
        Teléfono
        <Input
          className="mt-2"
          name="phone"
          defaultValue={phone}
          autoComplete="tel"
          maxLength={30}
          placeholder="+505 8888 8888"
          disabled={isPending}
        />
      </label>

      <Button className="w-full sm:w-fit" type="submit" disabled={isPending}>
        {isPending ? "Guardando cambios..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
