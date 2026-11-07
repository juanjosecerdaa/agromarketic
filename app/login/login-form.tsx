"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Eye, LockKeyhole, Mail } from "lucide-react";

import { loginUser, type LoginState } from "./actions";
import { Button, Input } from "@/components/ui";

const initialState: LoginState = {};

export function LoginForm({
  registered,
  callbackUrl,
}: {
  registered: boolean;
  callbackUrl?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    loginUser,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}
      {registered && (
        <p
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          Cuenta creada correctamente. Ya puedes iniciar sesión.
        </p>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <label className="block text-sm font-semibold">
        Correo electrónico
        <div className="relative mt-2">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-ink/35" />
          <Input
            className="pl-10"
            name="email"
            placeholder="tu@correo.com"
            type="email"
            autoComplete="email"
            required
          />
        </div>
      </label>

      <label className="block text-sm font-semibold">
        Contraseña
        <div className="relative mt-2">
          <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-ink/35" />
          <Input
            className="pl-10 pr-10"
            name="password"
            placeholder="••••••••"
            type="password"
            autoComplete="current-password"
            required
          />
          <Eye className="absolute right-3 top-3 h-4 w-4 text-ink/35" />
        </div>
      </label>

      <div className="flex justify-end">
        <Link href="/olvide-contrasena" className="text-xs font-bold text-forest">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button className="w-full py-3.5" type="submit" disabled={isPending}>
        {isPending ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}
