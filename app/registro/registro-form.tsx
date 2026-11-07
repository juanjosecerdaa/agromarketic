"use client";

import { useActionState } from "react";
import { Building2, Mail, Phone, UserRound } from "lucide-react";

import { registerUser, type RegistrationState } from "./actions";
import { Button, Input } from "@/components/ui";

const initialState: RegistrationState = {};

export function RegistroForm() {
  const [state, formAction, isPending] = useActionState(
    registerUser,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 grid gap-5 sm:grid-cols-2">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2"
        >
          {state.error}
        </p>
      )}

      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-semibold">Tipo de cuenta</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className="cursor-pointer rounded-2xl border-2 border-forest bg-[#f1f7ed] p-4 text-left has-[:not(:checked)]:border-ink/10 has-[:not(:checked)]:bg-white">
            <input
              className="sr-only"
              type="radio"
              name="accountType"
              value="FARMER"
              defaultChecked
            />
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest text-white">
              <Building2 className="h-5 w-5" />
            </span>
            <b className="mt-3 block">Soy ganadero</b>
            <span className="mt-1 block text-xs text-ink/50">
              Publica y gestiona tus animales
            </span>
          </label>

          <label className="cursor-pointer rounded-2xl border border-ink/10 p-4 text-left hover:border-forest has-[:checked]:border-2 has-[:checked]:border-forest has-[:checked]:bg-[#f1f7ed]">
            <input
              className="sr-only"
              type="radio"
              name="accountType"
              value="BUYER"
            />
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sand text-forest">
              <UserRound className="h-5 w-5" />
            </span>
            <b className="mt-3 block">Soy comprador</b>
            <span className="mt-1 block text-xs text-ink/50">
              Encuentra animales de calidad
            </span>
          </label>
        </div>
      </fieldset>

      <label className="text-sm font-semibold">
        Nombre completo
        <div className="relative mt-2">
          <UserRound className="absolute left-3 top-3 h-4 w-4 text-ink/35" />
          <Input
            className="pl-10"
            name="name"
            placeholder="Carlos Gutiérrez"
            autoComplete="name"
            required
          />
        </div>
      </label>

      <label className="text-sm font-semibold">
        Teléfono
        <div className="relative mt-2">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-ink/35" />
          <Input
            className="pl-10"
            name="phone"
            placeholder="+505 8888 8888"
            autoComplete="tel"
          />
        </div>
      </label>

      <label className="text-sm font-semibold sm:col-span-2">
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

      <label className="text-sm font-semibold">
        Contraseña
        <Input
          className="mt-2"
          name="password"
          placeholder="Mínimo 8 caracteres"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      <label className="text-sm font-semibold">
        Confirmar contraseña
        <Input
          className="mt-2"
          name="confirmPassword"
          placeholder="Repite tu contraseña"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      <div className="sm:col-span-2">
        <label className="flex items-start gap-2 text-xs text-ink/55">
          <input
            name="terms"
            type="checkbox"
            className="mt-0.5 accent-forest"
            required
          />
          Acepto los términos de uso y la política de privacidad.
        </label>
        <Button
          className="mt-6 w-full py-3.5"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Creando cuenta..." : "Crear mi cuenta"}
        </Button>
      </div>
    </form>
  );
}
