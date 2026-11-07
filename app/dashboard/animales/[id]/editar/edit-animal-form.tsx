"use client";

import { useActionState } from "react";
import { Beef, CircleDollarSign, FileText, Tag } from "lucide-react";

import { Button, Input } from "@/components/ui";
import {
  deactivateAnimal,
  reactivateAnimal,
  updateAnimal,
  type EditAnimalFormState,
} from "./actions";
import { AnimalImageManager } from "./animal-image-manager";

type Option = {
  id: string;
  name: string;
};

type AnimalValues = {
  animalId: string;
  fincaId: string;
  categoryId: string;
  name: string;
  identifier: string;
  type: "INDIVIDUAL" | "LOT";
  sex: "MALE" | "FEMALE" | "MIXED" | "UNKNOWN";
  breed: string;
  approximateAgeMonths: string;
  weightKg: string;
  quantity: string;
  price: string;
  currency: "NIO";
  description: string;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "INACTIVE";
};

const initialState: EditAnimalFormState = {};

const typeOptions = [
  ["INDIVIDUAL", "Individual"],
  ["LOT", "Lote"],
] as const;

const sexOptions = [
  ["MALE", "Macho"],
  ["FEMALE", "Hembra"],
  ["MIXED", "Mixto"],
  ["UNKNOWN", "No especificado"],
] as const;

const statusLabels = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  INACTIVE: "Inactivo",
} as const;

export function EditAnimalForm({
  values,
  fincas,
  categories,
  images,
  isNewPublication,
}: {
  values: AnimalValues;
  fincas: Option[];
  categories: Option[];
  images: Array<{
    id: string;
    url: string;
    type: "PRIMARY" | "GALLERY" | "DOCUMENT";
  }>;
  isNewPublication: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateAnimal,
    initialState,
  );
  const [statusState, statusAction, isStatusPending] = useActionState(
    values.status === "AVAILABLE" ? deactivateAnimal : reactivateAnimal,
    initialState,
  );

  return (
    <>
      <section className="mt-8 rounded-2xl border border-ink/10 bg-cream p-4 sm:p-6">
        <h2 className="font-display text-xl font-bold">Información del animal</h2>
        <p className="mt-2 text-sm text-ink/55">
          Estos cambios actualizan los datos de la publicación.
        </p>

        <form action={formAction} className="mt-6 grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="animalId" value={values.animalId} />

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
              defaultValue={values.fincaId}
              required
            >
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
              defaultValue={values.categoryId}
              required
            >
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
                defaultValue={values.name}
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
                defaultValue={values.identifier}
                maxLength={120}
              />
            </div>
          </label>

          <label className="text-sm font-semibold">
            Tipo
            <select
              className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus:border-leaf"
              name="type"
              defaultValue={values.type}
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
              defaultValue={values.sex}
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
              defaultValue={values.breed}
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
              defaultValue={values.approximateAgeMonths}
              required
            />
          </label>

          <label className="text-sm font-semibold">
            Peso (kg)
            <Input
              className="mt-2"
              name="weightKg"
              type="number"
              min={0.01}
              step="0.01"
              defaultValue={values.weightKg}
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
              defaultValue={values.quantity}
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
                defaultValue={values.price}
                required
              />
            </div>
          </label>

          <label className="text-sm font-semibold">
            Moneda
            <select
              className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus:border-leaf"
              name="currency"
              defaultValue={values.currency}
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
                defaultValue={values.description}
                maxLength={2000}
              />
            </div>
          </label>

          <Button
            className="w-full py-3.5 sm:col-span-2"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Guardando cambios..." : "Guardar cambios"}
          </Button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-4 sm:p-6">
        <h2 className="font-display text-xl font-bold">Estado de publicación</h2>
        <p className="mt-3 text-sm font-semibold">
          Estado actual: {statusLabels[values.status]}
        </p>
      {values.status === "AVAILABLE" && (
        <>
          <p className="mt-2 text-sm text-ink/55">
            Desactiva esta publicación para retirarla temporalmente del catálogo.
          </p>
          <form action={statusAction} className="mt-4">
            <input type="hidden" name="animalId" value={values.animalId} />
            {statusState.error && (
              <p role="alert" className="mb-3 text-sm text-red-700">
                {statusState.error}
              </p>
            )}
            {statusState.success && (
              <p role="status" className="mb-3 text-sm text-green-700">
                {statusState.success}
              </p>
            )}
            <Button type="submit" variant="outline" disabled={isStatusPending}>
              {isStatusPending ? "Desactivando..." : "Desactivar publicación"}
            </Button>
          </form>
        </>
      )}
      {values.status === "INACTIVE" && (
        <>
          <p className="mt-2 text-sm text-ink/55">
            Reactiva esta publicación para volver a mostrarla como disponible.
          </p>
          <form action={statusAction} className="mt-4">
            <input type="hidden" name="animalId" value={values.animalId} />
            {statusState.error && (
              <p role="alert" className="mb-3 text-sm text-red-700">
                {statusState.error}
              </p>
            )}
            {statusState.success && (
              <p role="status" className="mb-3 text-sm text-green-700">
                {statusState.success}
              </p>
            )}
            <Button type="submit" disabled={isStatusPending}>
              {isStatusPending ? "Reactivando..." : "Reactivar publicación"}
            </Button>
          </form>
        </>
      )}
      {values.status === "RESERVED" && (
        <p className="mt-2 text-sm text-ink/55">
          El estado Reservado se gestiona mediante la reserva confirmada.
        </p>
      )}
      {values.status === "SOLD" && (
        <p className="mt-2 text-sm text-ink/55">
          El estado Vendido se estableció al completar la operación.
        </p>
      )}
      </section>
      <AnimalImageManager
        animalId={values.animalId}
        images={images}
        isNewPublication={isNewPublication}
      />
    </>
  );
}
