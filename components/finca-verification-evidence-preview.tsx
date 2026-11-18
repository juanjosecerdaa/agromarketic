import Image from "next/image";

import { isUploadcareCdnUrl } from "@/lib/uploadcare-url";

export function FincaVerificationEvidencePreview({
  src,
}: {
  src: string;
}) {
  if (!isUploadcareCdnUrl(src)) {
    return null;
  }

  return (
    <div className="relative mt-2 h-48 w-full max-w-2xl overflow-hidden rounded-xl border border-ink/10 bg-cream sm:h-64">
      <Image
        src={src}
        alt="Evidencia visual enviada para verificación de la finca"
        fill
        sizes="(max-width: 640px) 100vw, 672px"
        unoptimized
        className="object-contain p-1"
      />
    </div>
  );
}
