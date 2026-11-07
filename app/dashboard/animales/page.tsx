import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  MapPin,
  Package,
  Pencil,
  Plus,
} from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=900&q=80";

const animalTypeLabels = {
  INDIVIDUAL: "Individual",
  LOT: "Lote",
} as const;

const animalSexLabels = {
  MALE: "Macho",
  FEMALE: "Hembra",
  MIXED: "Mixto",
  UNKNOWN: "No especificado",
} as const;

const animalStatusLabels = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  INACTIVE: "Inactivo",
} as const;

const animalStatusStyles = {
  AVAILABLE: "bg-[#e1efdf] text-forest",
  RESERVED: "bg-amber-100 text-amber-800",
  SOLD: "bg-slate-100 text-slate-700",
  INACTIVE: "bg-red-100 text-red-700",
} as const;

function formatPrice(value: { toString(): string }, currency: string) {
  const amount = Number(value.toString());

  if (!Number.isFinite(amount)) {
    return "Precio no disponible";
  }

  const prefix = currency === "NIO" ? "C$ " : `${currency} `;
  return `${prefix}${amount.toLocaleString("es-NI", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("es-NI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function MyAnimalsPage() {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/dashboard/animales");
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (!session.user.roles.includes(ROLES.FARMER)) {
    redirect("/catalogo");
  }

  const [fincas, animals] = await prisma.$transaction([
    prisma.finca.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        name: true,
        status: true,
      },
    }),
    prisma.animal.findMany({
      where: {
        finca: {
          ownerId: session.user.id,
        },
      },
      include: {
        category: {
          select: { name: true },
        },
        finca: {
          select: {
            name: true,
            municipality: {
              select: {
                name: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        images: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 1,
          select: { url: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const displayName = session.user.name?.trim() || session.user.email || "Usuario";
  const finca = fincas[0];

  return (
    <DashboardShell
      userName={displayName}
      fincaName={finca?.name}
      fincaStatus={finca?.status}
    >
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-forest"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
          </Link>
          <p className="mt-7 text-sm text-ink/45">Gestión de publicaciones</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold">
            Mis animales
          </h2>
          <p className="mt-2 text-sm text-ink/55">
            {animals.length}{" "}
            {animals.length === 1 ? "publicación propia" : "publicaciones propias"}
          </p>
        </div>
        <Link href="/dashboard/animales/nuevo">
          <Button>
            <Plus className="h-4 w-4" /> Publicar animal
          </Button>
        </Link>
      </div>

      {animals.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-center sm:p-12">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5f0df] text-forest">
            <Package className="h-7 w-7" />
          </div>
          <h3 className="mt-5 font-display text-2xl font-extrabold">
            Aún no has publicado animales
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-ink/55">
            Publica tu primer animal para comenzar a mostrarlo en AgroMarketNIC.
          </p>
          <Link href="/dashboard/animales/nuevo">
            <Button className="mt-6">Publicar mi primer animal</Button>
          </Link>
        </section>
      ) : (
        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {animals.map((animal) => {
            const name =
              animal.name?.trim() ||
              animal.identifier?.trim() ||
              "Animal sin nombre";
            const statusLabel = animalStatusLabels[animal.status];
            const statusStyle = animalStatusStyles[animal.status];

            return (
              <article
                key={animal.id}
                className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft"
              >
                <div className="relative h-52 overflow-hidden bg-cream">
                  <img
                    src={animal.images[0]?.url || FALLBACK_IMAGE}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                  <span
                    className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-ink/50">
                        {animal.category.name}
                      </p>
                      <h3 className="mt-1 font-display text-xl font-extrabold">
                        {name}
                      </h3>
                    </div>
                    <p className="whitespace-nowrap font-display text-lg font-extrabold text-forest">
                      {formatPrice(animal.price, animal.currency)}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2 border-y border-ink/10 py-4 text-sm text-ink/60">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-terracotta" />
                      {animal.finca.name}
                    </p>
                    <p>
                      {animalTypeLabels[animal.type]} ·{" "}
                      {animalSexLabels[animal.sex]}
                    </p>
                    {animal.identifier?.trim() && (
                      <p>Identificador: {animal.identifier.trim()}</p>
                    )}
                    <p>Publicado el {formatDate(animal.createdAt)}</p>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Link href={`/animal/${animal.id}`}>
                      <Button variant="outline" className="w-full">
                        <Eye className="h-4 w-4" /> Ver publicación
                      </Button>
                    </Link>
                    <Link href={`/dashboard/animales/${animal.id}/editar`}>
                      <Button variant="ghost" className="w-full">
                        <Pencil className="h-4 w-4" /> Editar
                      </Button>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </DashboardShell>
  );
}
