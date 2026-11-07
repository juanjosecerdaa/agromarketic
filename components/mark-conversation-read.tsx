"use client";

import { useEffect } from "react";

import { markConversationAsRead } from "@/app/mensajes/actions";

export function MarkConversationRead({
  conversationId,
}: {
  conversationId: string;
}) {
  useEffect(() => {
    void markConversationAsRead(conversationId);
  }, [conversationId]);

  return null;
}
