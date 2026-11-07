import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge, Button } from "./ui";
import { FavoriteButton } from "./favorite-button";

export type AnimalCardData = {
  id: string;
  name: string;
  category: string;
  location: string;
  price: string;
  image: string;
  tag: string;
  specs: string[];
  finca: string;
  isFavorite?: boolean;
  showFavorite?: boolean;
};

export function AnimalCard({ animal }: { animal: AnimalCardData }) {
  return <article className="group overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft">
    <div className="relative h-52 overflow-hidden"><img src={animal.image} alt={animal.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute left-3 top-3"><Badge>{animal.tag}</Badge></div>{animal.showFavorite && <div className="absolute right-3 top-3 z-10"><FavoriteButton animalId={animal.id} animalName={animal.name} isFavorite={animal.isFavorite ?? false} /></div>}</div>
    <div className="p-4"><div className="mb-2 flex items-center justify-between text-xs text-ink/50"><span>{animal.category}</span><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{animal.location}</span></div><Link href={`/animal/${animal.id}`} className="font-display font-bold text-ink hover:text-forest">{animal.name}</Link><div className="mt-3 grid grid-cols-3 gap-2 border-y border-ink/10 py-3 text-xs text-ink/60">{animal.specs.map(spec => <span key={spec}>{spec}</span>)}</div><div className="mt-4 flex items-center justify-between"><span className="font-display text-lg font-extrabold text-forest">{animal.price}</span><Link href={`/animal/${animal.id}`}><Button className="px-3 py-2 text-xs">Ver detalle</Button></Link></div></div>
  </article>;
}
