import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  Heart,
  Menu,
  MessageCircle,
  Search,
  UserRound,
} from "lucide-react";

import { auth } from "@/auth";
import { logout } from "@/components/auth-actions";
import { prisma } from "@/lib/prisma";
import { Button, Input } from "./ui";

const roleLabels = {
  ADMIN: "Administrador",
  FARMER: "Ganadero",
  BUYER: "Comprador",
} as const;

function getPrimaryRole(roles: string[]) {
  if (roles.includes("ADMIN")) {
    return "ADMIN";
  }

  if (roles.includes("FARMER")) {
    return "FARMER";
  }

  if (roles.includes("BUYER")) {
    return "BUYER";
  }

  return null;
}

function HeaderLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-ink/65 hover:bg-white"
    >
      {children}
    </Link>
  );
}

function AccountLinks({
  role,
  unreadCount,
  notificationUnreadCount,
  mobile = false,
}: {
  role: keyof typeof roleLabels;
  unreadCount: number;
  notificationUnreadCount: number;
  mobile?: boolean;
}) {
  const className = mobile
    ? "block rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-white"
    : undefined;

  return (
    <>
      {role === "ADMIN" && (
        <Link href="/admin" className={className ?? "rounded-lg px-3 py-2 text-sm font-semibold text-ink/65 hover:bg-white"}>
          Administración
        </Link>
      )}
      {role !== "ADMIN" && (
        <Link href={role === "FARMER" ? "/dashboard" : "/cuenta"} className={className ?? "rounded-lg px-3 py-2 text-sm font-semibold text-ink/65 hover:bg-white"}>
          Mi cuenta
        </Link>
      )}
      {role !== "ADMIN" && (
        <Link href="/mensajes" className={className ?? "rounded-lg px-3 py-2 text-sm font-semibold text-ink/65 hover:bg-white"}>
          <MessageCircle className="mr-1 inline-block h-4 w-4" /> Mensajes
          {unreadCount > 0 && (
            <span
              className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-terracotta px-1.5 py-0.5 text-[10px] font-bold text-white"
              aria-label={`${unreadCount} ${
                unreadCount === 1 ? "mensaje no leído" : "mensajes no leídos"
              }`}
            >
              {unreadCount}
            </span>
          )}
        </Link>
      )}
      {role !== "ADMIN" && (
        <Link href="/notificaciones" className={className ?? "rounded-lg px-3 py-2 text-sm font-semibold text-ink/65 hover:bg-white"}>
          <Bell className="mr-1 inline-block h-4 w-4" /> Notificaciones
          {notificationUnreadCount > 0 && (
            <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-terracotta px-1.5 py-0.5 text-[10px] font-bold text-white">
              {notificationUnreadCount}
            </span>
          )}
        </Link>
      )}
      {role === "BUYER" && (
        <Link href="/reservas" className={className ?? "rounded-lg px-3 py-2 text-sm font-semibold text-ink/65 hover:bg-white"}>
          Mis reservas
        </Link>
      )}
      {role === "FARMER" && mobile && (
        <Link href="/dashboard" className={className}>
          Panel de ganadero
        </Link>
      )}
    </>
  );
}

export async function SiteHeader({ dashboard = false }: { dashboard?: boolean }) {
  const session = await auth();
  const user =
    session?.user?.status === "ACTIVE" && session.user.roles.length > 0
      ? session.user
      : null;
  const primaryRole = user ? getPrimaryRole(user.roles) : null;
  const displayName = user?.name?.trim() || user?.email || "Mi cuenta";
  const [unreadCount, notificationUnreadCount] = user
    ? await Promise.all([
        prisma.message.count({
          where: { recipientId: user.id, readAt: null },
        }),
        prisma.notification.count({
          where: { userId: user.id, readAt: null },
        }),
      ])
    : [0, 0];

  return (
    <header className="border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-4 lg:px-8">
        <Link href="/" className="flex h-12 shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="AgroMarketNIC"
            width={180}
            height={120}
            className="-my-[21px] h-[90px] w-[135px] shrink-0 object-contain sm:h-[107px] sm:w-[160px] sm:-my-[29px] lg:h-[120px] lg:w-[180px] lg:-my-9"
            priority
          />
        </Link>

        {!dashboard && (
          <form
            action="/catalogo"
            method="get"
            className="hidden flex-1 items-center gap-2 rounded-xl bg-white px-3 py-1.5 shadow-sm md:flex"
          >
            <Search className="h-4 w-4 text-ink/40" />
            <Input
              className="h-8 border-0 px-1 shadow-none"
              name="buscar"
              maxLength={100}
              placeholder="Busca por animal, raza o ubicación..."
              aria-label="Buscar animales"
            />
            <button
              type="submit"
              className="border-l border-ink/10 pl-3 text-xs text-ink/45"
            >
              Toda Nicaragua
            </button>
          </form>
        )}

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          <HeaderLink href="/catalogo">Explorar</HeaderLink>
          {primaryRole && (
            <AccountLinks
              role={primaryRole}
              unreadCount={unreadCount}
              notificationUnreadCount={notificationUnreadCount}
            />
          )}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          {primaryRole === "BUYER" && (
            <Link
              href="/favoritos"
              className="rounded-lg p-2 text-ink/65 hover:bg-white"
              aria-label="Ver favoritos"
            >
              <Heart className="h-5 w-5" />
            </Link>
          )}

          {user && primaryRole ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="max-w-40 truncate text-sm font-semibold text-ink">
                  {displayName}
                </p>
                <p className="text-xs text-ink/50">{roleLabels[primaryRole]}</p>
              </div>
              <form action={logout}>
                <Button variant="outline" type="submit">
                  Cerrar sesión
                </Button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-forest/20 bg-white px-4 py-2.5 text-sm font-semibold text-forest hover:border-forest"
            >
              <UserRound className="h-4 w-4" /> Ingresar
            </Link>
          )}
        </div>

        <details className="relative sm:hidden">
          <summary
            className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-xl text-forest hover:bg-white [&::-webkit-details-marker]:hidden"
            aria-label="Abrir menú"
          >
            <Menu />
          </summary>
          <div className="fixed left-0 top-20 z-10 box-border flex max-h-[calc(100dvh-5rem)] w-[min(90vw,360px)] max-w-[100vw] flex-col overflow-y-auto rounded-r-2xl border border-l-0 border-ink/10 bg-cream p-5 shadow-xl">
            <div className="grid gap-1">
              <HeaderLink href="/catalogo">Explorar</HeaderLink>
              {primaryRole && (
                <AccountLinks
                  role={primaryRole}
                  unreadCount={unreadCount}
                  notificationUnreadCount={notificationUnreadCount}
                  mobile
                />
              )}
            </div>
            <form action="/catalogo" method="get" className="mt-3 flex flex-col gap-2 border-t border-ink/10 pt-3 min-[360px]:flex-row">
              <Input
                name="buscar"
                maxLength={100}
                placeholder="Buscar animales..."
                aria-label="Buscar animales"
              />
              <Button type="submit" className="w-full min-[360px]:w-auto">Buscar</Button>
            </form>
            <div className="mt-3 border-t border-ink/10 pt-3">
              {user && primaryRole ? (
                <>
                  <p className="px-3 text-sm font-semibold">{displayName}</p>
                  <p className="px-3 py-1 text-xs text-ink/50">
                    {roleLabels[primaryRole]}
                  </p>
                  <form action={logout} className="mt-2">
                    <button
                      type="submit"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-terracotta hover:bg-white"
                    >
                      Cerrar sesión
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-forest hover:bg-white"
                >
                  Ingresar
                </Link>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
