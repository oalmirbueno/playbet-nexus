import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Package, Sparkles, Download, ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { listBrands, type BrandKit } from "@/lib/brandRegistry";
import { downloadRawAsset, slugify } from "@/lib/creativeStudio";
import { downloadSealTransparent } from "@/lib/removeSealBackground";
import playbetLogo from "@/assets/logo-mark.png";

/**
 * Página dedicada dos kits de marca — abre em nova aba a partir de Materiais.
 * Organizada por plataforma (tabs), com todos os ativos prontos pra baixar.
 */
export default function MateriaisKits() {
  const brands = useMemo(() => listBrands().filter(b => b.seal), []);
  const [tab, setTab] = useState<string>(brands[0]?.key ?? "playbet");

  const dlPlaybet = async () => {
    try { await downloadRawAsset(playbetLogo, "playbet-logo"); toast.success("Logo PlayBet baixada"); }
    catch (e) { toast.error("Falha ao baixar", { description: (e as Error).message }); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link to="/materiais" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Materiais
            </Link>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Kits da marca</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Logos e selos oficiais de todas as plataformas licenciadas. Baixe direto — inclui versões com fundo original e PNG transparente.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={dlPlaybet} className="h-9">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Logo PlayBet
          </Button>
        </div>

        {/* Tabs por plataforma */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {brands.map(b => (
              <TabsTrigger key={b.key} value={b.key} className="gap-2">
                {b.logos.mark && <img src={b.logos.mark} alt="" className="w-4 h-4 object-contain" />}
                {b.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {brands.map(b => (
            <TabsContent key={b.key} value={b.key} className="mt-4">
              <BrandKitPanel brand={b} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

function BrandKitPanel({ brand }: { brand: BrandKit }) {
  const slug = slugify(brand.name);
  const logos = [
    { key: "mark", label: "Símbolo", src: brand.logos.mark, filename: `${slug}-simbolo` },
    { key: "wordmark", label: "Wordmark", src: brand.logos.wordmark, filename: `${slug}-wordmark` },
    { key: "lockup", label: "Lockup", src: brand.logos.lockup, filename: `${slug}-lockup` },
    { key: "lockupAlt", label: "Lockup alt.", src: brand.logos.lockupAlt, filename: `${slug}-lockup-alt` },
  ].filter(l => l.src);

  const seals = brand.seal ? [
    { key: "h-light", label: "Selo horizontal · claro", src: brand.seal.horizontal.light, filename: `${slug}-selo-h-claro` },
    { key: "h-dark",  label: "Selo horizontal · escuro", src: brand.seal.horizontal.dark,  filename: `${slug}-selo-h-escuro` },
    { key: "v-light", label: "Selo vertical · claro",   src: brand.seal.vertical.light,   filename: `${slug}-selo-v-claro` },
    { key: "v-dark",  label: "Selo vertical · escuro",  src: brand.seal.vertical.dark,    filename: `${slug}-selo-v-escuro` },
  ] : [];

  const dl = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast.success(ok); }
    catch (e) { toast.error("Falha ao baixar", { description: (e as Error).message }); }
  };

  return (
    <div className="space-y-6">
      {/* Meta */}
      <Card className="border-border/60">
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {brand.logos.mark && (
              <div className="w-12 h-12 rounded-lg bg-white/5 border border-border/40 flex items-center justify-center p-1.5">
                <img src={brand.logos.mark} alt="" className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold">{brand.name}</div>
              {brand.seal && (
                <Badge variant="outline" className="text-[10px] mt-1">{brand.seal.license}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1.5">
            {brand.palette.backgrounds.slice(0, 4).map(bg => (
              <div key={bg.name} title={`${bg.name} · ${bg.hex}`}
                   className="w-6 h-6 rounded-md border border-border/60"
                   style={{ background: bg.hex }} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Logos */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Logos ({logos.length})</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {logos.map(l => (
            <AssetTile
              key={l.key}
              label={l.label}
              src={l.src!}
              onDownload={() => dl(() => downloadRawAsset(l.src!, l.filename), `${l.label} baixado`)}
            />
          ))}
        </div>
      </section>

      {/* Selos */}
      {seals.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Selos oficiais</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {seals.map(s => (
              <AssetTile
                key={s.key}
                label={s.label}
                src={s.src}
                extraAction={{
                  label: "PNG sem fundo",
                  onClick: () => dl(
                    () => downloadSealTransparent(s.src, `${s.filename}-sem-fundo.png`),
                    `${s.label} sem fundo baixado`,
                  ),
                }}
                onDownload={() => dl(() => downloadRawAsset(s.src, s.filename), `${s.label} baixado`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AssetTile({
  label, src, onDownload, extraAction,
}: {
  label: string;
  src: string;
  onDownload: () => void;
  extraAction?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden group">
      <div className="aspect-video bg-[conic-gradient(at_50%_50%,#0000_25%,#ffffff08_0_50%,#0000_0_75%,#ffffff08_0)] bg-[length:16px_16px] flex items-center justify-center p-4">
        <img src={src} alt={label} className="max-w-full max-h-full object-contain" loading="lazy" />
      </div>
      <div className="p-2.5 space-y-1.5 border-t border-border/60">
        <div className="text-[11px] font-medium truncate">{label}</div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 flex-1" onClick={onDownload}>
            <Download className="w-3 h-3 mr-1" /> Baixar
          </Button>
          {extraAction && (
            <Button size="sm" variant="secondary" className="h-7 text-[10px] px-2 flex-1" onClick={extraAction.onClick}>
              {extraAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
