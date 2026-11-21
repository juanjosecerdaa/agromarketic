import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
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

function getDisplayName(name: string) {
  return name.trim() || "Usuario";
}

function getInitials(name: string) {
  return (
    getDisplayName(name)
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"
  );
}

function getAvatarUrl(image: string | null) {
  if (!image) {
    return null;
  }

  if (image.startsWith("/") && !image.startsWith("//")) {
    return image;
  }

  try {
    const url = new URL(image);
    return url.protocol === "https:" ? image : null;
  } catch {
    return null;
  }
}

function ParticipantAvatar({
  name,
  image,
  size = "message",
}: {
  name: string;
  image: string | null;
  size?: "header" | "message";
}) {
  const imageUrl = getAvatarUrl(image);
  const dimensions =
    size === "header"
      ? { className: "h-12 w-12 text-sm", pixels: 48 }
      : { className: "h-8 w-8 text-xs", pixels: 32 };

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#d9e8d1] font-bold text-forest ${dimensions.className}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          width={dimensions.pixels}
          height={dimensions.pixels}
          unoptimized
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
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
      buyer: { select: { name: true, image: true } },
      seller: { select: { name: true, image: true } },
      animal: {
        select: {
          id: true,
          name: true,
          identifier: true,
          finca: { select: { id: true, name: true } },
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
          sender: { select: { name: true, image: true } },
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
      ? conversation.seller
      : conversation.buyer;
  const currentParticipant =
    conversation.buyerId === session.user.id
      ? conversation.buyer
      : conversation.seller;
  const otherParticipantName = getDisplayName(otherParticipant.name);
  const currentParticipantName = getDisplayName(currentParticipant.name);
  const otherParticipantProfileHref =
    conversation.buyerId === session.user.id && conversation.animal?.finca.id
      ? `/finca/${conversation.animal.finca.id}`
      : null;
  const messageGroups = conversation.messages.reduce<
    Array<{
      senderId: string;
      messages: (typeof conversation.messages)[number][];
    }>
  >((groups, message) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.senderId === message.senderId) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ senderId: message.senderId, messages: [message] });
    }

    return groups;
  }, []);

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
              <p className="break-words text-xs font-semibold text-ink/45">
                {conversation.animal?.finca.name ?? "Publicación"}
              </p>
              <h1 className="mt-1 break-words font-display text-2xl font-extrabold">
                {animalName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {otherParticipantProfileHref ? (
                  <Link
                    href={otherParticipantProfileHref}
                    aria-label={`Ver perfil público de ${otherParticipantName}`}
                  >
                    <ParticipantAvatar
                      name={otherParticipantName}
                      image={otherParticipant.image}
                      size="header"
                    />
                  </Link>
                ) : (
                  <ParticipantAvatar
                    name={otherParticipantName}
                    image={otherParticipant.image}
                    size="header"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs text-ink/45">Conversación con</p>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    {otherParticipantProfileHref ? (
                      <Link
                        href={otherParticipantProfileHref}
                        className="break-words font-semibold text-ink hover:text-forest"
                      >
                        {otherParticipantName}
                      </Link>
                    ) : (
                      <p className="break-words font-semibold text-ink">
                        {otherParticipantName}
                      </p>
                    )}
                    {otherParticipantProfileHref && (
                      <Link
                        href={otherParticipantProfileHref}
                        className="text-xs font-semibold text-forest hover:underline"
                      >
                        Ver perfil
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <span className="h-fit rounded-full bg-[#e1efdf] px-3 py-1 text-xs font-bold text-forest">
              {statusLabels[conversation.status]}
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {messageGroups.length === 0 ? (
              <p className="rounded-xl bg-cream p-5 text-center text-sm text-ink/50">
                Escribe el primer mensaje de esta conversación.
              </p>
            ) : (
              messageGroups.map((group) => {
                const ownMessage = group.senderId === session.user.id;
                const senderName = getDisplayName(group.messages[0].sender.name);
                const senderProfileHref =
                  group.senderId === conversation.sellerId &&
                  conversation.animal?.finca.id
                    ? `/finca/${conversation.animal.finca.id}`
                    : null;

                return (
                  <div
                    key={group.messages[0].id}
                    className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}
                  >
                    {ownMessage ? (
                      <div className="flex max-w-[85%] flex-col items-end gap-1">
                        <div className="flex max-w-full items-center justify-end gap-2">
                          <p className="min-w-0 break-words text-right text-xs font-semibold text-ink/60">
                            {currentParticipantName}
                          </p>
                          <ParticipantAvatar
                            name={currentParticipantName}
                            image={currentParticipant.image}
                          />
                        </div>
                        {group.messages.map((message) => (
                          <div
                            key={message.id}
                            className="max-w-full rounded-2xl bg-forest px-4 py-3 text-white"
                          >
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.content}
                            </p>
                            <p className="mt-2 text-[11px] text-white/65">
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex max-w-[90%] items-start gap-2 sm:max-w-[85%]">
                        {senderProfileHref ? (
                          <Link
                            href={senderProfileHref}
                            aria-label={`Ver perfil público de ${senderName}`}
                          >
                            <ParticipantAvatar
                              name={senderName}
                              image={group.messages[0].sender.image}
                            />
                          </Link>
                        ) : (
                          <ParticipantAvatar
                            name={senderName}
                            image={group.messages[0].sender.image}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="mb-1">
                            {senderProfileHref ? (
                              <Link
                                href={senderProfileHref}
                                className="break-words text-xs font-semibold text-ink/65 hover:text-forest"
                              >
                                {senderName}
                              </Link>
                            ) : (
                              <p className="break-words text-xs font-semibold text-ink/65">
                                {senderName}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            {group.messages.map((message) => (
                              <div
                                key={message.id}
                                className="max-w-full rounded-2xl bg-cream px-4 py-3 text-ink"
                              >
                                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                  {message.content}
                                </p>
                                <p className="mt-2 text-[11px] text-ink/40">
                                  {formatDate(message.createdAt)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
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
