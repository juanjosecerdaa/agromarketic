"use client";

import { useActionState } from "react";

import {
  reactivateUser,
  suspendUser,
  type UserStatusActionState,
} from "@/app/admin/usuarios/actions";

const initialState: UserStatusActionState = {};

export function AdminUserAction({
  userId,
  operation,
}: {
  userId: string;
  operation: "suspend" | "reactivate";
}) {
  const action = async (
    _previousState: UserStatusActionState,
    formData: FormData,
  ) =>
    operation === "suspend"
      ? suspendUser(formData)
      : reactivateUser(formData);
  const [state, formAction, pending] = useActionState(action, initialState);
  const isSuspending = operation === "suspend";
  const confirmation = isSuspending
    ? "Esta cuenta no podrá iniciar nuevas sesiones mientras permanezca suspendida. No se eliminará ninguno de sus datos."
    : "Esta cuenta podrá volver a iniciar sesión.";

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(confirmation)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
            isSuspending
              ? "border-terracotta/30 text-terracotta hover:bg-[#fff0df]"
              : "border-forest/30 text-forest hover:bg-[#e5f0df]"
          } disabled:cursor-wait disabled:opacity-60`}
        >
          {pending
            ? "Procesando..."
            : isSuspending
              ? "Suspender"
              : "Reactivar"}
        </button>
      </form>
      {state.error && (
        <p className="mt-2 max-w-48 text-xs font-semibold text-terracotta" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
