import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { isUploadcareCdnUrl } from "@/lib/uploadcare-url";
import { FincaIdentityImageManager } from "./identity-image-manager";
import { EditFincaForm } from "./edit-finca-form";

export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function EditFincaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect(`/login?callbackUrl=/dashboard/finca/${id}/editar`);
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (!session.user.roles.includes(ROLES.FARMER)) {
    redirect("/catalogo");
  }

  if (!isUuid(id)) {
    notFound();
  }

  const [finca, departments] = await prisma.$transaction([
    prisma.finca.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        departmentId: true,
        municipalityId: true,
        images: {
          where: { animalId: null, type: { in: ["PRIMARY", "GALLERY"] } },
          orderBy: { createdAt: "desc" },
          select: { url: true, type: true },
        },
      },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        municipalities: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  if (!finca) {
    notFound();
  }

  const profileImage = finca.images.find(
    (image) =>
      image.type === "PRIMARY" && isUploadcareCdnUrl(image.url),
  );
  const coverImage = finca.images.find(
    (image) =>
      image.type === "GALLERY" && isUploadcareCdnUrl(image.url),
  );

  return (
    <main className="min-h-screen bg-cream px-5 py-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-center justify-between gap-4 sm:mb-6">
          <Link
            href="/dashboard/finca"
            aria-label="AgroMarketNIC — volver a mis fincas"
            className="inline-flex min-w-0 items-center"
          >
            <Image
              src="/logo.png"
              alt="AgroMarketNIC"
              width={180}
              height={120}
              className="h-auto w-[132px] object-contain sm:w-[160px]"
              priority
            />
          </Link>
          <Link
            href="/dashboard/finca"
            className="shrink-0 text-sm font-semibold text-ink/50 hover:text-forest"
          >
            Volver a mis fincas
          </Link>
        </header>
        <div className="rounded-3xl border border-ink/10 bg-white p-7 shadow-soft md:p-10">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
            Gestión de finca
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
            Editar finca
          </h1>
          <p className="mt-2 text-sm text-ink/55 sm:text-base">
            Actualiza únicamente la información editable de esta finca.
          </p>
          <EditFincaForm
            departments={departments}
            values={{
              fincaId: finca.id,
              name: finca.name,
              description: finca.description ?? "",
              address: finca.address ?? "",
              departmentId: finca.departmentId,
              municipalityId: finca.municipalityId,
            }}
          >
            <FincaIdentityImageManager
              fincaId={finca.id}
              fincaName={finca.name}
              profileImageUrl={profileImage?.url ?? null}
              hasProfileImage={finca.images.some(
                (image) => image.type === "PRIMARY",
              )}
              coverImageUrl={coverImage?.url ?? null}
              hasCoverImage={finca.images.some(
                (image) => image.type === "GALLERY",
              )}
            />
          </EditFincaForm>
        </div>
      </div>
    </main>
  );
}
