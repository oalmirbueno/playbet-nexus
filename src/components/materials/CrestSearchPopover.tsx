import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Shield, ArrowLeft, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { searchCrests, type CrestResult } from "@/lib/clubCrests";
import {
  processCrest, DEFAULT_CREST_ADJUSTMENTS,
  type CrestAdjustments, type CrestBackground,
} from "@/lib/crestProcessor";

interface Props {
  kind: "team" | "league";
  onPick: (url: string, label: string) => void;
  triggerLabel?: string;
  size?: "sm" | "xs";
}

const BG_SWATCHES = ["#0B0F1E", "#FFFFFF", "#1E5FD9", "#FFC72C", "#0A1428", "#C69B5B"];

/**
 * Fluxo em 2 passos:
 *  1) Busca → lista de brasões
 *  2) Ajuste → trim + padding + fundo (transparente/círculo/quadrado) com preview ao vivo,
 *     antes de devolver o dataURL processado pro slot.
 */
export function CrestSearchPopover({ kind, onPick, triggerLabel, size = "xs" }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CrestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [picked, setPicked] = useState<CrestResult | null>(null);
  const [adj, setAdj] = useState<CrestAdjustments>(DEFAULT_CREST_ADJUSTMENTS);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [procError, setProcError] = useState<string | null>(null);

  // Busca com debounce
  useEffect(() => {
    if (!open || picked) return;
    if (q.trim().length < 2) { setResults([]); setError(null); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      setLoading(true); setError(null);
      try {
        const r = await searchCrests(q, kind, ctrl.signal);
        if (!ctrl.signal.aborted) setResults(r);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, kind, open, picked]);

  // Reprocessa preview quando ajustes mudam
  useEffect(() => {
    if (!picked) { setPreview(null); return; }
    let cancelled = false;
    setProcessing(true); setProcError(null);
    const t = setTimeout(async () => {
      try {
        const url = await processCrest(picked.badgeUrl, adj);
        if (!cancelled) setPreview(url);
      } catch (e) {
        if (!cancelled) setProcError((e as Error).message);
      } finally {
        if (!cancelled) setProcessing(false);
      }
    }, 60);
    return () => { cancelled = true; clearTimeout(t); };
  }, [picked, adj]);

  const reset = () => {
    setPicked(null); setPreview(null); setAdj(DEFAULT_CREST_ADJUSTMENTS); setProcError(null);
  };

  const commit = () => {
    if (!picked || !preview) return;
    onPick(preview, picked.name);
    setOpen(false);
    setQ(""); reset();
  };

  const patch = (p: Partial<CrestAdjustments>) => setAdj((prev) => ({ ...prev, ...p }));

  return (
    <Popover
      open={open}
      onOpenChange={(v) => { setOpen(v); if (!v) { setQ(""); reset(); } }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline"
          className={cn(
            size === "xs" ? "h-6 px-2 text-[10px]" : "h-7 px-2.5 text-[11px]",
            "gap-1 shrink-0",
          )}
        >
          <Search className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {triggerLabel || (kind === "team" ? "Buscar clube" : "Buscar liga")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2 space-y-2">
        {!picked ? (
          <>
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={kind === "team" ? "Ex: Palmeiras, Real Madrid" : "Ex: Brasileirão, Champions"}
                className="h-8 text-[12px] pl-7"
              />
            </div>
            <div className="min-h-[80px] max-h-[240px] overflow-y-auto scrollbar-thin">
              {loading && (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
              {!loading && error && (
                <p className="text-[11px] text-destructive px-1 py-2">{error}</p>
              )}
              {!loading && !error && q.trim().length >= 2 && results.length === 0 && (
                <p className="text-[11px] text-muted-foreground px-1 py-2">Nenhum resultado.</p>
              )}
              {!loading && !error && q.trim().length < 2 && (
                <p className="text-[11px] text-muted-foreground px-1 py-2 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Digite ao menos 2 letras.
                </p>
              )}
              <ul className="space-y-0.5">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(r)}
                      className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-secondary/60 text-left"
                    >
                      <img
                        src={r.badgeUrl}
                        alt=""
                        className="w-7 h-7 object-contain shrink-0 bg-background/40 rounded"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium truncate">{r.name}</div>
                        {r.subtitle && (
                          <div className="text-[9.5px] text-muted-foreground truncate">{r.subtitle}</div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[9.5px] text-muted-foreground px-1">
              Fonte: TheSportsDB · PNG transparente pronto pro criativo.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <button
                type="button" onClick={reset}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold truncate">{picked.name}</div>
                {picked.subtitle && (
                  <div className="text-[9.5px] text-muted-foreground truncate">{picked.subtitle}</div>
                )}
              </div>
            </div>

            {/* Preview quadriculado para mostrar transparência real */}
            <div
              className="relative w-full h-32 rounded-md border border-border/60 overflow-hidden flex items-center justify-center"
              style={{
                backgroundImage:
                  "linear-gradient(45deg,hsl(var(--muted)) 25%,transparent 25%),linear-gradient(-45deg,hsl(var(--muted)) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,hsl(var(--muted)) 75%),linear-gradient(-45deg,transparent 75%,hsl(var(--muted)) 75%)",
                backgroundSize: "12px 12px",
                backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
              }}
            >
              {processing && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground absolute" />
              )}
              {preview && (
                <img
                  src={preview}
                  alt="preview"
                  className="max-w-full max-h-full object-contain"
                />
              )}
              {procError && (
                <p className="text-[10px] text-destructive p-2 text-center">{procError}</p>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <Label className="text-[10px] text-muted-foreground flex justify-between">
                  <span>Recorte automático</span>
                  <span className="tabular-nums">{Math.round(adj.trim * 100)}%</span>
                </Label>
                <Slider
                  value={[adj.trim * 100]}
                  onValueChange={([v]) => patch({ trim: v / 100 })}
                  min={0} max={100} step={5}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground flex justify-between">
                  <span>Padding</span>
                  <span className="tabular-nums">{adj.paddingPct}%</span>
                </Label>
                <Slider
                  value={[adj.paddingPct]}
                  onValueChange={([v]) => patch({ paddingPct: v })}
                  min={0} max={40} step={1}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-[10px] text-muted-foreground">Fundo</Label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {(["none", "circle", "square"] as CrestBackground[]).map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => patch({ background: bg })}
                      className={cn(
                        "h-7 text-[10px] rounded border transition-all uppercase tracking-wide font-semibold",
                        adj.background === bg
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {bg === "none" ? "Transparente" : bg === "circle" ? "Disco" : "Placa"}
                    </button>
                  ))}
                </div>
              </div>

              {adj.background !== "none" && (
                <>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Cor do fundo</Label>
                    <div className="flex items-center gap-1 mt-1">
                      {BG_SWATCHES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => patch({ bgColor: c })}
                          className={cn(
                            "w-6 h-6 rounded border-2 transition-all",
                            adj.bgColor.toLowerCase() === c.toLowerCase()
                              ? "border-primary scale-110"
                              : "border-border/40 hover:border-border",
                          )}
                          style={{ background: c }}
                          aria-label={c}
                        />
                      ))}
                      <Input
                        type="color"
                        value={adj.bgColor}
                        onChange={(e) => patch({ bgColor: e.target.value })}
                        className="w-8 h-6 p-0.5 cursor-pointer"
                      />
                    </div>
                  </div>
                  {adj.background === "square" && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground flex justify-between">
                        <span>Cantos arredondados</span>
                        <span className="tabular-nums">{adj.radiusPct}%</span>
                      </Label>
                      <Slider
                        value={[adj.radiusPct]}
                        onValueChange={([v]) => patch({ radiusPct: v })}
                        min={0} max={50} step={1}
                        className="mt-1"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <Button
              onClick={commit}
              disabled={!preview || processing}
              size="sm"
              className="w-full h-7 text-[11px]"
            >
              <Check className="w-3 h-3 mr-1.5" /> Aplicar no slot
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
