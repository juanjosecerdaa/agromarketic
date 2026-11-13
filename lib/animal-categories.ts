export const ANIMAL_CATEGORIES = [
  { name: "Ganado Bovino", slug: "ganado-bovino", image: "/ganado-bovino.jpg" },
  { name: "Ganado Porcino", slug: "ganado-porcino", image: "/ganado-porcino.jpg" },
  { name: "Ganado Equino", slug: "ganado-equino", image: "/ganado-equino.jpg" },
  { name: "Ganado Ovino", slug: "ganado-ovino", image: "/ganado-ovino.jpg" },
  { name: "Ganado Caprino", slug: "ganado-caprino", image: "/ganado-caprino.jpg" },
  { name: "Aves de Corral", slug: "aves-de-corral", image: "/aves-de-corral.jpg" },
] as const;

const categorySlugs: ReadonlySet<string> = new Set(
  ANIMAL_CATEGORIES.map((category) => category.slug),
);

export function isSupportedAnimalCategorySlug(
  value: string,
): value is (typeof ANIMAL_CATEGORIES)[number]["slug"] {
  return categorySlugs.has(value);
}

export function getAnimalCategoryImage(slug: string) {
  return (
    ANIMAL_CATEGORIES.find((category) => category.slug === slug)?.image ??
    "/ganado-bovino.jpg"
  );
}
