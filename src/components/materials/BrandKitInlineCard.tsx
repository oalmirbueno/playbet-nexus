import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { listBrands } from "@/lib/brandRegistry";

/**
 * Faixa compacta no topo de Materiais que leva à página dedicada dos kits
 * (abre em nova aba pra não perder o contexto da lista de materiais).
 */
export function BrandKitInlineCard() {
  const brands = listBrands().filter(b => b.seal);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Kits da marca · {brands.length} plataformas prontas</div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {brands.map(b => (
                <Badge key={b.key} variant="outline" className="text-[10px] font-normal gap-1.5 px-2 py-0.5">
                  {b.logos.mark && <img src={b.logos.mark} alt="" className="w-3 h-3 object-contain" />}
                  {b.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <Button asChild size="sm" className="h-9">
          <a href="/materiais/kits" target="_blank" rel="noreferrer">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Abrir kits em nova aba
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
