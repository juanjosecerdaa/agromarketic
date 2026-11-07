import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/dashboard/configuracion");
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (!session.user.roles.includes(ROLES.FARMER)) {
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
      finca: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          name: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login?callbackUrl=/dashboard/configuracion");
  }

  const displayName = user.name.trim() || "Ganadero";
  const finca = user.finca[0];

  return (
    <DashboardShell
      userName={displayName}
      fincaName={finca?.name}
      fincaStatus={finca?.status}
    >
      <div>
        <p className="text-sm text-ink/45">Cuenta personal</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">
          Configuración
        </h1>
        <p className="mt-3 text-ink/55">
          Actualiza la información básica de tu cuenta.
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold">Información personal</h2>
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
    </DashboardShell>
  );
}
