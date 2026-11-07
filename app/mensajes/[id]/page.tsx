import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { MarkConversationRead } from "@/components/mark-conversation-read";
import { MessageForm } from "@/components/message-form";
import { SiteHeader } from "@/components/site-header";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels = {
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  ARCHIVED: "Archivada",
} as const;

function formatDate(value: Date) {
  return value.toLocaleString("es-NI", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect(`/login?callbackUrl=/mensajes/${id}`);
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (
    !session.user.roles.includes(ROLES.BUYER) &&
    !session.user.roles.includes(ROLES.FARMER)
  ) {
    notFound();
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
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
          id: true,
          name: true,
          identifier: true,
          finca: { select: { name: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderId: true,
          content: true,
          type: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conversation) {
    notFound();
  }

  const animalName =
    conversation.animal?.name?.trim() ||
    conversation.animal?.identifier?.trim() ||
    "Publicación sin nombre";
  const otherParticipant =
    conversation.buyerId === session.user.id
      ? conversation.seller.name
      : conversation.buyer.name;

  return (
    <>
      <SiteHeader />
      <MarkConversationRead conversationId={conversation.id} />
      <main className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
        <Link
          href="/mensajes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-forest"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a mensajes
        </Link>
        <div className="mt-7 rounded-3xl border border-ink/10 bg-white p-6 shadow-soft md:p-8">
          <div className="flex flex-col justify-between gap-3 border-b border-ink/10 pb-5 sm:flex-row">
            <div>
              <p className="text-xs font-semibold text-ink/45">
                {conversation.animal?.finca.name ?? "Publicación"}
              </p>
              <h1 className="mt-1 font-display text-2xl font-extrabold">
                {animalName}
              </h1>
              <p className="mt-1 text-sm text-ink/55">
                Conversación con {otherParticipant?.trim() || "Usuario"}
              </p>
            </div>
            <span className="h-fit rounded-full bg-[#e1efdf] px-3 py-1 text-xs font-bold text-forest">
              {statusLabels[conversation.status]}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {conversation.messages.length === 0 ? (
              <p className="rounded-xl bg-cream p-5 text-center text-sm text-ink/50">
                Escribe el primer mensaje de esta conversación.
              </p>
            ) : (
              conversation.messages.map((message) => {
                const ownMessage = message.senderId === session.user.id;

                return (
                  <div
                    key={message.id}
                    className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        ownMessage
                          ? "bg-forest text-white"
                          : "bg-cream text-ink"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {message.content}
                      </p>
                      <p
                        className={`mt-2 text-[11px] ${
                          ownMessage ? "text-white/65" : "text-ink/40"
                        }`}
                      >
                        {formatDate(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <MessageForm
            conversationId={conversation.id}
            disabled={conversation.status !== "OPEN"}
          />
        </div>
      </main>
    </>
  );
}
