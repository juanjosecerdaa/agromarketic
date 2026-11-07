"use client";

import { Heart } from "lucide-react";
import { useFormStatus } from "react-dom";

import { addFavorite, removeFavorite } from "@/app/favoritos/actions";

export function FavoriteButton({
  animalId,
  animalName,
  isFavorite,
}: {
  animalId: string;
  animalName: string;
  isFavorite: boolean;
}) {
  const action = isFavorite ? removeFavorite : addFavorite;

  return (
    <form action={action}>
      <input type="hidden" name="animalId" value={animalId} />
      <FavoriteSubmitButton
        animalName={animalName}
        isFavorite={isFavorite}
      />
    </form>
  );
}

function FavoriteSubmitButton({
  animalName,
  isFavorite,
}: {
  animalName: string;
  isFavorite: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={
        isFavorite
          ? `Quitar ${animalName} de favoritos`
          : `Guardar ${animalName} en favoritos`
      }
      aria-pressed={isFavorite}
      title={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`rounded-full border p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isFavorite
          ? "border-terracotta/30 bg-terracotta/10 text-terracotta"
          : "border-ink/10 bg-white/90 text-ink/60 hover:text-terracotta"
      }`}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
      <span className="sr-only">
        {pending
          ? isFavorite
            ? "Quitando de favoritos"
            : "Guardando en favoritos"
          : isFavorite
            ? "Guardado en favoritos"
            : "No guardado en favoritos"}
      </span>
    </button>
  );
}
