"use client";

import Link from "next/link";
import { Bell, Menu, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

import { logout } from "@/components/auth-actions";
import { Button, Input } from "./ui";

const roleLabels = {
  ADMIN: "Administrador",
  FARMER: "Ganadero",
  BUYER: "Comprador",
} as const;

type PrimaryRole = keyof typeof roleLabels;

function MobileLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex min-h-12 w-full items-center rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
    >
      {children}
    </Link>
  );
}

export function MobileSiteMenu({
  role,
  unreadCount,
  notificationUnreadCount,
  displayName,
}: {
  role: PrimaryRole | null;
  unreadCount: number;
  notificationUnreadCount: number;
  displayName: string;
}) {
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const open = openPathname === pathname;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function closeMenu() {
    setOpenPathname(null);
  }

  const panel =
    open && (
      <aside
        id="mobile-site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 top-20 z-[60] box-border flex min-h-0 w-screen max-w-[100vw] flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-cream px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 shadow-[0_-4px_16px_rgba(24,34,29,0.08)] sm:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <nav className="grid shrink-0 gap-1">
          <MobileLink href="/catalogo" onNavigate={closeMenu}>
            Explorar
          </MobileLink>
          {role === "ADMIN" && (
            <MobileLink href="/admin" onNavigate={closeMenu}>
              Administración
            </MobileLink>
          )}
          {role && role !== "ADMIN" && (
            <MobileLink
              href={role === "FARMER" ? "/dashboard" : "/cuenta"}
              onNavigate={closeMenu}
            >
              Mi cuenta
            </MobileLink>
          )}
          {role && role !== "ADMIN" && (
            <MobileLink href="/mensajes" onNavigate={closeMenu}>
              <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
              Mensajes
              {unreadCount > 0 && (
                <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-terracotta px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </MobileLink>
          )}
          {role && role !== "ADMIN" && (
            <MobileLink href="/notificaciones" onNavigate={closeMenu}>
              <Bell className="mr-2 h-4 w-4 shrink-0" />
              Notificaciones
              {notificationUnreadCount > 0 && (
                <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-terracotta px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {notificationUnreadCount}
                </span>
              )}
            </MobileLink>
          )}
          {role === "BUYER" && (
            <MobileLink href="/reservas" onNavigate={closeMenu}>
              Mis reservas
            </MobileLink>
          )}
          {role === "FARMER" && (
            <MobileLink href="/dashboard" onNavigate={closeMenu}>
              Panel de ganadero
            </MobileLink>
          )}
        </nav>

        <form
          action="/catalogo"
          method="get"
          onSubmit={closeMenu}
          className="mt-4 grid shrink-0 gap-2 border-t border-ink/10 pt-4 min-[380px]:flex"
        >
          <Input
            name="buscar"
            maxLength={100}
            placeholder="Buscar animales..."
            aria-label="Buscar animales"
            className="min-w-0 flex-1"
          />
          <Button type="submit" className="min-h-11 w-full min-[380px]:w-auto">
            Buscar
          </Button>
        </form>

        <div className="mt-4 shrink-0 border-t border-ink/10 pt-4">
          {role ? (
            <>
              <p className="px-3 text-sm font-semibold">{displayName}</p>
              <p className="px-3 py-1 text-xs text-ink/50">
                {roleLabels[role]}
              </p>
              <form action={logout} className="mt-2" onSubmit={closeMenu}>
                <button
                  type="submit"
                  className="min-h-12 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-terracotta hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <MobileLink href="/login" onNavigate={closeMenu}>
              Ingresar
            </MobileLink>
          )}
        </div>
      </aside>
    );

  return (
    <>
      <button
        type="button"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-forest hover:bg-white"
        aria-expanded={open}
        aria-controls="mobile-site-menu"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() =>
          setOpenPathname((current) => (current === pathname ? null : pathname))
        }
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
      {typeof document !== "undefined" &&
        createPortal(panel, document.body)}
    </>
  );
}
