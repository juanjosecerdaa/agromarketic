export const ANIMAL_CATEGORIES = [
  { name: "Ganado Bovino", slug: "ganado-bovino" },
  { name: "Ganado Porcino", slug: "ganado-porcino" },
  { name: "Ganado Equino", slug: "ganado-equino" },
  { name: "Ganado Ovino", slug: "ganado-ovino" },
  { name: "Ganado Caprino", slug: "ganado-caprino" },
  { name: "Aves de Corral", slug: "aves-de-corral" },
] as const;

const categorySlugs: ReadonlySet<string> = new Set(
  ANIMAL_CATEGORIES.map((category) => category.slug),
);

export function isSupportedAnimalCategorySlug(
  value: string,
): value is (typeof ANIMAL_CATEGORIES)[number]["slug"] {
  return categorySlugs.has(value);
}
