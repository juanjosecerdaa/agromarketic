import Link from "next/link";
import Image from "next/image";
import { Bell, ChartNoAxesCombined, ClipboardList, Home, LayoutDashboard, MessageCircle, Package, Settings, Sprout, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DashboardShell({
  children,
  admin = false,
  userName,
  fincaName,
  fincaStatus,
  unreadCount,
  pendingReservationCount,
}: {
  children: React.ReactNode;
  admin?: boolean;
  userName?: string;
  fincaName?: string | null;
  fincaStatus?: string | null;
  unreadCount?: number;
  pendingReservationCount?: number;
}) {
  const resolvedUnreadCount =
    unreadCount ??
    (admin
      ? 0
      : await (async () => {
          const session = await auth();
          return session?.user?.status === "ACTIVE"
            ? prisma.message.count({
                where: {
                  recipientId: session.user.id,
                  readAt: null,
                },
              })
            : 0;
        })());
  const resolvedPendingReservationCount =
    pendingReservationCount ??
    (admin
      ? 0
      : await (async () => {
          const session = await auth();
          return session?.user?.status === "ACTIVE"
            ? prisma.reservation.count({
                where: {
                  sellerId: session.user.id,
                  status: "PENDING",
                },
              })
            : 0;
        })());
  const resolvedNotificationCount =
    admin
      ? 0
      : await (async () => {
          const session = await auth();
          return session?.user?.status === "ACTIVE"
            ? prisma.notification.count({
                where: {
                  userId: session.user.id,
                  readAt: null,
                },
              })
            : 0;
        })();
  const links: Array<[string | null, string, LucideIcon]> = admin
    ? [
        ["/admin", "Resumen", LayoutDashboard],
        ["/admin/usuarios", "Usuarios", UserRound],
        ["/admin/fincas", "Fincas", Home],
        ["/admin/animales", "Publicaciones", Package],
        ["/admin/reservas", "Reservas", ClipboardList],
      ]
    : [
        ["/dashboard", "Resumen", LayoutDashboard],
        ["/dashboard/animales", "Mis animales", Package],
        ["/mensajes", "Mensajes", MessageCircle],
        ["/dashboard/reservas", "Reservas", Package],
        ["/dashboard/finca", "Mi finca", Home],
        ["/dashboard/configuracion", "Configuración", Settings],
      ];
  const displayName = userName?.trim() || "Usuario";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const fincaLabel = fincaName?.trim() || "Sin finca registrada";
  const statusLabel =
    fincaStatus === "VERIFIED"
      ? "Finca verificada"
      : fincaStatus === "ACTIVE"
        ? "Finca activa"
        : fincaStatus === "INACTIVE"
          ? "Finca inactiva"
          : admin
            ? "Administrador"
            : "Configura tu finca";

  return <div className="min-h-screen bg-[#f3f4ef]"><aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-forest p-5 text-white lg:flex"><Link href="/" className="flex h-12 w-full items-center justify-center rounded-xl bg-white/90 px-2"><Image src="/logo.png" alt="AgroMarketNIC" width={190} height={127} className="-my-10 h-[127px] w-[190px] object-contain" priority /></Link><div className="mt-10 rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/50">{admin ? "Sesión activa" : "Finca seleccionada"}</p><p className="mt-1 font-semibold">{fincaLabel}</p><p className="mt-1 text-xs text-white/60">{statusLabel}</p></div><nav className="mt-8 flex flex-1 flex-col gap-1">{links.map(([href, label, Icon]) => href ? <Link href={href} key={label} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/65 hover:bg-white/10 hover:text-white"><Icon className="h-4 w-4" />{label}{label === "Mensajes" && resolvedUnreadCount > 0 && <span className="ml-auto min-w-5 rounded-full bg-terracotta px-1.5 py-0.5 text-center text-[10px] font-bold text-white" aria-label={`${resolvedUnreadCount} ${resolvedUnreadCount === 1 ? "mensaje no leído" : "mensajes no leídos"}`}>{resolvedUnreadCount}</span>}{label === "Reservas" && resolvedPendingReservationCount > 0 && <span className="ml-auto min-w-5 rounded-full bg-terracotta px-1.5 py-0.5 text-center text-[10px] font-bold text-white" aria-label={`${resolvedPendingReservationCount} ${resolvedPendingReservationCount === 1 ? "solicitud pendiente" : "solicitudes pendientes"}`}>{resolvedPendingReservationCount}</span>}</Link> : <span key={label} aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/35"><Icon className="h-4 w-4" />{label}<span className="ml-auto text-[10px]">Próximamente</span></span>)}</nav><Link href="/" className="flex items-center gap-3 px-3 py-3 text-sm text-white/60 hover:text-white"><Sprout className="h-4 w-4" />Volver al marketplace</Link></aside><div className="lg:pl-64"><header className="flex h-20 items-center justify-between border-b border-ink/10 bg-white px-5 lg:px-10"><div><p className="text-sm text-ink/45">Buenos días, {displayName}</p><h1 className="font-display text-xl font-extrabold text-ink">{admin ? "Centro de administración" : "Resumen de tu finca"}</h1></div><div className="flex items-center gap-3"><Link href={admin ? "/admin" : "/notificaciones"} aria-label="Notificaciones" className="relative rounded-xl p-2 text-ink/50 hover:bg-cream"><Bell className="h-5 w-5" />{!admin && resolvedNotificationCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-terracotta px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{resolvedNotificationCount}</span>}</Link><div className="flex items-center gap-3 border-l border-ink/10 pl-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#d9e8d1] text-sm font-bold text-forest">{initials}</div><span className="hidden text-sm font-semibold sm:block">{displayName}</span></div></div></header><main className="p-5 lg:p-10">{children}</main></div></div>;
}
