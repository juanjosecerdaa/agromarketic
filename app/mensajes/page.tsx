import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels = {
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  ARCHIVED: "Archivada",
} as const;

function formatDate(value: Date) {
  return value.toLocaleDateString("es-NI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function MessagesPage() {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/mensajes");
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (
    !session.user.roles.includes(ROLES.BUYER) &&
    !session.user.roles.includes(ROLES.FARMER)
  ) {
    redirect("/login?callbackUrl=/mensajes");
  }

  const [conversations, unreadMessages] = await prisma.$transaction([
    prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: session.user.id },
          { sellerId: session.user.id },
        ],
      },
      include: {
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
        animal: {
          select: {
            name: true,
            identifier: true,
            finca: { select: { name: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.message.findMany({
      where: {
        recipientId: session.user.id,
        readAt: null,
      },
      select: { conversationId: true },
    }),
  ]);
  const unreadCounts = new Map<string, number>();
  for (const message of unreadMessages) {
    unreadCounts.set(
      message.conversationId,
      (unreadCounts.get(message.conversationId) ?? 0) + 1,
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
        <Link
          href={session.user.roles.includes(ROLES.FARMER) ? "/dashboard" : "/catalogo"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-forest"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <div className="mt-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
              Comunicación
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold">
              Mensajes
            </h1>
            <p className="mt-3 text-ink/55">
              Conversaciones relacionadas con publicaciones reales.
            </p>
          </div>
        </div>

        {conversations.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-leaf" />
            <h2 className="mt-4 font-display text-2xl font-extrabold">
              Aún no tienes conversaciones
            </h2>
            <p className="mt-2 text-sm text-ink/55">
              Las consultas sobre publicaciones aparecerán aquí.
            </p>
            <Link href="/catalogo">
              <Button className="mt-6">Explorar catálogo</Button>
            </Link>
          </section>
        ) : (
          <section className="mt-8 grid gap-4">
            {conversations.map((conversation) => {
              const animalName =
                conversation.animal?.name?.trim() ||
                conversation.animal?.identifier?.trim() ||
                "Publicación sin nombre";
              const participant =
                conversation.buyerId === session.user.id
                  ? conversation.seller.name
                  : conversation.buyer.name;
              const latest = conversation.messages[0];
              const unreadCount = unreadCounts.get(conversation.id) ?? 0;

              return (
                <Link
                  key={conversation.id}
                  href={`/mensajes/${conversation.id}`}
                  className={`rounded-2xl border bg-white p-5 shadow-soft transition hover:border-forest/30 ${
                    unreadCount > 0
                      ? "border-forest/30 ring-1 ring-forest/10"
                      : "border-ink/10"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <p className="text-xs font-semibold text-ink/45">
                        {conversation.animal?.finca.name ?? "Publicación"}
                      </p>
                      <h2 className={`mt-1 font-display text-xl font-extrabold ${unreadCount > 0 ? "text-forest" : ""}`}>
                        {animalName}
                      </h2>
                      <p className="mt-1 text-sm text-ink/55">
                        Conversación con {participant?.trim() || "Usuario"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <span
                          className="rounded-full bg-terracotta px-3 py-1 text-xs font-bold text-white"
                          aria-label={`${unreadCount} ${
                            unreadCount === 1 ? "mensaje nuevo" : "mensajes nuevos"
                          }`}
                        >
                          {unreadCount} {unreadCount === 1 ? "nuevo" : "nuevos"}
                        </span>
                      )}
                      <span className="h-fit rounded-full bg-[#e1efdf] px-3 py-1 text-xs font-bold text-forest">
                        {statusLabels[conversation.status]}
                      </span>
                    </div>
                  </div>
                  {latest && (
                    <div className="mt-4 border-t border-ink/10 pt-4 text-sm text-ink/60">
                      <p className="line-clamp-2">{latest.content}</p>
                      <p className="mt-2 text-xs text-ink/40">
                        {formatDate(latest.createdAt)}
                      </p>
                    </div>
                  )}
                </Link>
              );
            })}
          </section>
        )}
      </main>
    </>
  );
}
