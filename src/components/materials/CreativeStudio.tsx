import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  renderCreative, downloadCreative, slugify, defaultLayersFor,
  FORMAT_SIZES, STYLE_LABEL,
  type CreativeFormat, type CreativeStyle, type CreativeInput, type RenderedCreative,
  type TextLayer,
} from "@/lib/creativeStudio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Download, Loader2, RefreshCw, Sparkles, Copy, Check, Plus, Trash2,
  AlignLeft, AlignCenter, AlignRight, Type, Bold, MoveUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const FAMILY_CSS: Record<TextLayer["family"], string> = {
  display: '"Archivo Black","Inter",sans-serif',
  sans: '"Inter",system-ui,sans-serif',
  grotesk: '"Space Grotesk","Inter",sans-serif',
};

const WEIGHTS: TextLayer["weight"][] = [400, 500, 600, 700, 800, 900];

export function CreativeStudio({ open, onOpenChange, link }: Props) {
  const [style, setStyle] = useState<CreativeStyle>("hype");
  const [format, setFormat] = useState<CreativeFormat>("feed");
  const [editorMode, setEditorMode] = useState(false);
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [rendering, setRendering] = useState(false);
  const [bg, setBg] = useState<RenderedCreative | null>(null); // background-only preview
  const [copied, setCopied] = useState(false);
  const [handle, setHandle] = useState("");
  const [renderKey, setRenderKey] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  const selected = layers.find(l => l.id === selectedId) || null;

  const seedLayers = useCallback((fmt: CreativeFormat) => {
    if (!link) return [];
    return defaultLayersFor({
      gameName: link.gameName,
      hypeReason: link.hypeReason,
      cta: "JOGUE AGORA →",
      handle: link.handle || (link.shortUrl ? link.shortUrl.replace(/^https?:\/\//, "") : ""),
      format: fmt,
    });
  }, [link]);

  useEffect(() => {
    if (!link) return;
    setHandle(link.handle || (link.shortUrl ? link.shortUrl.replace(/^https?:\/\//, "") : ""));
    setLayers(seedLayers(format));
    setSelectedId(null);
    setEditorMode(false);
    setRenderKey(k => k + 1);
  }, [link?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-seed layer defaults when format changes in editor mode (positions depend on aspect ratio)
  useEffect(() => {
    if (editorMode && link) {
      setLayers(seedLayers(format));
      setSelectedId(null);
    }
  }, [format]); // eslint-disable-line react-hooks/exhaustive-deps

  const baseInput = useMemo<CreativeInput | null>(() => {
    if (!link) return null;
    return {
      format, style,
      gameName: link.gameName,
      gameImageUrl: link.gameIconUrl,
      platformName: link.platformName,
      cta: "JOGUE AGORA →",
      handle,
      headline: link.gameName || "",
      hypeReason: link.hypeReason,
      shortUrl: link.shortUrl ?? undefined,
      hideAutoText: editorMode,
    };
  }, [link, format, style, handle, editorMode]);

  // Render background (no layers) — used as the canvas behind the DOM overlays
  useEffect(() => {
    if (!open || !baseInput) return;
    let cancelled = false;
    setRendering(true);
    renderCreative(baseInput)
      .then(r => { if (!cancelled) setBg(r); })
      .catch(e => { if (!cancelled) toast.error("Falha ao gerar criativo", { description: e.message }); })
      .finally(() => { if (!cancelled) setRendering(false); });
    return () => { cancelled = true; };
  }, [baseInput, open, renderKey]);

  const size = FORMAT_SIZES[format];

  /* ─────────── layer ops ─────────── */
  const updateLayer = (id: string, patch: Partial<TextLayer>) =>
    setLayers(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  const deleteLayer = (id: string) => {
    setLayers(ls => ls.filter(l => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const addLayer = () => {
    const nl: TextLayer = {
      id: crypto.randomUUID(),
      text: "Novo texto",
      xPct: 20, yPct: 45, widthPct: 60,
      fontSizePct: 6, color: "#FFFFFF", weight: 800,
      align: "left", family: "sans", uppercase: false, shadow: true, lineHeight: 1.1,
    };
    setLayers(ls => [...ls, nl]);
    setSelectedId(nl.id);
    setEditorMode(true);
  };

  /* ─────────── drag / resize ─────────── */
  const dragRef = useRef<{ id: string; mode: "move" | "resize"; startX: number; startY: number; l0: TextLayer } | null>(null);

  const onLayerPointerDown = (e: React.PointerEvent, layer: TextLayer, mode: "move" | "resize") => {
    if ((e.target as HTMLElement).isContentEditable && mode === "move") return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setSelectedId(layer.id);
    dragRef.current = { id: layer.id, mode, startX: e.clientX, startY: e.clientY, l0: { ...layer } };
  };

  const onStagePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const dx = ((e.clientX - d.startX) / rect.width) * 100;
    const dy = ((e.clientY - d.startY) / rect.height) * 100;
    if (d.mode === "move") {
      updateLayer(d.id, {
        xPct: Math.max(0, Math.min(100 - d.l0.widthPct, d.l0.xPct + dx)),
        yPct: Math.max(0, Math.min(98, d.l0.yPct + dy)),
      });
    } else {
      const newW = Math.max(8, Math.min(100 - d.l0.xPct, d.l0.widthPct + dx));
      // scale font proportionally to width delta for intuitive resize
      const scale = newW / d.l0.widthPct;
      const newFs = Math.max(1, Math.min(20, d.l0.fontSizePct * scale));
      updateLayer(d.id, { widthPct: newW, fontSizePct: newFs });
    }
  };
  const onStagePointerUp = () => { dragRef.current = null; };

  /* ─────────── export ─────────── */
  const exportPng = async (which: CreativeFormat | "all") => {
    if (!baseInput || !link) return;
    setRendering(true);
    try {
      const targets = which === "all" ? FORMATS : [which];
      for (const f of targets) {
        // For non-selected formats, re-seed a plausible layer layout to keep positions valid.
        const useLayers = f === format ? layers : seedLayers(f);
        const r = await renderCreative({ ...baseInput, format: f, hideAutoText: editorMode, layers: editorMode ? useLayers : undefined });
        downloadCreative(r, `playbet-${slugify(link.gameName || "criativo")}-${f}`);
        await new Promise(res => setTimeout(res, 120));
      }
      toast.success(which === "all" ? "Kit exportado" : "Criativo baixado");
    } catch (e) {
      toast.error("Erro ao exportar", { description: (e as Error).message });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden gap-0 bg-background border-border/60 w-[calc(100vw-1rem)]">
        <DialogHeader className="px-5 py-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            {link.gameIconUrl && (
              <img src={link.gameIconUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-border/40" />
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base flex items-center gap-2 truncate">
                Estúdio · {link.gameName || "Sem título"}
                {link.hypeReason && <Badge variant="secondary" className="text-[10px] font-normal"><Sparkles className="w-3 h-3 mr-1" />{link.hypeReason}</Badge>}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {link.platformName || "Plataforma"} · {size.label} · {size.w}×{size.h}px
              </DialogDescription>
            </div>
            <button
              onClick={() => { setEditorMode(v => !v); if (!editorMode && layers.length === 0) setLayers(seedLayers(format)); }}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md border transition-all flex items-center gap-1.5",
                editorMode ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
              title="Editor de camadas"
            >
              <Type className="w-3.5 h-3.5" />
              {editorMode ? "Editor ativo" : "Editar textos"}
            </button>
            {link.shortUrl && (
              <button onClick={copyLink} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary/40">
                {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="max-w-[180px] truncate">{link.shortUrl.replace(/^https?:\/\//, "")}</span>
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr_340px] max-h-[78vh]">
          {/* Stage */}
          <div
            className="relative bg-gradient-to-br from-secondary/20 to-secondary/5 min-h-[440px] flex items-center justify-center p-6 overflow-auto"
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
            onPointerLeave={onStagePointerUp}
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
          >
            <div
              ref={stageRef}
              className="relative shadow-2xl rounded-lg overflow-hidden bg-black select-none"
              style={{
                aspectRatio: `${size.w} / ${size.h}`,
                width: `min(100%, calc(68vh * ${size.w / size.h}))`,
                maxHeight: "68vh",
                containerType: "inline-size",
              }}
            >
              {rendering && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              {bg ? (
                <img src={bg.dataUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />
              ) : (
                <Skeleton className="absolute inset-0" />
              )}

              {/* Layer overlays — only interactive in editor mode */}
              {editorMode && layers.map((L) => {
                const isSel = L.id === selectedId;
                return (
                  <div
                    key={L.id}
                    onPointerDown={(e) => onLayerPointerDown(e, L, "move")}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(L.id); }}
                    className={cn(
                      "absolute z-10 cursor-move outline-none",
                      isSel ? "ring-2 ring-primary/70 ring-offset-1 ring-offset-transparent" : "hover:ring-1 hover:ring-primary/40",
                    )}
                    style={{
                      left: `${L.xPct}%`,
                      top: `${L.yPct}%`,
                      width: `${L.widthPct}%`,
                    }}
                  >
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      spellCheck={false}
                      onPointerDown={(e) => e.stopPropagation()}
                      onBlur={(e) => updateLayer(L.id, { text: (e.target as HTMLDivElement).innerText })}
                      style={{
                        fontFamily: FAMILY_CSS[L.family],
                        fontWeight: L.weight,
                        fontSize: `clamp(8px, ${L.fontSizePct}cqw, 999px)`,
                        color: L.color,
                        textAlign: L.align,
                        textTransform: L.uppercase ? "uppercase" : "none",
                        lineHeight: L.lineHeight ?? 1.05,
                        textShadow: L.shadow ? `0 2px ${Math.max(4, L.fontSizePct * 0.6)}px rgba(0,0,0,0.55)` : undefined,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        cursor: "text",
                      
                      }}
                    >
                      {L.text}
                    </div>
                    {isSel && (
                      <div
                        onPointerDown={(e) => onLayerPointerDown(e, L, "resize")}
                        className="absolute -right-2 -bottom-2 w-4 h-4 bg-primary rounded-sm cursor-nwse-resize shadow-md flex items-center justify-center"
                        title="Redimensionar"
                      >
                        <MoveUpRight className="w-2.5 h-2.5 text-primary-foreground rotate-90" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Container-query hack: cqw needs a container. We set inline-size container above per layer. */}
          </div>

          {/* Controls */}
          <div className="border-t md:border-t-0 md:border-l border-border/60 p-4 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Formato</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {FORMATS.map(f => (
                  <button key={f} onClick={() => setFormat(f)}
                    className={cn("text-[11px] px-2.5 py-2 rounded-md border transition-all",
                      format === f ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border")}>
                    {FORMAT_SIZES[f].label}
                  </button>
                ))}
              </div>
            </div>

            {!editorMode && (
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Estilo</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setStyle(s)}
                      className={cn("text-[11px] px-2 py-2 rounded-md border transition-all",
                        style === s ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border")}>
                      {STYLE_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {editorMode && (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Camadas</Label>
                  <button onClick={addLayer} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
                <div className="space-y-1 max-h-[140px] overflow-y-auto -mx-1 px-1">
                  {layers.map((L) => (
                    <button
                      key={L.id}
                      onClick={() => setSelectedId(L.id)}
                      className={cn(
                        "w-full text-left text-xs px-2 py-1.5 rounded-md flex items-center gap-2 border",
                        selectedId === L.id ? "bg-primary/10 border-primary/50" : "border-transparent hover:bg-secondary/40",
                      )}
                    >
                      <Type className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 text-foreground">{L.text.split("\n")[0] || "(vazio)"}</span>
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => { e.stopPropagation(); deleteLayer(L.id); }}
                        className="opacity-60 hover:opacity-100 hover:text-destructive p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                  {layers.length === 0 && (
                    <p className="text-[11px] text-muted-foreground px-2 py-3 text-center">Nenhuma camada. Adicione um texto.</p>
                  )}
                </div>

                {selected && (
                  <div className="space-y-3 pt-3 border-t border-border/60">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Texto</Label>
                      <Textarea
                        value={selected.text}
                        onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                        rows={3}
                        className="text-sm resize-none"
                        placeholder="Digite aqui. Enter quebra linha."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fonte</Label>
                        <select
                          value={selected.family}
                          onChange={(e) => updateLayer(selected.id, { family: e.target.value as TextLayer["family"] })}
                          className="w-full h-8 text-xs bg-background border border-border/60 rounded-md px-2"
                        >
                          <option value="display">Display</option>
                          <option value="sans">Sans</option>
                          <option value="grotesk">Grotesk</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Peso</Label>
                        <select
                          value={selected.weight}
                          onChange={(e) => updateLayer(selected.id, { weight: Number(e.target.value) as TextLayer["weight"] })}
                          className="w-full h-8 text-xs bg-background border border-border/60 rounded-md px-2"
                        >
                          {WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tamanho</Label>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{selected.fontSizePct.toFixed(1)}%</span>
                      </div>
                      <Slider
                        value={[selected.fontSizePct]}
                        min={1} max={20} step={0.1}
                        onValueChange={([v]) => updateLayer(selected.id, { fontSizePct: v })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Largura</Label>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{selected.widthPct.toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[selected.widthPct]}
                        min={10} max={100} step={1}
                        onValueChange={([v]) => updateLayer(selected.id, { widthPct: v })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Entrelinhas</Label>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{(selected.lineHeight ?? 1.05).toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[selected.lineHeight ?? 1.05]}
                        min={0.8} max={2} step={0.05}
                        onValueChange={([v]) => updateLayer(selected.id, { lineHeight: v })}
                      />
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cor</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={selected.color.length === 7 ? selected.color : "#FFFFFF"}
                            onChange={(e) => updateLayer(selected.id, { color: e.target.value.toUpperCase() })}
                            className="w-8 h-8 rounded border border-border/60 bg-background cursor-pointer"
                          />
                          <Input
                            value={selected.color}
                            onChange={(e) => updateLayer(selected.id, { color: e.target.value })}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {(["left", "center", "right"] as const).map(a => (
                        <button
                          key={a}
                          onClick={() => updateLayer(selected.id, { align: a })}
                          className={cn(
                            "flex-1 h-8 rounded-md border flex items-center justify-center transition",
                            selected.align === a ? "border-primary bg-primary/10" : "border-border/60 hover:border-border text-muted-foreground",
                          )}
                        >
                          {a === "left" && <AlignLeft className="w-3.5 h-3.5" />}
                          {a === "center" && <AlignCenter className="w-3.5 h-3.5" />}
                          {a === "right" && <AlignRight className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                      <button
                        onClick={() => updateLayer(selected.id, { uppercase: !selected.uppercase })}
                        className={cn(
                          "h-8 px-2 rounded-md border text-[10px] font-bold",
                          selected.uppercase ? "border-primary bg-primary/10" : "border-border/60 text-muted-foreground",
                        )}
                        title="Maiúsculas"
                      >AA</button>
                      <button
                        onClick={() => updateLayer(selected.id, { shadow: !selected.shadow })}
                        className={cn(
                          "h-8 px-2 rounded-md border",
                          selected.shadow ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground",
                        )}
                        title="Sombra"
                      ><Bold className="w-3 h-3" /></button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="pt-3 space-y-2 border-t border-border/60">
              <Button onClick={() => exportPng(format)} disabled={!bg || rendering} className="w-full h-9 text-sm">
                <Download className="w-4 h-4 mr-2" /> Baixar {FORMAT_SIZES[format].label}
              </Button>
              <Button onClick={() => exportPng("all")} disabled={rendering} variant="secondary" className="w-full h-9 text-sm">
                <Sparkles className="w-4 h-4 mr-2" /> Kit completo (4 formatos)
              </Button>
              <Button onClick={() => setRenderKey(k => k + 1)} variant="ghost" size="sm" className="w-full h-8 text-xs text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Regenerar fundo
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
