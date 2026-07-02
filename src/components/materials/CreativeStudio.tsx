import { useEffect, useMemo, useRef, useState } from "react";
import {
  renderCreative, downloadCreative, slugify,
  FORMAT_SIZES, STYLE_LABEL,
  type CreativeFormat, type CreativeStyle, type CreativeInput, type RenderedCreative,
} from "@/lib/creativeStudio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Loader2, RefreshCw, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export interface CreativeStudioLink {
  id: string;
  gameName?: string | null;
  gameIconUrl?: string | null;
  platformName?: string | null;
  hypeReason?: string | null;
  shortUrl?: string | null;
  handle?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  link: CreativeStudioLink | null;
}

const FORMATS: CreativeFormat[] = ["feed", "story", "landscape", "square_wa"];
const STYLES: CreativeStyle[] = ["hype", "minimal", "editorial"];

const CTA_SUGGESTIONS = [
  "JOGUE AGORA", "GARANTA SEU BÔNUS", "APROVEITE HOJE", "COMECE AGORA", "SAQUE RÁPIDO"
];

export function CreativeStudio({ open, onOpenChange, link }: Props) {
  const [style, setStyle] = useState<CreativeStyle>("hype");
  const [format, setFormat] = useState<CreativeFormat>("feed");
  const [rendering, setRendering] = useState(false);
  const [rendered, setRendered] = useState<RenderedCreative | null>(null);
  const [renderedAll, setRenderedAll] = useState<Record<CreativeFormat, RenderedCreative | null>>({
    feed: null, story: null, landscape: null, square_wa: null,
  });
  const [copied, setCopied] = useState(false);

  const [headline, setHeadline] = useState("");
  const [cta, setCta] = useState("JOGUE AGORA");
  const [handle, setHandle] = useState("");
  const [renderKey, setRenderKey] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!link) return;
    setHeadline(link.gameName || "");
    setHandle(link.handle || (link.shortUrl ? link.shortUrl.replace(/^https?:\/\//, "") : ""));
    setCta("JOGUE AGORA");
    setRenderedAll({ feed: null, story: null, landscape: null, square_wa: null });
    setRendered(null);
    setRenderKey(k => k + 1);
  }, [link?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const input = useMemo<CreativeInput | null>(() => {
    if (!link) return null;
    return {
      format, style,
      gameName: link.gameName,
      gameImageUrl: link.gameIconUrl,
      platformName: link.platformName,
      cta, handle, headline,
      hypeReason: link.hypeReason,
      shortUrl: link.shortUrl ?? undefined,
    };
  }, [link, format, style, cta, handle, headline]);

  // Render current preview
  useEffect(() => {
    if (!open || !input) return;
    let cancelled = false;
    setRendering(true);
    renderCreative(input)
      .then((r) => { if (!cancelled) { setRendered(r); setRenderedAll(a => ({ ...a, [format]: r })); } })
      .catch((e) => { if (!cancelled) toast.error("Falha ao gerar criativo", { description: e.message }); })
      .finally(() => { if (!cancelled) setRendering(false); });
    return () => { cancelled = true; };
  }, [input, open, renderKey, format]);

  const handleDownload = () => {
    if (!rendered || !link) return;
    const name = `playbet-${slugify(link.gameName || "criativo")}-${format}`;
    downloadCreative(rendered, name);
  };

  const handleDownloadAll = async () => {
    if (!input || !link) return;
    setRendering(true);
    try {
      for (const f of FORMATS) {
        const r = await renderCreative({ ...input, format: f });
        downloadCreative(r, `playbet-${slugify(link.gameName || "criativo")}-${f}`);
        await new Promise(r => setTimeout(r, 150));
      }
      toast.success("Kit completo baixado", { description: "4 formatos exportados." });
    } catch (e) {
      toast.error("Erro ao baixar kit", { description: (e as Error).message });
    } finally { setRendering(false); }
  };

  const copyLink = async () => {
    if (!link?.shortUrl) return;
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Não foi possível copiar"); }
  };

  if (!link) return null;
  const size = FORMAT_SIZES[format];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden gap-0 bg-background border-border/60">
        <DialogHeader className="px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            {link.gameIconUrl && (
              <img src={link.gameIconUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-border/40" />
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base flex items-center gap-2 truncate">
                Criativo · {link.gameName || "Sem título"}
                {link.hypeReason && <Badge variant="secondary" className="text-[10px] font-normal"><Sparkles className="w-3 h-3 mr-1" />{link.hypeReason}</Badge>}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {link.platformName || "Plataforma"} · {size.label} · {size.w}×{size.h}px
              </DialogDescription>
            </div>
            {link.shortUrl && (
              <button onClick={copyLink} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary/40">
                {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="max-w-[180px] truncate">{link.shortUrl.replace(/^https?:\/\//, "")}</span>
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr_320px] max-h-[75vh]">
          {/* Preview */}
          <div ref={previewRef} className="relative bg-gradient-to-br from-secondary/20 to-secondary/5 min-h-[420px] flex items-center justify-center p-6 overflow-auto">
            <div className="relative" style={{ maxWidth: "100%" }}>
              {rendering && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-sm rounded-lg">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              {rendered ? (
                <img
                  src={rendered.dataUrl}
                  alt="Preview"
                  className="rounded-lg shadow-2xl max-h-[62vh] w-auto object-contain"
                  style={{ aspectRatio: `${size.w} / ${size.h}` }}
                />
              ) : (
                <Skeleton className="w-[320px] h-[320px] rounded-lg" />
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="border-t md:border-t-0 md:border-l border-border/60 p-5 space-y-5 overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Formato</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {FORMATS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`text-[11px] px-2.5 py-2 rounded-md border transition-all ${format === f ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"}`}
                  >
                    {FORMAT_SIZES[f].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Estilo</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`text-[11px] px-2 py-2 rounded-md border transition-all ${style === s ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"}`}
                  >
                    {STYLE_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline" className="text-[11px] uppercase tracking-wider text-muted-foreground">Headline</Label>
              <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={link.gameName || "Nome do jogo"} className="h-9 text-sm" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta" className="text-[11px] uppercase tracking-wider text-muted-foreground">Chamada (CTA)</Label>
              <Input id="cta" value={cta} onChange={(e) => setCta(e.target.value)} className="h-9 text-sm" />
              <div className="flex flex-wrap gap-1">
                {CTA_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setCta(s)} className="text-[10px] px-2 py-1 rounded-full bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground">{s}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle" className="text-[11px] uppercase tracking-wider text-muted-foreground">Assinatura (@ ou link)</Label>
              <Input id="handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@seuperfil" className="h-9 text-sm" />
            </div>

            <div className="pt-2 space-y-2 border-t border-border/60">
              <Button onClick={handleDownload} disabled={!rendered || rendering} className="w-full h-9 text-sm">
                <Download className="w-4 h-4 mr-2" /> Baixar {FORMAT_SIZES[format].label}
              </Button>
              <Button onClick={handleDownloadAll} disabled={rendering} variant="secondary" className="w-full h-9 text-sm">
                <Sparkles className="w-4 h-4 mr-2" /> Kit completo (4 formatos)
              </Button>
              <Button onClick={() => setRenderKey(k => k + 1)} variant="ghost" size="sm" className="w-full h-8 text-xs text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Regenerar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
