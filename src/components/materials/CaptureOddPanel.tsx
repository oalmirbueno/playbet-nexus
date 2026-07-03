import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2, Smartphone, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ImageLayer, CreativeFormat } from "@/lib/creativeStudio";
import { FORMAT_SIZES } from "@/lib/creativeStudio";

interface Props {
  format: CreativeFormat;
  /** URL sugerida (short link do influencer). Usuário pode sobrescrever. */
  suggestedUrl?: string | null;
  /** Recebe a nova camada de imagem já posicionada como hero-art. */
  onCapture: (layer: ImageLayer) => void;
}

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID
  ? crypto.randomUUID()
  : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`);

export function CaptureOddPanel({ format, suggestedUrl, onCapture }: Props) {
  const [url, setUrl] = useState(suggestedUrl || "");
  const [viewport, setViewport] = useState<"mobile" | "desktop">("mobile");
  const [fullPage, setFullPage] = useState(false);
  const [loading, setLoading] = useState(false);

  const capture = async () => {
    const clean = url.trim();
    if (!clean) { toast.error("Cole o link da odd/bilhete"); return; }
    try { new URL(clean); } catch { toast.error("URL inválida"); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("capture-odd-screenshot", {
        body: { url: clean, viewport, fullPage, waitFor: 3000 },
      });
      if (error) throw error;
      const imageUrl = (data as { imageUrl?: string })?.imageUrl;
      if (!imageUrl) throw new Error("Sem imagem retornada");

      const fmt = FORMAT_SIZES[format];
      const vertical = fmt.h >= fmt.w * 1.2;
      // Enquadramento padrão: bloco central grande, deixa headroom pra logos e selo.
      const layer: ImageLayer = {
        kind: "image",
        id: uid(),
        src: imageUrl,
        label: `Screenshot ${viewport === "mobile" ? "mobile" : "desktop"}`,
        xPct: vertical ? 10 : 22,
        yPct: vertical ? 18 : 15,
        widthPct: vertical ? 80 : 56,
        heightPct: vertical ? 60 : 70,
        radiusPct: 4,
        opacity: 1,
        fit: "contain",
        glow: null,
      };
      onCapture(layer);
      toast.success("Screenshot capturado e inserido");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao capturar: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border/60">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Camera className="w-3 h-3" /> Capturar odd do link
        </Label>
      </div>
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://plataforma.com/aposta/..."
        className="h-8 text-[11px]"
      />
      <div className="flex items-center gap-1">
        {(["mobile", "desktop"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setViewport(v)}
            className={cn(
              "flex-1 text-[10px] px-2 py-1 rounded border flex items-center justify-center gap-1 transition-all",
              viewport === v
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {v === "mobile" ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
            {v === "mobile" ? "Mobile" : "Desktop"}
          </button>
        ))}
        <label className="text-[10px] text-muted-foreground flex items-center gap-1 pl-1">
          <input
            type="checkbox"
            checked={fullPage}
            onChange={(e) => setFullPage(e.target.checked)}
            className="accent-primary"
          />
          Full page
        </label>
      </div>
      <Button onClick={capture} disabled={loading} size="sm" className="w-full h-8 text-[11px]">
        {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Camera className="w-3.5 h-3.5 mr-1.5" />}
        {loading ? "Capturando…" : "Capturar & inserir"}
      </Button>
      <p className="text-[9.5px] text-muted-foreground leading-tight">
        Ideal pra odds, bilhetes compartilhados e páginas do jogo. Screenshot vira camada hero-art editável.
      </p>
    </div>
  );
}
