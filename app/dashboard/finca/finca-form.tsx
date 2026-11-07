"use client";

import { useActionState, useMemo, useState } from "react";
import { MapPin, Trees } from "lucide-react";

import { Button, Input } from "@/components/ui";
import { createFinca, type FincaFormState } from "./actions";

type MunicipalityOption = {
  id: string;
  name: string;
};

type DepartmentOption = {
  id: string;
  name: string;
  municipalities: MunicipalityOption[];
};

const initialState: FincaFormState = {};

export function FincaForm({
  departments,
}: {
  departments: DepartmentOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createFinca,
    initialState,
  );
  const [departmentId, setDepartmentId] = useState("");

  const municipalities = useMemo(
    () =>
      departments.find((department) => department.id === departmentId)
        ?.municipalities ?? [],
    [departmentId, departments],
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

      <label className="text-sm font-semibold sm:col-span-2">
        Nombre de la finca
        <div className="relative mt-2">
          <Trees className="absolute left-3 top-3 h-4 w-4 text-ink/35" />
          <Input
            className="pl-10"
            name="name"
            placeholder="Finca Los Pinos"
            maxLength={120}
            required
          />
        </div>
      </label>

      <label className="text-sm font-semibold">
        Departamento
        <select
          className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus:border-leaf"
          name="departmentId"
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          required
        >
          <option value="">Selecciona un departamento</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-semibold">
        Municipio
        <select
          className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus:border-leaf disabled:bg-ink/5"
          name="municipalityId"
          disabled={!departmentId}
          required
        >
          <option value="">
            {departmentId
              ? "Selecciona un municipio"
              : "Selecciona primero un departamento"}
          </option>
          {municipalities.map((municipality) => (
            <option key={municipality.id} value={municipality.id}>
              {municipality.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-semibold sm:col-span-2">
        Dirección
        <div className="relative mt-2">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-ink/35" />
          <Input
            className="pl-10"
            name="address"
            placeholder="Comarca, carretera o referencia"
            maxLength={250}
          />
        </div>
      </label>

      <label className="text-sm font-semibold sm:col-span-2">
        Descripción
        <textarea
          className="mt-2 min-h-28 w-full rounded-xl border border-ink/10 bg-white px-3 py-3 text-sm outline-none placeholder:text-ink/35 focus:border-leaf"
          name="description"
          placeholder="Describe brevemente tu finca y su actividad."
          maxLength={2000}
        />
      </label>

      <Button
        className="w-full py-3.5 sm:col-span-2"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Registrando finca..." : "Registrar mi finca"}
      </Button>
    </form>
  );
}
