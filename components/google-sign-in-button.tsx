import { signIn } from "@/auth";

export function isGoogleSignInConfigured() {
  return Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() &&
      process.env.AUTH_GOOGLE_SECRET?.trim(),
  );
}

export function GoogleSignInButton({
  dividerLabel,
}: {
  dividerLabel: string;
}) {
  if (!isGoogleSignInConfigured()) {
    return null;
  }

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/completar-registro" });
  }

  return (
    <>
      <form action={signInWithGoogle} className="mt-6">
        <button
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          type="submit"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5 shrink-0"
            viewBox="0 0 48 48"
            focusable="false"
          >
            <path
              fill="#4285F4"
              d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-2 4.6-4.3 6l6.9 5.4c4-3.7 6-9.1 6-15.1z"
            />
            <path
              fill="#34A853"
              d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.9-5.4c-1.9 1.3-4.3 2-6.6 2-5.1 0-9.4-3.4-11-8.1l-7.1 5.5C9.2 39.6 16 44 24 44z"
            />
            <path
              fill="#FBBC05"
              d="M13 27.6c-.4-1.2-.7-2.5-.7-3.8s.2-2.6.7-3.8l-7.1-5.5C4.7 17.2 4 20.4 4 23.8s.7 6.6 1.9 9.3l7.1-5.5z"
            />
            <path
              fill="#EA4335"
              d="M24 9.6c3 0 5.8 1 7.9 3.1l5.9-5.9C34.2 3.7 29.5 2 24 2 16 2 9.2 6.4 5.9 14.5l7.1 5.5C14.6 13 18.9 9.6 24 9.6z"
            />
          </svg>
          <span>Continuar con Google</span>
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ink/45">
        <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
        <span className="shrink-0">{dividerLabel}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
      </div>
    </>
  );
}
