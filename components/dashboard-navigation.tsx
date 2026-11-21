"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ClipboardList,
  Home,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Package,
  Settings,
  Sprout,
  UserRound,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type DashboardRole = "ADMIN" | "FARMER";
type NavigationLink = {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  badge?: "messages" | "reservations";
};

const ADMIN_NAVIGATION_LINKS: NavigationLink[] = [
  { href: "/admin", label: "Resumen", Icon: LayoutDashboard },
  { href: "/admin/usuarios", label: "Usuarios", Icon: UserRound },
  { href: "/admin/fincas", label: "Fincas", Icon: Home },
  { href: "/admin/animales", label: "Publicaciones", Icon: Package },
  { href: "/admin/reservas", label: "Reservas", Icon: ClipboardList },
];

const FARMER_NAVIGATION_LINKS: NavigationLink[] = [
  { href: "/", label: "Inicio", Icon: Home },
  { href: "/dashboard", label: "Resumen", Icon: LayoutDashboard },
  { href: "/dashboard/animales", label: "Mis animales", Icon: Package },
  { href: "/mensajes", label: "Mensajes", Icon: MessageCircle, badge: "messages" },
  { href: "/dashboard/reservas", label: "Reservas", Icon: Package, badge: "reservations" },
  { href: "/dashboard/finca", label: "Mi finca", Icon: Home },
  { href: "/dashboard/configuracion", label: "Configuración", Icon: Settings },
];

function getNavigationLinks(role: DashboardRole) {
  return role === "ADMIN" ? ADMIN_NAVIGATION_LINKS : FARMER_NAVIGATION_LINKS;
}

function isActiveLink(pathname: string, href: string, role: DashboardRole) {
  const sectionRoot = role === "ADMIN" ? "/admin" : "/dashboard";
  return (
    pathname === href ||
    (href !== sectionRoot && pathname.startsWith(`${href}/`))
  );
}

function getBadge(count: number, label: string) {
  if (count === 0) {
    return null;
  }

  const accessibleLabel =
    label === "messages"
      ? `${count} ${count === 1 ? "mensaje no leído" : "mensajes no leídos"}`
      : `${count} ${count === 1 ? "solicitud pendiente" : "solicitudes pendientes"}`;

  return (
    <span
      className="ml-auto min-w-5 rounded-full bg-terracotta px-1.5 py-0.5 text-center text-[10px] font-bold text-white"
      aria-label={accessibleLabel}
    >
      {count}
    </span>
  );
}

export function DashboardNavigationLinks({
  role,
  variant,
  unreadCount = 0,
  pendingReservationCount = 0,
  onNavigate,
  className,
}: {
  role: DashboardRole;
  variant: "sidebar" | "drawer";
  unreadCount?: number;
  pendingReservationCount?: number;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const drawer = variant === "drawer";

  return (
    <nav
      aria-label={
        drawer
          ? `Navegación ${role === "ADMIN" ? "de administración" : "de finca"}`
          : `Panel ${role === "ADMIN" ? "de administración" : "de ganadero"}`
      }
      className={cn("flex flex-col gap-1", className)}
    >
      {getNavigationLinks(role).map(({ href, label, Icon, badge }) => {
        const active = isActiveLink(pathname, href, role);
        const badgeCount =
          badge === "messages"
            ? unreadCount
            : badge === "reservations"
              ? pendingReservationCount
              : 0;

        return (
          <Link
            href={href}
            key={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              drawer
                ? active
                  ? "bg-white/20 font-semibold text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
                : active
                  ? "bg-white/15 font-semibold text-white"
                  : "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
            {badge && getBadge(badgeCount, badge)}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardMobileNavigation({
  role,
  unreadCount,
  pendingReservationCount,
}: {
  role: DashboardRole;
  unreadCount: number;
  pendingReservationCount: number;
}) {
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const open = openPathname === pathname;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const admin = role === "ADMIN";
  const areaLabel = admin ? "Administración" : "Panel de ganadero";
  const triggerLabel = admin ? "Abrir menú de administración" : "Abrir menú de finca";
  const marketplaceHref = admin ? "/" : "/catalogo";

  const closeMenu = useCallback((restoreFocus = true) => {
    setOpenPathname(null);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const initialFocusFrame = requestAnimationFrame(() =>
      closeRef.current?.focus(),
    );

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      const firstElement = focusableElements.item(0);
      const lastElement = focusableElements.item(focusableElements.length - 1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(initialFocusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, open]);

  const drawer = (
    <div hidden={!open} className="lg:hidden">
      <button
        type="button"
        aria-label={`Cerrar ${admin ? "menú de administración" : "menú de finca"}`}
        onClick={() => closeMenu()}
        className="fixed inset-0 z-[70] bg-ink/55"
      />
      <aside
        id="dashboard-mobile-navigation"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-mobile-navigation-title"
        className="fixed inset-y-0 left-0 z-[71] flex h-[100dvh] w-[min(20rem,85vw)] flex-col overflow-y-auto overscroll-contain bg-forest px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-white shadow-2xl"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Ir al inicio de AgroMarketNIC"
            onClick={() => closeMenu(false)}
            className="inline-flex h-12 min-w-0 items-center justify-center rounded-xl bg-white/90 px-2"
          >
            <Image
              src="/logo.png"
              alt="AgroMarketNIC"
              width={170}
              height={113}
              className="h-auto w-[150px] object-contain"
            />
          </Link>
          <button
            ref={closeRef}
            type="button"
            aria-label={`Cerrar ${admin ? "menú de administración" : "menú de finca"}`}
            onClick={() => closeMenu()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2
          id="dashboard-mobile-navigation-title"
          className="mt-6 font-display text-xl font-extrabold"
        >
          {areaLabel}
        </h2>
        <DashboardNavigationLinks
          role={role}
          variant="drawer"
          unreadCount={unreadCount}
          pendingReservationCount={pendingReservationCount}
          className="mt-4"
          onNavigate={() => closeMenu(false)}
        />

        <Link
          href={marketplaceHref}
          onClick={() => closeMenu(false)}
          className="mt-auto flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Sprout className="h-4 w-4" />
          Volver al marketplace
        </Link>
      </aside>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-controls="dashboard-mobile-navigation"
        onClick={() =>
          setOpenPathname((current) => (current === pathname ? null : pathname))
        }
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-forest hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>
      {drawer}
    </>
  );
}
