import { cn } from "@/lib/utils";
import type { BrandKit } from "@/lib/brandRegistry";

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
      <img
        src={seloUrl}
        alt={brand.seal.alt}
        className={cn("shrink-0", compact ? "h-6" : "h-8", variant === "vertical" && "h-14")}
        loading="lazy"
        decoding="async"
      />
      {compact ? null : (
        <div className="leading-tight opacity-80">
          <div className="font-medium">Jogue com responsabilidade — 18+</div>
          <div>{brand.seal.license} · {brand.name}</div>
        </div>
      )}
    </div>
  );
}
