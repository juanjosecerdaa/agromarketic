import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { PasswordForm } from "@/app/dashboard/configuracion/password-form";
import { ProfileForm } from "@/app/dashboard/configuracion/profile-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/cuenta");
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (session.user.roles.includes(ROLES.FARMER)) {
    redirect("/dashboard/configuracion");
  }

  if (!session.user.roles.includes(ROLES.BUYER)) {
    redirect("/catalogo");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      phone: true,
      email: true,
      roles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login?callbackUrl=/cuenta");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
        <div>
          <p className="text-sm text-ink/45">Cuenta personal</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">
            Mi cuenta
          </h1>
          <p className="mt-3 text-ink/55">
            Actualiza la información básica de tu cuenta.
          </p>
        </div>

        <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold">
            Información personal
          </h2>
          <ProfileForm name={user.name} phone={user.phone ?? ""} />

          <div className="mt-8 border-t border-ink/10 pt-6">
            <p className="text-sm font-semibold">Correo electrónico</p>
            <p className="mt-2 text-sm text-ink/65">{user.email}</p>
            <p className="mt-2 text-xs text-ink/50">
              El cambio de correo se implementará posteriormente.
            </p>
          </div>

          <div className="mt-6 border-t border-ink/10 pt-6">
            <h2 className="font-display text-xl font-bold">Seguridad</h2>
            <p className="mt-2 text-sm text-ink/55">
              Actualiza tu contraseña con tu contraseña actual.
            </p>
            <PasswordForm />
          </div>

          <div className="mt-6 border-t border-ink/10 pt-6">
            <p className="text-sm font-semibold">Roles de la cuenta</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.roles.map(({ role }) => (
                <Badge key={role.name}>{role.name}</Badge>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
