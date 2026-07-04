import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import { listBrands, resolveBrand, type BrandKit } from "@/lib/brandRegistry";
import { downloadRawAsset, slugify } from "@/lib/creativeStudio";
import { downloadSealTransparent } from "@/lib/removeSealBackground";
import playbetLogo from "@/assets/logo-mark.png";

interface Props {
  /** Nomes/slugs de plataformas presentes no contexto (rows filtradas). Se vazio, mostra todas. */
  platformHints?: (string | null | undefined)[];
}

/** Card inline no topo da view Materiais para baixar o kit da marca sem abrir o editor. */
export function BrandKitInlineCard({ platformHints }: Props) {
  const brands = useMemo<BrandKit[]>(() => {
    const hits = new Map<string, BrandKit>();
    (platformHints ?? []).forEach(h => {
      const b = resolveBrand(h);
      if (b) hits.set(b.key, b);
    });
    if (hits.size > 0) return Array.from(hits.values());
    // fallback: todas as marcas com selo (evita PlayBet chrome-only)
    return listBrands().filter(b => b.seal);
  }, [platformHints]);

  const dlPlaybet = async () => {
    try { await downloadRawAsset(playbetLogo, "playbet-logo"); toast.success("Logo PlayBet baixada"); }
    catch (e) { toast.error("Falha ao baixar", { description: (e as Error).message }); }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold">Kit da marca · pronto pra baixar</div>
              <p className="text-[11px] text-muted-foreground">Logos, selos oficiais e versões sem fundo — direto, sem abrir o editor.</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" className="h-8 text-[11px]" onClick={dlPlaybet}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Logo PlayBet
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {brands.map(b => (
            <BrandRow key={b.key} brand={b} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BrandRow({ brand }: { brand: BrandKit }) {
  const logoSrc = brand.logos.wordmark || brand.logos.lockup || brand.logos.mark || null;
  const sealSrc = brand.seal?.horizontal.light || brand.seal?.horizontal.dark || null;
  const slug = slugify(brand.name);

  const dl = async (fn: () => Promise<void>, okMsg: string, errMsg: string) => {
    try { await fn(); toast.success(okMsg); }
    catch (e) { toast.error(errMsg, { description: (e as Error).message }); }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {brand.logos.mark && (
            <img src={brand.logos.mark} alt="" className="w-6 h-6 rounded-sm object-contain bg-white/5 p-0.5" />
          )}
          <span className="text-sm font-medium truncate">{brand.name}</span>
        </div>
        {brand.seal && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
            {brand.seal.license}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          size="sm" variant="outline" className="h-8 text-[11px] px-2"
          disabled={!logoSrc}
          onClick={() => logoSrc && dl(
            () => downloadRawAsset(logoSrc, `${slug}-logo`),
            `Logo ${brand.name} baixada`,
            "Falha ao baixar logo",
          )}
        >
          <Package className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Logo
        </Button>
        <Button
          size="sm" variant="outline" className="h-8 text-[11px] px-2"
          disabled={!sealSrc}
          onClick={() => sealSrc && dl(
            () => downloadRawAsset(sealSrc, `${slug}-selo-oficial`),
            `Selo ${brand.name} baixado`,
            "Falha ao baixar selo",
          )}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Selo
        </Button>
        <Button
          size="sm" variant="outline" className="h-8 text-[11px] px-2 col-span-2"
          disabled={!sealSrc}
          onClick={() => sealSrc && dl(
            () => downloadSealTransparent(sealSrc, `${slug}-selo-sem-fundo.png`),
            `Selo ${brand.name} sem fundo baixado`,
            "Falha ao remover fundo",
          )}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Selo · PNG sem fundo
        </Button>
      </div>
    </div>
  );
}
