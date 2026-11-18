import { Check } from "lucide-react";

export function FincaVerificationBadge({
  verified,
}: {
  verified: boolean;
}) {
  if (!verified) {
    return null;
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#b8d7b4] bg-[#e8f4e4] px-3 py-1 text-xs font-bold text-forest">
      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Finca verificada</span>
    </span>
  );
}
