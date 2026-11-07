"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui";
import { sendMessage, type MessageFormState } from "@/app/mensajes/actions";

const initialState: MessageFormState = {};

export function MessageForm({
  conversationId,
  disabled = false,
}: {
  conversationId: string;
  disabled?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    sendMessage,
    initialState,
  );

  return (
    <form action={formAction} className="mt-7 border-t border-ink/10 pt-5">
      <input type="hidden" name="conversationId" value={conversationId} />
      {state.error && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      <label className="sr-only" htmlFor="message-content">
        Mensaje
      </label>
      <textarea
        id="message-content"
        name="content"
        className="min-h-24 w-full rounded-xl border border-ink/10 bg-white px-3 py-3 text-sm outline-none placeholder:text-ink/35 focus:border-leaf"
        placeholder={
          disabled
            ? "Esta conversación no acepta nuevos mensajes."
            : "Escribe tu mensaje..."
        }
        maxLength={2000}
        disabled={disabled || isPending}
        required
      />
      <Button
        className="mt-3 w-full sm:w-auto"
        type="submit"
        disabled={disabled || isPending}
      >
        <Send className="h-4 w-4" />
        {isPending ? "Enviando..." : "Enviar"}
      </Button>
    </form>
  );
}
