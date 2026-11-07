"use client";

import { useActionState } from "react";
import { Beef, CircleDollarSign, FileText, Tag } from "lucide-react";

import { Button, Input } from "@/components/ui";
import { createAnimal, type AnimalFormState } from "./actions";

type Option = {
  id: string;
  name: string;
};

const initialState: AnimalFormState = {};

const typeOptions = [
  ["INDIVIDUAL", "Animal individual"],
  ["LOT", "Lote"],
] as const;

const sexOptions = [
  ["MALE", "Macho"],
  ["FEMALE", "Hembra"],
  ["MIXED", "Mixto"],
  ["UNKNOWN", "No especificado"],
] as const;

export function AnimalForm({
  fincas,
  categories,
}: {
  fincas: Option[];
  categories: Option[];
}) {
  const [state, formAction, isPending] = useActionState(
    createAnimal,
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

      <label className="text-sm font-semibold">
        Finca
        <select
          className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus:border-leaf"
          name="fincaId"
          required
        >
          <option value="">Selecciona una finca</option>
          {fincas.map((finca) => (
            <option key={finca.id} value={finca.id}>
              {finca.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-semibold">
        Categoría
        <select
          className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus:border-leaf"
          name="categoryId"
          required
        >
          <option value="">Selecciona una categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-semibold">
        Nombre
        <div className="relative mt-2">
          <Beef className="absolute left-3 top-3 h-4 w-4 text-ink/35" />
          <Input
            className="pl-10"
            name="name"
            placeholder="Toro Angus 002"
            maxLength={120}
          />
        </div>
      </label>

      <label className="text-sm font-semibold">
        Identificador
        <div className="relative mt-2">
          <Tag className="absolute left-3 top-3 h-4 w-4 text-ink/35" />
          <Input
            className="pl-10"
            name="identifier"
            placeholder="TAG-002"
            maxLength={120}
          />
        </div>
      </label>

      <label className="text-sm font-semibold">
        Tipo
        <select
          className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus:border-leaf"
          name="type"
          defaultValue="INDIVIDUAL"
          required
        >
          {typeOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-semibold">
        Sexo
        <select
          className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus:border-leaf"
          name="sex"
          defaultValue="UNKNOWN"
          required
        >
          {sexOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-semibold">
        Raza
        <Input
          className="mt-2"
          name="breed"
          placeholder="Brahman"
          maxLength={120}
        />
      </label>

      <label className="text-sm font-semibold">
        Edad aproximada (meses)
        <Input
          className="mt-2"
          name="approximateAgeMonths"
          type="number"
          min={0}
          step={1}
          defaultValue={0}
          required
        />
      </label>

      <label className="text-sm font-semibold">
        Peso (kg)
        <Input
          className="mt-2"
          name="weightKg"
          type="number"
          min={0}
          step="0.01"
          placeholder="430.00"
        />
      </label>

      <label className="text-sm font-semibold">
        Cantidad
        <Input
          className="mt-2"
          name="quantity"
          type="number"
          min={1}
          step={1}
          defaultValue={1}
          required
        />
      </label>

      <label className="text-sm font-semibold">
        Precio
        <div className="relative mt-2">
          <CircleDollarSign className="absolute left-3 top-3 h-4 w-4 text-ink/35" />
          <Input
            className="pl-10"
            name="price"
            type="number"
            min={0}
            step="0.01"
            placeholder="48000.00"
            required
          />
        </div>
      </label>

      <label className="text-sm font-semibold">
        Moneda
        <select
          className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus:border-leaf"
          name="currency"
          defaultValue="NIO"
          required
        >
          <option value="NIO">Córdobas nicaragüenses (NIO)</option>
        </select>
      </label>

      <label className="text-sm font-semibold sm:col-span-2">
        Descripción
        <div className="relative mt-2">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-ink/35" />
          <textarea
            className="min-h-28 w-full rounded-xl border border-ink/10 bg-white px-3 py-3 pl-10 text-sm outline-none placeholder:text-ink/35 focus:border-leaf"
            name="description"
            placeholder="Describe el animal, su estado o información relevante."
            maxLength={2000}
          />
        </div>
      </label>

      <Button
        className="w-full py-3.5 sm:col-span-2"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Publicando animal..." : "Publicar animal"}
      </Button>
    </form>
  );
}
