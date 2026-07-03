import { cn } from "@/lib/utils";
import type { BrandKit } from "@/lib/brandRegistry";
import { useState } from "react";

/**
 * Rodapé legal obrigatório para materiais e landing pages.
 * Renderiza selo 18+ + licença SPA/MF da plataforma correta.
 * NUNCA misturar marcas — o selo aqui é sempre da `brand` recebida.
 */
export function BrandFooterSeal({
  brand,
  variant = "horizontal",
  tone = "auto",
  className,
  compact = false,
}: {
  brand: BrandKit | null;
  variant?: "horizontal" | "vertical";
  tone?: "light" | "dark" | "auto";
  className?: string;
  compact?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  if (!brand?.seal) {
    return (
      <div className={cn("text-xs text-destructive font-medium", className)}>
        ⚠ Selo legal ausente — não publicar.
      </div>
    );
  }
  const t = tone === "auto" ? "light" : tone;
  const seloUrl = brand.seal[variant][t];
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        compact ? "text-[10px]" : "text-xs",
        className
      )}
      role="contentinfo"
      aria-label={brand.seal.alt}
    >
      {!imageFailed ? (
        <img
          src={seloUrl}
          alt={brand.seal.alt}
          className={cn("shrink-0", compact ? "h-6" : "h-8", variant === "vertical" && "h-14")}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className={cn("shrink-0 rounded border border-current/25 px-2 py-1 leading-tight font-semibold", compact ? "text-[9px]" : "text-[10px]")}>+18 · {brand.seal.license}</div>
      )}
      {compact ? null : (
        <div className="leading-tight opacity-80">
          <div className="font-medium">Jogue com responsabilidade — 18+</div>
          <div>{brand.seal.license} · {brand.name}</div>
        </div>
      )}
    </div>
  );
}
