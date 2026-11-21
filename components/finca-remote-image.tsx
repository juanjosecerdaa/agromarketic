"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

export function FincaRemoteImage({
  src,
  alt,
  sizes,
  className,
  fallback,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className: string;
  fallback: ReactNode;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || src === failedSrc) {
    return fallback;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
