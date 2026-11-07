"use client";

import Link from "next/link";
import { Bell, Menu, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

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
      className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-white"
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-forest hover:bg-white"
        aria-expanded={open}
        aria-controls="mobile-site-menu"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 top-20 z-[50] bg-black/25"
            aria-label="Cerrar menú"
            onClick={closeMenu}
          />
          <aside
            id="mobile-site-menu"
            className="fixed bottom-0 left-0 top-20 z-[60] box-border flex w-[min(88vw,360px)] max-w-[100vw] flex-col overflow-y-auto rounded-r-2xl border border-l-0 border-ink/10 bg-cream p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl"
          >
            <nav className="grid gap-1">
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
                  <MessageCircle className="mr-1 inline-block h-4 w-4" /> Mensajes
                  {unreadCount > 0 && (
                    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-terracotta px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </MobileLink>
              )}
              {role && role !== "ADMIN" && (
                <MobileLink href="/notificaciones" onNavigate={closeMenu}>
                  <Bell className="mr-1 inline-block h-4 w-4" /> Notificaciones
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
              className="mt-3 flex flex-col gap-2 border-t border-ink/10 pt-3 min-[360px]:flex-row"
            >
              <Input
                name="buscar"
                maxLength={100}
                placeholder="Buscar animales..."
                aria-label="Buscar animales"
              />
              <Button type="submit" className="w-full min-[360px]:w-auto">
                Buscar
              </Button>
            </form>

            <div className="mt-3 border-t border-ink/10 pt-3">
              {role ? (
                <>
                  <p className="px-3 text-sm font-semibold">{displayName}</p>
                  <p className="px-3 py-1 text-xs text-ink/50">
                    {roleLabels[role]}
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
                <MobileLink href="/login" onNavigate={closeMenu}>
                  Ingresar
                </MobileLink>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
