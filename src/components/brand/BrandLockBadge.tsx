import { AlertTriangle, ShieldCheck, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LinkBrandContext } from "@/lib/useLinkBrand";

/**
 * Header/toolbar badge que mostra qual marca está travada no editor atual.
 * Vermelho se a marca não está legalmente pronta (sem selo/licença).
 */
export function BrandLockBadge({
  ctx,
  className,
}: {
  ctx: LinkBrandContext | undefined | null;
  className?: string;
}) {
  if (!ctx?.brand) {
    return (
      <Badge variant="destructive" className={cn("gap-1.5", className)}>
        <AlertTriangle className="h-3.5 w-3.5" />
        Marca não resolvida
      </Badge>
    );
  }
  const { brand, isLegallyReady } = ctx;
  const Icon = isLegallyReady ? ShieldCheck : AlertTriangle;
  return (
    <Badge
      variant={isLegallyReady ? "secondary" : "destructive"}
      className={cn("gap-1.5 font-medium", className)}
      title={
        isLegallyReady
          ? `Todos os assets desta plataforma serão aplicados automaticamente. ${brand.seal?.license ?? ""}`
          : "Marca sem selo legal — geração bloqueada."
      }
    >
      <Lock className="h-3 w-3 opacity-70" />
      <Icon className="h-3.5 w-3.5" />
      Marca travada: {brand.name}
      {brand.seal?.license ? (
        <span className="ml-1 opacity-70">· {brand.seal.license}</span>
      ) : null}
    </Badge>
  );
}
