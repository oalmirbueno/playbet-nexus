import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  renderCreative, downloadCreative, downloadRawAsset, slugify, defaultLayersFor, defaultOddsLayersFor,
  FORMAT_SIZES, CREATIVE_TEMPLATES, applyTemplate, ensureBrandChrome,
  ODDS_PRESETS, ODDS_PRESET_LABEL,
  type CreativeFormat, type CreativeStyle, type CreativeInput, type RenderedCreative,
  type Layer, type TextLayer, type ImageLayer, type BrandChromeSpec, type OddsPreset,
} from "@/lib/creativeStudio";


import playbetLogo from "@/assets/logo-mark.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Download, Loader2, RefreshCw, Sparkles, Copy, Check, Trash2,
  AlignLeft, AlignCenter, AlignRight, Type, Image as ImageIcon,
  ChevronUp, ChevronDown, Save, Undo2, MousePointer2, ImageDown, Package,
  BadgePlus, Blend, CopyPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLinkBrand } from "@/lib/useLinkBrand";
import { BrandLockBadge } from "@/components/brand/BrandLockBadge";
import { buildMaterialFilename } from "@/lib/exportMaterial";
import { ApplyLayoutPanel } from "@/components/materials/ApplyLayoutPanel";
import { CaptureOddPanel } from "@/components/materials/CaptureOddPanel";



export interface CreativeStudioLink {
  id: string;
  influencerId?: string | null;
  gameName?: string | null;
  gameIconUrl?: string | null;
  platformName?: string | null;
  hypeReason?: string | null;
  shortUrl?: string | null;
  handle?: string | null;
  linkCategory?: string | null;
}

interface OddsContext {
  bet_type: "single" | "multipla" | "sistema";
  total_odd: number | null;
  event_label: string | null;
  bookmaker_share_url: string | null;
  screenshot_url: string | null;
  selections: Array<{ event: string; market: string; pick: string; odd: number }>;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  link: CreativeStudioLink | null;
  engine?: "games" | "odds";
  lockEngine?: boolean;
}

const FORMATS: CreativeFormat[] = ["feed", "story", "landscape", "square_wa"];
const FAMILY_CSS: Record<TextLayer["family"], string> = {
  display: '"Archivo Black","Inter",sans-serif',
  sans: '"Inter",system-ui,sans-serif',
  grotesk: '"Space Grotesk","Inter",sans-serif',
};

const WEIGHTS: TextLayer["weight"][] = [400, 500, 600, 700, 800, 900];

const STORAGE_PREFIX = "playbet:creative-studio:v4";
type StudioEngine = "games" | "odds";
const storageKey = (linkId: string, fmt: CreativeFormat, engine: StudioEngine) => `${STORAGE_PREFIX}:${engine}:${linkId}:${fmt}`;

interface SavedState {
  layers: Layer[];
  style: CreativeStyle;
  editorMode: boolean;
  updatedAt: number;
  cloudSaved?: boolean;
  engine?: StudioEngine;
  oddsPreset?: OddsPreset;
}


function loadState(linkId: string, fmt: CreativeFormat, engine: StudioEngine): SavedState | null {
  try {
    const raw = localStorage.getItem(storageKey(linkId, fmt, engine));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    if (!Array.isArray(parsed.layers)) return null;
    if (parsed.engine && parsed.engine !== engine) return null;
    return parsed;
  } catch { return null; }
}

function saveState(linkId: string, fmt: CreativeFormat, engine: StudioEngine, s: SavedState) {
  try { localStorage.setItem(storageKey(linkId, fmt, engine), JSON.stringify({ ...s, engine })); } catch { /* ignore */ }
}

export function CreativeStudio({ open, onOpenChange, link, engine, lockEngine = false }: Props) {
  const { data: brandCtx, isLoading: brandLoading } = useLinkBrand(link?.id ?? null);

  const [style, setStyle] = useState<CreativeStyle>("hype");
  const [format, setFormat] = useState<CreativeFormat>("feed");
  const [editorMode, setEditorMode] = useState(true);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const [rendering, setRendering] = useState(false);
  const [bg, setBg] = useState<RenderedCreative | null>(null);
  const [copied, setCopied] = useState(false);
  const [handle, setHandle] = useState("");
  const [renderKey, setRenderKey] = useState(0);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [oddsCtx, setOddsCtx] = useState<OddsContext | null>(null);
  const [oddsFetched, setOddsFetched] = useState(false);
  const [oddsPreset, setOddsPreset] = useState<OddsPreset>("bilhete");
  const stageRef = useRef<HTMLDivElement>(null);


  const autoOddsShare = (link?.linkCategory ?? "").toLowerCase() === "odds_share";
  // Modo do estúdio: 'games' (arte tradicional de jogo) vs 'odds' (aposta compartilhada).
  // Auto-seleciona 'odds' quando o link tem link_category = odds_share, mas o operador pode alternar.
  const [engineMode, setEngineMode] = useState<StudioEngine>(engine ?? (autoOddsShare ? "odds" : "games"));
  useEffect(() => { setEngineMode(engine ?? (autoOddsShare ? "odds" : "games")); }, [engine, autoOddsShare, link?.id]);
  const isOddsShare = engineMode === "odds";

  useEffect(() => {
    if (engineMode === "odds") setStyle("odds_hype");
    else setStyle((cur) => cur === "odds_hype" ? "hype" : cur);
  }, [engineMode, link?.id]);

  const selected = layers.find(l => l.id === selectedId) || null;

  const platformLogoSrc = brandCtx?.brand?.logos.lockup
    || brandCtx?.brand?.logos.wordmark
    || brandCtx?.brand?.logos.mark
    || null;
  const platformSealSrc = brandCtx?.brand?.seal?.horizontal.light
    || brandCtx?.brand?.seal?.horizontal.dark
    || null;
  const brandAccent = brandCtx?.brand?.palette.primary ?? "#FFC72C";

  const chromeSpec = useMemo<BrandChromeSpec | undefined>(() => {
    if (!link) return undefined;
    return {
      format,
      platformLogoSrc,
      platformName: brandCtx?.brand?.name || link.platformName || null,
      sealSrc: platformSealSrc,
      sealLabel: brandCtx?.brand?.seal?.alt ?? null,
    };
  }, [format, link?.id, link?.platformName, platformLogoSrc, platformSealSrc, brandCtx?.brand?.name, brandCtx?.brand?.seal?.alt]);

  const applyBrandChrome = useCallback((inputLayers: Layer[]) => (
    chromeSpec ? ensureBrandChrome(inputLayers, chromeSpec) : inputLayers
  ), [chromeSpec]);

  const seedLayers = useCallback((fmt: CreativeFormat, withImages = true): Layer[] => {
    if (!link) return [];
    const brand = brandCtx?.brand ?? null;
    const brandOverride = brand ? {
      logoSrc: brand.logos.lockup || brand.logos.wordmark || brand.logos.mark,
      badgeBg: brand.palette.primary,
      sealSrc: brand.seal?.horizontal.light || brand.seal?.horizontal.dark,
      sealLabel: brand.seal?.alt,
    } : undefined;

    // Odds share → engine dedicada de aposta compartilhada.
    if (isOddsShare) {
      const betLabel = oddsCtx?.bet_type === "multipla" ? "MÚLTIPLA"
        : oddsCtx?.bet_type === "sistema" ? "SISTEMA"
        : "SIMPLES";
      return defaultOddsLayersFor({
        format: fmt,
        preset: oddsPreset,
        platformName: brand?.name || link.platformName,
        eventLabel: oddsCtx?.event_label ?? link.gameName ?? null,
        betTypeLabel: `APOSTA ${betLabel}`,
        totalOdd: oddsCtx?.total_odd ?? null,
        legs: (oddsCtx?.selections ?? []).map(s => ({
          event: s.event, pick: s.pick, odd: Number(s.odd) || 0,
        })),
        cta: "COPIA E COLA NA CASA →",
        handle: link.handle || (link.shortUrl ? link.shortUrl.replace(/^https?:\/\//, "") : ""),
        screenshotUrl: withImages ? (oddsCtx?.screenshot_url ?? null) : null,
      }, { brand: brandOverride });
    }

    return defaultLayersFor({
      gameName: link.gameName,
      hypeReason: link.hypeReason,
      cta: "JOGUE AGORA →",
      handle: link.handle || (link.shortUrl ? link.shortUrl.replace(/^https?:\/\//, "") : ""),
      format: fmt,
      platformName: brand?.name || link.platformName,
      gameImageUrl: link.gameIconUrl,
    }, { includeImages: withImages, brand: brandOverride });
  }, [link, brandCtx?.brand?.key, brandCtx?.brand?.logos.lockup, brandCtx?.brand?.logos.wordmark, brandCtx?.brand?.logos.mark, brandCtx?.brand?.seal?.horizontal.light, brandCtx?.brand?.seal?.horizontal.dark, isOddsShare, oddsCtx, oddsPreset]);


  // Puxa odds do link — sempre que a modal abre, mesmo quando o operador começou em 'games'
  // e depois alternou para 'odds'. Assim o toggle é instantâneo, sem espera.
  useEffect(() => {
    if (!open || !link?.id) { setOddsCtx(null); setOddsFetched(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("tracking_link_odds")
        .select("bet_type,total_odd,event_label,bookmaker_share_url,screenshot_url,selections")
        .eq("tracking_link_id", link.id)
        .maybeSingle();
      if (cancelled) return;
      setOddsCtx(data ? {
        bet_type: data.bet_type,
        total_odd: data.total_odd,
        event_label: data.event_label,
        bookmaker_share_url: data.bookmaker_share_url,
        screenshot_url: data.screenshot_url,
        selections: Array.isArray(data.selections) ? data.selections : [],
      } : null);
      setOddsFetched(true);
    })();
    return () => { cancelled = true; };
  }, [open, link?.id]);



  const loadDatabaseState = useCallback(async (linkId: string, fmt: CreativeFormat, engine: StudioEngine): Promise<SavedState | null> => {
    const { data, error } = await supabase
      .from("link_materials")
      .select("style, meta, updated_at")
      .eq("tracking_link_id", linkId)
      .eq("format", fmt)
      .order("updated_at", { ascending: false })
      .limit(12);

    if (error) return null;
    const row = (data ?? []).find((m: any) => {
      const layoutEngine = m?.meta?.studioLayout?.engine;
      if (layoutEngine) return layoutEngine === engine;
      return engine === "odds" ? m.style === "odds_hype" : m.style !== "odds_hype";
    }) as any;
    const layout = row?.meta?.studioLayout;
    if (!layout || !Array.isArray(layout.layers)) return null;
    if (layout.version !== 3) return null;
    return {
      layers: layout.layers,
      style: (layout.style ?? row?.style ?? (engine === "odds" ? "odds_hype" : "hype")) as CreativeStyle,
      editorMode: true,
      updatedAt: Date.parse(row?.updated_at ?? "") || layout.updatedAt || Date.now(),
      cloudSaved: true,
      engine,
      oddsPreset: (layout.oddsPreset ?? undefined) as OddsPreset | undefined,
    };
  }, []);


  // Load persisted state on open / link change / format change.
  // IMPORTANTE: aguardar brandCtx resolver antes de semear — senão o estúdio abre
  // com layers genéricos (sem logo real da plataforma, sem selo, sem chrome PlayBet).
  useEffect(() => {
    if (!link || !open) return;
    if (brandLoading) return; // aguarda marca resolver
    // Aguarda o fetch inicial de odds concluir (evita seed sem contexto quando é odds_share).
    if (isOddsShare && !oddsFetched) return;
    let cancelled = false;
    setHandle(link.handle || (link.shortUrl ? link.shortUrl.replace(/^https?:\/\//, "") : ""));
    setSelectedId(null);
    setEditingTextId(null);
    setEditorMode(true);
    (async () => {
      const databaseSaved = await loadDatabaseState(link.id, format, engineMode);
      if (cancelled) return;
      const localSaved = loadState(link.id, format, engineMode);
      const saved = localSaved && databaseSaved
        ? (localSaved.updatedAt > databaseSaved.updatedAt ? localSaved : databaseSaved)
        : (databaseSaved ?? localSaved);
      if (saved) {
        const hydrated = applyBrandChrome(saved.layers);
        const chromeChanged = JSON.stringify(hydrated) !== JSON.stringify(saved.layers);
        setLayers(hydrated);
        setStyle(engineMode === "odds" ? "odds_hype" : saved.style === "odds_hype" ? "hype" : saved.style);
        if (engineMode === "odds" && saved.oddsPreset) setOddsPreset(saved.oddsPreset);
        setSavedAt(saved.updatedAt);
        setDirty(!saved.cloudSaved || chromeChanged);
      } else {
        setLayers(applyBrandChrome(seedLayers(format)));
        setSavedAt(null);
        setDirty(true);
      }

      setRenderKey(k => k + 1);
    })();
    return () => { cancelled = true; };
  }, [link?.id, format, open, loadDatabaseState, brandLoading, brandCtx?.brand?.key, applyBrandChrome, engineMode, oddsFetched, oddsCtx?.total_odd, oddsCtx?.event_label, oddsCtx?.screenshot_url]); // eslint-disable-line react-hooks/exhaustive-deps


  // Auto-save (debounced)
  useEffect(() => {
    if (!link || !open || !dirty) return;
    const t = setTimeout(() => {
      saveState(link.id, format, engineMode, { layers, style: engineMode === "odds" ? "odds_hype" : style, editorMode, updatedAt: Date.now(), cloudSaved: false, engine: engineMode, oddsPreset: engineMode === "odds" ? oddsPreset : undefined });
    }, 300);
    return () => clearTimeout(t);
  }, [layers, style, editorMode, link?.id, format, open, dirty, engineMode, oddsPreset]);


  const baseInput = useMemo<CreativeInput | null>(() => {
    if (!link) return null;
    return {
      format, style,
      gameName: link.gameName,
      gameImageUrl: link.gameIconUrl,
      platformName: brandCtx?.brand?.name || link.platformName,
      platformColor: brandAccent,
      cta: "JOGUE AGORA →",
      handle,
      headline: link.gameName || "",
      hypeReason: link.hypeReason,
      shortUrl: link.shortUrl ?? undefined,
      hideAutoText: editorMode,
      hideAutoArt: editorMode,
    };
  }, [link, format, style, handle, editorMode, brandCtx?.brand?.name, brandAccent]);

  // Render background-only preview (no layers) — layers are DOM overlays
  useEffect(() => {
    if (!open || !baseInput) return;
    let cancelled = false;
    setRendering(true);
    renderCreative(baseInput)
      .then(r => { if (!cancelled) setBg(r); })
      .catch(e => { if (!cancelled) toast.error("Falha ao gerar", { description: e.message }); })
      .finally(() => { if (!cancelled) setRendering(false); });
    return () => { cancelled = true; };
  }, [baseInput, open, renderKey]);

  const size = FORMAT_SIZES[format];

  /* ─────────── layer ops ─────────── */
  const updateLayer = <T extends Layer>(id: string, patch: Partial<T>) => {
    setDirty(true);
    setLayers(ls => ls.map(l => l.id === id ? ({ ...l, ...patch } as Layer) : l));
  };

  const deleteLayer = (id: string) => {
    setDirty(true);
    setLayers(ls => ls.filter(l => l.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingTextId === id) setEditingTextId(null);
  };

  const moveLayer = (id: string, dir: -1 | 1) => {
    setLayers(ls => {
      const idx = ls.findIndex(l => l.id === id);
      if (idx < 0) return ls;
      const j = idx + dir;
      if (j < 0 || j >= ls.length) return ls;
      const next = [...ls];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    setDirty(true);
  };

  const addTextLayer = () => {
    const nl: TextLayer = {
      kind: "text", id: crypto.randomUUID(),
      text: "Novo texto",
      xPct: 20, yPct: 45, widthPct: 60,
      fontSizePct: 6, color: "#FFFFFF", weight: 800,
      align: "left", family: "sans", uppercase: false, shadow: true, lineHeight: 1.1,
    };
    setLayers(ls => [...ls, nl]);
    setDirty(true);
    setSelectedId(nl.id);
    setEditorMode(true);
  };

  const addImageLayer = () => {
    if (!link?.gameIconUrl) return;
    const nl: ImageLayer = {
      kind: "image", id: crypto.randomUUID(), src: link.gameIconUrl, label: "Arte do jogo",
      xPct: 30, yPct: 20, widthPct: 40, heightPct: 40,
      radiusPct: 8, opacity: 1, fit: "cover", glow: null,
    };
    setLayers(ls => [...ls, nl]);
    setDirty(true);
    setSelectedId(nl.id);
    setEditorMode(true);
  };

  const addPlatformLogoLayer = () => {
    if (!platformLogoSrc) { toast.error("Logo da plataforma indisponível"); return; }
    const nl: ImageLayer = {
      kind: "image", id: crypto.randomUUID(), src: platformLogoSrc,
      label: `Logo ${brandCtx?.brand?.name || link?.platformName || "plataforma"}`,
      xPct: 34, yPct: 12, widthPct: 32, heightPct: 10,
      radiusPct: 0, opacity: 1, fit: "contain", glow: null,
    };
    setLayers(ls => [...ls, nl]);
    setDirty(true);
    setSelectedId(nl.id);
    setEditorMode(true);
  };

  const addSealLayer = () => {
    if (!platformSealSrc) { toast.error("Selo da plataforma indisponível"); return; }
    const nl: ImageLayer = {
      kind: "image", id: crypto.randomUUID(), src: platformSealSrc,
      label: brandCtx?.brand?.seal?.alt || "Selo legal 18+",
      xPct: 18, yPct: 91, widthPct: 64, heightPct: 6,
      radiusPct: 0, opacity: 1, fit: "contain", glow: null,
    };
    setLayers(ls => [...ls, nl]);
    setDirty(true);
    setSelectedId(nl.id);
    setEditorMode(true);
  };

  const duplicateLayer = (layer: Layer | null) => {
    if (!layer) return;
    const copy = {
      ...layer,
      id: crypto.randomUUID(),
      xPct: Math.max(0, Math.min(100 - layer.widthPct, layer.xPct + 3)),
      yPct: Math.max(0, Math.min(96, layer.yPct + 3)),
      chrome: undefined,
    } as Layer;
    setLayers(ls => [...ls, copy]);
    setDirty(true);
    setSelectedId(copy.id);
  };

  const resetToDefaults = () => {
    setLayers(applyBrandChrome(seedLayers(format)));
    setDirty(true);
    setSelectedId(null);
    setEditingTextId(null);
    toast.success("Layout restaurado");
  };

  const applyTpl = (templateId: string) => {
    if (!link) return;
    const raw = applyTemplate(templateId, {
      format,
      gameName: link.gameName,
      gameImageUrl: link.gameIconUrl,
      platformName: brandCtx?.brand?.name || link.platformName,
      hypeReason: link.hypeReason,
      cta: "JOGUE AGORA →",
      handle: handle || (link.shortUrl ? link.shortUrl.replace(/^https?:\/\//, "") : ""),
    });
    const next = applyBrandChrome(raw.filter((layer) => {
      if (layer.chrome) return true;
      if (layer.kind !== "image") return true;
      return !(layer.src === playbetLogo && /^logo/i.test(layer.label || ""));
    }));
    setLayers(next);
    setSelectedId(null);
    setEditingTextId(null);
    setDirty(true);
    const name = CREATIVE_TEMPLATES.find(t => t.id === templateId)?.name ?? "Template";
    toast.success(`Template aplicado: ${name}`);
  };

  const saveLayout = async () => {
    if (!link) return;
    setSavingLayout(true);
    const now = Date.now();
    const effectiveStyle = engineMode === "odds" ? "odds_hype" : style === "odds_hype" ? "hype" : style;
    const snapshot: SavedState = { layers, style: effectiveStyle, editorMode: true, updatedAt: now, cloudSaved: false, engine: engineMode };
    saveState(link.id, format, engineMode, snapshot);

    try {
      const { data: existing, error: readError } = await supabase
        .from("link_materials")
        .select("id, style, meta")
        .eq("tracking_link_id", link.id)
        .eq("format", format)
        .order("updated_at", { ascending: false })
        .limit(12);
      if (readError) throw readError;

      const existingRow = ((existing ?? []) as any[]).find((m) => {
        const layoutEngine = m?.meta?.studioLayout?.engine;
        if (layoutEngine) return layoutEngine === engineMode;
        return engineMode === "odds" ? (m?.meta?.engine === "odds_share" || m?.style === "odds_hype") : (m?.meta?.engine !== "odds_share" && m?.style !== "odds_hype");
      });

      const nextMeta = {
        ...((existingRow?.meta as any) ?? {}),
        ...(engineMode === "odds" ? { engine: "odds_share", odds: oddsCtx ?? (existingRow?.meta as any)?.odds ?? null } : { engine: "games" }),
        studioLayout: {
          version: 3,
          engine: engineMode,
          format,
          style: effectiveStyle,
          layers,
          updatedAt: now,
        },
      };

      if (existingRow?.id) {
        const { error } = await supabase
          .from("link_materials")
          .update({ style: effectiveStyle, meta: nextMeta, updated_at: new Date(now).toISOString() } as any)
          .eq("id", existingRow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("link_materials")
          .insert({
            tracking_link_id: link.id,
            influencer_id: link.influencerId ?? null,
            format,
            style: effectiveStyle,
            game_name: link.gameName ?? null,
            image_url: link.gameIconUrl ?? null,
            thumbnail_url: link.gameIconUrl ?? null,
            status: "ready",
            meta: nextMeta,
          } as any);
        if (error) throw error;
      }

      setSavedAt(now);
      setDirty(false);
      saveState(link.id, format, engineMode, { ...snapshot, cloudSaved: true });
      toast.success("Layout salvo");
    } catch (e) {
      toast.error("Salvo só neste navegador", { description: (e as Error).message });
    } finally {
      setSavingLayout(false);
    }
  };

  /* ─────────── drag / resize ─────────── */
  type DragState =
    | { id: string; mode: "move"; startX: number; startY: number; l0: Layer }
    | { id: string; mode: "resize"; corner: "br" | "bl" | "tr" | "tl"; startX: number; startY: number; l0: Layer };
  const dragRef = useRef<DragState | null>(null);

  const onLayerPointerDown = (e: React.PointerEvent, layer: Layer) => {
    if (editingTextId === layer.id) return; // editing text → let contentEditable receive events
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setSelectedId(layer.id);
    dragRef.current = { id: layer.id, mode: "move", startX: e.clientX, startY: e.clientY, l0: layer };
  };

  const onResizePointerDown = (e: React.PointerEvent, layer: Layer, corner: "br" | "bl" | "tr" | "tl") => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setSelectedId(layer.id);
    dragRef.current = { id: layer.id, mode: "resize", corner, startX: e.clientX, startY: e.clientY, l0: layer };
  };

  const onStagePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const dxPct = ((e.clientX - d.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - d.startY) / rect.height) * 100;

    if (d.mode === "move") {
      const l0 = d.l0;
      const h = l0.kind === "image" ? l0.heightPct : 5;
      updateLayer(d.id, {
        xPct: Math.max(0, Math.min(100 - l0.widthPct, l0.xPct + dxPct)),
        yPct: Math.max(0, Math.min(100 - Math.min(h, 5), l0.yPct + dyPct)),
      });
      return;
    }

    // resize
    const l0 = d.l0;
    const affectLeft = d.corner === "bl" || d.corner === "tl";
    const affectTop = d.corner === "tl" || d.corner === "tr";
    let newX = l0.xPct;
    let newY = l0.yPct;
    let newW = l0.widthPct;
    let newH = l0.kind === "image" ? l0.heightPct : 0;

    if (affectLeft) {
      newX = Math.max(0, l0.xPct + dxPct);
      newW = Math.max(6, l0.widthPct - dxPct);
    } else {
      newW = Math.max(6, Math.min(100 - l0.xPct, l0.widthPct + dxPct));
    }
    if (l0.kind === "image") {
      if (affectTop) {
        newY = Math.max(0, l0.yPct + dyPct);
        newH = Math.max(6, l0.heightPct - dyPct);
      } else {
        newH = Math.max(6, Math.min(100 - l0.yPct, l0.heightPct + dyPct));
      }
      updateLayer<ImageLayer>(d.id, { xPct: newX, yPct: newY, widthPct: newW, heightPct: newH });
    } else {
      // scale font proportionally to width delta
      const scale = newW / l0.widthPct;
      const newFs = Math.max(1, Math.min(24, l0.fontSizePct * scale));
      updateLayer<TextLayer>(d.id, { xPct: newX, widthPct: newW, fontSizePct: newFs });
    }
  };
  const onStagePointerUp = () => { dragRef.current = null; };

  // Keyboard nudge
  useEffect(() => {
    if (!selectedId || editingTextId) return;
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;
      const step = e.shiftKey ? 5 : 1;
      const L = layers.find(l => l.id === selectedId);
      if (!L) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); updateLayer(L.id, { xPct: Math.max(0, L.xPct - step) }); }
      if (e.key === "ArrowRight") { e.preventDefault(); updateLayer(L.id, { xPct: Math.min(100 - L.widthPct, L.xPct + step) }); }
      if (e.key === "ArrowUp") { e.preventDefault(); updateLayer(L.id, { yPct: Math.max(0, L.yPct - step) }); }
      if (e.key === "ArrowDown") { e.preventDefault(); updateLayer(L.id, { yPct: Math.min(95, L.yPct + step) }); }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteLayer(L.id); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, editingTextId, layers]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─────────── export ─────────── */
  const exportPng = async (which: CreativeFormat | "all") => {
    if (!baseInput || !link) return;
    setRendering(true);
    try {
      await saveLayout();
      const targets = which === "all" ? FORMATS : [which];
      const brand = brandCtx?.brand ?? null;
      for (const f of targets) {
        const chromeSpec: BrandChromeSpec = {
          format: f,
          platformLogoSrc: brand?.logos.lockup || brand?.logos.wordmark || brand?.logos.mark || null,
          platformName: brand?.name || link.platformName || null,
          sealSrc: brand?.seal?.horizontal.light || brand?.seal?.horizontal.dark || null,
          sealLabel: brand?.seal?.alt ?? null,
        };
        const raw = f === format
          ? layers
          : (loadState(link.id, f, engineMode)?.layers ?? seedLayers(f));
        // Guard obrigatório: logo plataforma + assinatura PlayBet + selo legal SEMPRE presentes.
        const useLayers = ensureBrandChrome(raw, chromeSpec);
        const r = await renderCreative({
          ...baseInput, format: f,
          hideAutoText: true, hideAutoArt: true,
          layers: useLayers,
        });
        downloadCreative(r, buildMaterialFilename({
          brandKey: brandCtx?.brand?.key ?? link.platformName ?? "playbet",
          tipo: `${f}-${style}`,
          linkSlug: brandCtx?.linkSlug || link.gameName || link.id,
        }));
        await new Promise(res => setTimeout(res, 120));
      }
      toast.success(which === "all" ? "Kit exportado" : "Criativo baixado");

    } catch (e) {
      toast.error("Erro ao exportar", { description: (e as Error).message });
    } finally { setRendering(false); }
  };


  const downloadGameArt = async () => {
    if (!link?.gameIconUrl) { toast.error("Este link não tem arte do jogo"); return; }
    try {
      await downloadRawAsset(link.gameIconUrl, `${slugify(link.gameName || "jogo")}-arte`);
      toast.success("Arte do jogo baixada");
    } catch (e) { toast.error("Falha ao baixar arte", { description: (e as Error).message }); }
  };

  const downloadPlaybetLogo = async () => {
    try {
      await downloadRawAsset(playbetLogo, "playbet-logo");
      toast.success("Logo Playbet baixada");
    } catch (e) { toast.error("Falha ao baixar logo", { description: (e as Error).message }); }
  };

  const downloadPlatformLogo = async () => {
    const brand = brandCtx?.brand;
    const src = brand?.logos.wordmark || brand?.logos.lockup || brand?.logos.mark;
    if (!src) { toast.error("Logo da plataforma indisponível"); return; }
    try {
      await downloadRawAsset(src, `${slugify(brand?.name || link?.platformName || "plataforma")}-logo`);
      toast.success(`Logo ${brand?.name || "plataforma"} baixada`);
    } catch (e) { toast.error("Falha ao baixar logo", { description: (e as Error).message }); }
  };

  const downloadPlatformSeal = async () => {
    const brand = brandCtx?.brand;
    const src = brand?.seal?.horizontal.light || brand?.seal?.horizontal.dark;
    if (!src) { toast.error("Selo da plataforma indisponível"); return; }
    try {
      await downloadRawAsset(src, `${slugify(brand?.name || link?.platformName || "plataforma")}-selo-oficial`);
      toast.success(`Selo ${brand?.name || "plataforma"} baixado`);
    } catch (e) { toast.error("Falha ao baixar selo", { description: (e as Error).message }); }
  };

  const downloadBrandKit = async () => {
    await downloadPlaybetLogo().catch(() => {});
    await new Promise(r => setTimeout(r, 150));
    await downloadPlatformLogo().catch(() => {});
    await new Promise(r => setTimeout(r, 150));
    await downloadPlatformSeal().catch(() => {});
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

  const asText = (l: Layer | null): TextLayer | null => l && l.kind === "text" ? l : null;
  const asImage = (l: Layer | null): ImageLayer | null => l && l.kind === "image" ? l : null;
  const selectedText = asText(selected);
  const selectedImage = asImage(selected);

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
                {isOddsShare ? "Estúdio Odds · Aposta esportiva" : `Estúdio Jogos · ${link.gameName || "Sem título"}`}
                {isOddsShare && (
                  <Badge className="text-[10px] font-semibold bg-primary text-primary-foreground border-0">
                    Engine Odds
                    {oddsCtx?.total_odd ? ` · ${oddsCtx.total_odd.toFixed(2).replace(".", ",")}x` : ""}
                  </Badge>
                )}
                {!isOddsShare && link.hypeReason && (
                  <Badge variant="secondary" className="text-[10px] font-normal"><Sparkles className="w-3 h-3 mr-1" />{link.hypeReason}</Badge>
                )}
              </DialogTitle>
              <div className="text-xs flex items-center gap-2 flex-wrap text-muted-foreground">
                {link.platformName || "Plataforma"} · {size.label} · {size.w}×{size.h}px
                <BrandLockBadge ctx={brandCtx} className="text-[10px]" />

                <span className={cn("inline-flex items-center gap-1", dirty ? "text-amber-500" : "text-primary/80")}>
                  <Save className="w-3 h-3" /> {dirty ? "alterações pendentes" : savedAt ? "salvo" : "rascunho"}
                </span>
              </div>
            </div>
            {!lockEngine && (
              <div className="inline-flex items-center rounded-md border border-border/60 bg-secondary/40 p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setEngineMode("games")}
                  className={cn(
                    "px-2.5 py-1 rounded-sm transition-all",
                    engineMode === "games" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Arte tradicional de jogo"
                >
                  🎮 Jogos
                </button>
                <button
                  type="button"
                  onClick={() => setEngineMode("odds")}
                  className={cn(
                    "px-2.5 py-1 rounded-sm transition-all flex items-center gap-1",
                    engineMode === "odds" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Engine dedicada de aposta compartilhada"
                >
                  Σ Odds
                  {autoOddsShare && engineMode === "odds" && <span className="text-[9px] opacity-80">auto</span>}
                </button>
              </div>
            )}
            <button className="text-xs px-3 py-1.5 rounded-md border border-primary bg-primary/10 text-foreground transition-all flex items-center gap-1.5">
              <MousePointer2 className="w-3.5 h-3.5" />
              Editor ativo
            </button>
            <Button
              onClick={() => { resetToDefaults(); toast.success(`Layout regenerado com ${brandCtx?.brand?.name || "marca atual"}`); }}
              variant="outline" size="sm" className="h-8 text-xs"
              title="Sobrescreve o layout atual usando logos, cores e selo da marca resolvida pelo link"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Regenerar c/ marca
            </Button>
            <Button onClick={saveLayout} disabled={savingLayout} size="sm" className="h-8 text-xs">
              {savingLayout ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Salvar
            </Button>

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
            onClick={(e) => { if (e.target === e.currentTarget) { setSelectedId(null); setEditingTextId(null); } }}
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

              {layers.map((L) => {
                const isSel = L.id === selectedId;
                const isEditing = editingTextId === L.id;
                const commonStyle: React.CSSProperties = {
                  left: `${L.xPct}%`,
                  top: `${L.yPct}%`,
                  width: `${L.widthPct}%`,
                };

                if (L.kind === "image") {
                  return (
                    <div
                      key={L.id}
                      onPointerDown={(e) => onLayerPointerDown(e, L)}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(L.id); }}
                      className={cn(
                        "absolute z-10 cursor-move",
                        isSel ? "ring-2 ring-primary/80" : "hover:ring-1 hover:ring-primary/40",
                      )}
                      style={{ ...commonStyle, height: `${L.heightPct}%` }}
                    >
                      <img
                        src={L.src}
                        alt={L.label || ""}
                        draggable={false}
                        className="w-full h-full pointer-events-none"
                        style={{
                          objectFit: L.fit === "contain" ? "contain" : "cover",
                          borderRadius: `${L.radiusPct ?? 0}%`,
                          opacity: L.opacity ?? 1,
                          transform: L.rotateDeg ? `rotate(${L.rotateDeg}deg)` : undefined,
                          boxShadow: L.glow ? `0 0 0 2px ${L.glow}, 0 0 24px ${L.glow}80` : undefined,
                        }}
                      />
                      {isSel && <ResizeHandles onDown={(c, e) => onResizePointerDown(e, L, c)} />}
                    </div>
                  );
                }

                // Text layer
                return (
                  <div
                    key={L.id}
                    onPointerDown={(e) => onLayerPointerDown(e, L)}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(L.id); }}
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingTextId(L.id); }}
                    className={cn(
                      "absolute z-10 outline-none",
                      isEditing ? "cursor-text" : "cursor-move",
                      isSel ? "ring-2 ring-primary/80" : "hover:ring-1 hover:ring-primary/40",
                    )}
                    style={{ ...commonStyle, textAlign: L.align }}
                  >
                    <div
                      contentEditable={isEditing}
                      suppressContentEditableWarning
                      spellCheck={false}
                      ref={(el) => {
                        if (el && isEditing && document.activeElement !== el) {
                          el.focus();
                          // put cursor at end
                          const r = document.createRange();
                          r.selectNodeContents(el);
                          r.collapse(false);
                          const s = window.getSelection();
                          s?.removeAllRanges();
                          s?.addRange(r);
                        }
                      }}
                      onPointerDown={(e) => { if (isEditing) e.stopPropagation(); }}
                      onInput={(e) => updateLayer<TextLayer>(L.id, { text: (e.target as HTMLDivElement).innerText })}
                      onBlur={() => setEditingTextId(cur => cur === L.id ? null : cur)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") { (e.target as HTMLElement).blur(); }
                      }}
                      style={{
                        fontFamily: FAMILY_CSS[L.family],
                        fontWeight: L.weight,
                        fontSize: `${L.fontSizePct}cqw`,
                        color: L.color,
                        opacity: L.opacity ?? 1,
                        transform: L.rotateDeg ? `rotate(${L.rotateDeg}deg)` : undefined,
                        textAlign: L.align,
                        textTransform: L.uppercase ? "uppercase" : "none",
                        lineHeight: L.lineHeight ?? 1.05,
                        textShadow: L.shadow ? `0 2px ${Math.max(4, L.fontSizePct * 0.6)}px rgba(0,0,0,0.55)` : undefined,
                        background: L.bgColor || undefined,
                        padding: L.bgColor
                          ? `${(L.fontSizePct * (L.bgPadPct ?? 40)) / 160}cqw ${(L.fontSizePct * (L.bgPadPct ?? 40)) / 100}cqw`
                          : undefined,
                        borderRadius: L.bgColor ? `${L.bgRadiusPct ?? 20}%` : undefined,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        display: "inline-block",
                        width: L.bgColor ? "fit-content" : "100%",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        minWidth: "1ch",
                      }}
                    >
                      {L.text}
                    </div>
                    {isSel && !isEditing && <ResizeHandles onDown={(c, e) => onResizePointerDown(e, L, c)} textOnly />}
                    {isSel && !isEditing && (
                      <div className="absolute -top-6 left-0 flex items-center gap-1 bg-background/95 border border-border/60 rounded px-1.5 py-0.5 shadow text-[10px]">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingTextId(L.id); }}
                          className="px-1.5 py-0.5 hover:bg-secondary/60 rounded text-foreground"
                        >Editar texto</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="border-t md:border-t-0 md:border-l border-border/60 p-4 space-y-4 overflow-y-auto scrollbar-thin">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Templates</Label>
                <span className="text-[10px] text-muted-foreground">{isOddsShare ? "odds auto" : `${CREATIVE_TEMPLATES.length} prontos`}</span>
              </div>
              {isOddsShare && oddsCtx && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground truncate">{oddsCtx.event_label || "Aposta compartilhada"}</span>
                    {oddsCtx.total_odd ? <Badge className="text-[10px] border-0 bg-primary text-primary-foreground">{oddsCtx.total_odd.toFixed(2).replace(".", ",")}x</Badge> : null}
                  </div>
                  <div className="text-muted-foreground line-clamp-3">
                    {(oddsCtx.selections ?? []).slice(0, 3).map((s, i) => `${i + 1}. ${s.event || "Evento"} · ${s.pick || s.market} ${Number(s.odd || 0).toFixed(2)}x`).join("\n") || "Pronto para puxar seleções do link de aposta."}
                  </div>
                </div>
              )}
              {!isOddsShare && <div className="grid grid-cols-2 gap-1.5">
                {CREATIVE_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTpl(t.id)}
                    className="group text-left rounded-md border border-border/60 hover:border-primary/70 hover:bg-primary/5 transition-all p-2 flex flex-col gap-1"
                    title={t.tagline}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full ring-1 ring-border/60" style={{ background: t.accent }} />
                      <span className="text-[11px] font-semibold text-foreground truncate">{t.name}</span>
                    </div>
                    <span className="text-[9.5px] text-muted-foreground leading-tight line-clamp-2">{t.tagline}</span>
                  </button>
                ))}
              </div>}

            <ApplyLayoutPanel
              format={format}
              ctx={{
                brand: {
                  platformName: brandCtx?.brand?.name ?? link.platformName,
                  platformLogoSrc,
                  playbetLogoSrc: playbetLogo,
                  ctaColor: brandAccent,
                  sealSrc: platformSealSrc,
                  sealLabel: brandCtx?.brand?.seal?.alt ?? null,
                },
                link: {
                  gameName: isOddsShare ? (oddsCtx?.event_label || link.gameName || "Aposta compartilhada") : link.gameName,
                  gameIconUrl: isOddsShare ? (oddsCtx?.screenshot_url || link.gameIconUrl) : link.gameIconUrl,
                  hypeReason: isOddsShare ? `${oddsCtx?.bet_type || "odds"}${oddsCtx?.total_odd ? ` · ${oddsCtx.total_odd.toFixed(2).replace(".", ",")}x` : ""}` : link.hypeReason,
                  shortUrl: link.shortUrl,
                },
                odds: oddsCtx,
              }}
              engine={engineMode}
              onApply={(newLayers) => {
                setLayers(applyBrandChrome(newLayers));
                setSelectedId(null);
                setEditingTextId(null);
                setDirty(true);
              }}
            />

            {isOddsShare && (
              <CaptureOddPanel
                format={format}
                suggestedUrl={oddsCtx?.bookmaker_share_url || link.shortUrl}
                onCapture={(layer) => {
                  setLayers((ls) => [...ls, layer]);
                  setSelectedId(layer.id);
                  setDirty(true);
                }}
              />
            )}
            </div>

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

            <>
              <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Camadas</Label>
                  <div className="flex items-center gap-1">
                    <button onClick={addTextLayer} title="Adicionar texto" className="text-[10px] px-2 py-1 rounded border border-border/60 hover:border-primary hover:text-foreground text-muted-foreground flex items-center gap-1">
                      <Type className="w-3 h-3" /> Texto
                    </button>
                    <button onClick={addImageLayer} title="Adicionar imagem" disabled={!link.gameIconUrl} className="text-[10px] px-2 py-1 rounded border border-border/60 hover:border-primary hover:text-foreground text-muted-foreground flex items-center gap-1 disabled:opacity-40">
                      <ImageIcon className="w-3 h-3" /> Imagem
                    </button>
                    <button onClick={addPlatformLogoLayer} title="Adicionar logo real da plataforma" disabled={!platformLogoSrc} className="text-[10px] px-2 py-1 rounded border border-border/60 hover:border-primary hover:text-foreground text-muted-foreground flex items-center gap-1 disabled:opacity-40">
                      <BadgePlus className="w-3 h-3" /> Logo
                    </button>
                    <button onClick={addSealLayer} title="Adicionar selo oficial" disabled={!platformSealSrc} className="text-[10px] px-2 py-1 rounded border border-border/60 hover:border-primary hover:text-foreground text-muted-foreground flex items-center gap-1 disabled:opacity-40">
                      <Blend className="w-3 h-3" /> Selo
                    </button>
                  </div>
                </div>
                <div className="space-y-1 max-h-[160px] overflow-y-auto -mx-1 px-1 scrollbar-thin">
                  {layers.slice().reverse().map((L) => (
                    <div
                      key={L.id}
                      onClick={() => setSelectedId(L.id)}
                      className={cn(
                        "w-full text-left text-xs px-2 py-1.5 rounded-md flex items-center gap-1.5 border cursor-pointer",
                        selectedId === L.id ? "bg-primary/10 border-primary/50" : "border-transparent hover:bg-secondary/40",
                      )}
                    >
                      {L.kind === "text"
                        ? <Type className="w-3 h-3 text-muted-foreground shrink-0" />
                        : <ImageIcon className="w-3 h-3 text-muted-foreground shrink-0" />}
                      <span className="truncate flex-1 text-foreground">
                        {L.kind === "text" ? (L.text.split("\n")[0] || "(vazio)") : (L.label || "imagem")}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(L.id, 1); }} className="opacity-50 hover:opacity-100 p-0.5"><ChevronUp className="w-3 h-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(L.id, -1); }} className="opacity-50 hover:opacity-100 p-0.5"><ChevronDown className="w-3 h-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateLayer(L); }} className="opacity-50 hover:opacity-100 p-0.5"><CopyPlus className="w-3 h-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteLayer(L.id); }} className="opacity-60 hover:opacity-100 hover:text-destructive p-0.5"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {layers.length === 0 && (
                    <p className="text-[11px] text-muted-foreground px-2 py-3 text-center">Nenhuma camada.</p>
                  )}
                </div>

                {selected && (
                  <button onClick={() => duplicateLayer(selected)} className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 border border-border/60 rounded-md">
                    <CopyPlus className="w-3 h-3" /> Duplicar camada selecionada
                  </button>
                )}

                {selectedText && <TextInspector layer={selectedText} brandAccent={brandAccent} onChange={(p) => updateLayer<TextLayer>(selectedText.id, p)} />}
                {selectedImage && <ImageInspector layer={selectedImage} brandAccent={brandAccent} onChange={(p) => updateLayer<ImageLayer>(selectedImage.id, p)} />}

                <button onClick={resetToDefaults} className="w-full text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-1.5 border border-border/60 rounded-md">
                  <Undo2 className="w-3 h-3" /> Restaurar layout padrão
                </button>
              </>

            <div className="pt-3 space-y-2 border-t border-border/60">
              <Button onClick={saveLayout} disabled={savingLayout} variant={dirty ? "default" : "secondary"} className="w-full h-9 text-sm">
                {savingLayout ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar layout
              </Button>
              <Button onClick={() => exportPng(format)} disabled={!bg || rendering} className="w-full h-9 text-sm">
                <Download className="w-4 h-4 mr-2" /> Baixar {FORMAT_SIZES[format].label}
              </Button>
              <Button onClick={() => exportPng("all")} disabled={rendering} variant="secondary" className="w-full h-9 text-sm">
                <Sparkles className="w-4 h-4 mr-2" /> Kit completo (4 formatos)
              </Button>

              <div className="pt-2 mt-1 border-t border-border/40 space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Kit da marca · ativos isolados
                  </Label>
                  <button
                    onClick={downloadBrandKit}
                    className="text-[10px] text-primary hover:underline"
                    title="Baixa PlayBet + logo da plataforma + selo oficial"
                  >
                    Baixar tudo
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    onClick={downloadPlaybetLogo}
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] px-2"
                    title="Logo PlayBet (presente em todas as marcas)"
                  >
                    <Package className="w-3.5 h-3.5 mr-1.5" /> PlayBet
                  </Button>
                  <Button
                    onClick={downloadPlatformLogo}
                    disabled={!brandCtx?.brand?.logos?.wordmark && !brandCtx?.brand?.logos?.lockup && !brandCtx?.brand?.logos?.mark}
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] px-2"
                    title={`Logo oficial ${brandCtx?.brand?.name || "da plataforma"}`}
                  >
                    <Package className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    <span className="truncate">{brandCtx?.brand?.name || "Plataforma"}</span>
                  </Button>
                  <Button
                    onClick={downloadPlatformSeal}
                    disabled={!brandCtx?.brand?.seal?.horizontal?.light && !brandCtx?.brand?.seal?.horizontal?.dark}
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] px-2"
                    title={`Selo oficial ${brandCtx?.brand?.name || "da plataforma"}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Selo
                  </Button>
                </div>
                {link.gameIconUrl && (
                  <Button
                    onClick={downloadGameArt}
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground"
                    title="Baixa apenas a imagem original do jogo, sem edição"
                  >
                    <ImageDown className="w-3.5 h-3.5 mr-1.5" /> Arte do jogo (opcional)
                  </Button>
                )}
              </div>


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

/* ─────────── inspectors ─────────── */

function TextInspector({ layer, brandAccent, onChange }: { layer: TextLayer; brandAccent: string; onChange: (p: Partial<TextLayer>) => void }) {
  return (
    <div className="space-y-3 pt-3 border-t border-border/60">
      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Texto</Label>
        <Textarea
          value={layer.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={3}
          className="text-sm resize-none"
          placeholder="Digite aqui. Enter quebra linha."
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Fonte" value={layer.family} onChange={(v) => onChange({ family: v as TextLayer["family"] })}
          options={[["display", "Display"], ["sans", "Sans"], ["grotesk", "Grotesk"]]} />
        <SelectField label="Peso" value={String(layer.weight)} onChange={(v) => onChange({ weight: Number(v) as TextLayer["weight"] })}
          options={WEIGHTS.map(w => [String(w), String(w)] as [string, string])} />
      </div>
      <SliderField label="Tamanho" value={layer.fontSizePct} min={1} max={24} step={0.1} suffix="%" onChange={(v) => onChange({ fontSizePct: v })} />
      <div className="grid grid-cols-2 gap-2">
        <SliderField label="X" value={layer.xPct} min={0} max={100 - layer.widthPct} step={0.5} suffix="%" onChange={(v) => onChange({ xPct: v })} />
        <SliderField label="Y" value={layer.yPct} min={0} max={95} step={0.5} suffix="%" onChange={(v) => onChange({ yPct: v })} />
      </div>
      <SliderField label="Largura" value={layer.widthPct} min={10} max={100} step={1} suffix="%" onChange={(v) => onChange({ widthPct: v })} />
      <SliderField label="Entrelinhas" value={layer.lineHeight ?? 1.05} min={0.8} max={2} step={0.05} onChange={(v) => onChange({ lineHeight: v })} />
      <div className="grid grid-cols-2 gap-2">
        <SliderField label="Opacidade" value={layer.opacity ?? 1} min={0} max={1} step={0.05} onChange={(v) => onChange({ opacity: v })} />
        <SliderField label="Rotação" value={layer.rotateDeg ?? 0} min={-30} max={30} step={1} suffix="°" onChange={(v) => onChange({ rotateDeg: v })} />
      </div>
      <ColorField label="Cor do texto" value={layer.color} onChange={(v) => onChange({ color: v })} />
      <div className="grid grid-cols-4 gap-1">
        {["#FFFFFF", "#0B0F1E", "#FFC72C", brandAccent].map((color) => (
          <button
            key={color}
            onClick={() => onChange({ color })}
            className="h-7 rounded border border-border/60"
            style={{ background: color }}
            title={color}
          />
        ))}
      </div>
      <div className="flex items-center gap-1">
        {(["left", "center", "right"] as const).map(a => (
          <button key={a} onClick={() => onChange({ align: a })}
            className={cn("flex-1 h-8 rounded-md border flex items-center justify-center transition",
              layer.align === a ? "border-primary bg-primary/10" : "border-border/60 hover:border-border text-muted-foreground")}>
            {a === "left" && <AlignLeft className="w-3.5 h-3.5" />}
            {a === "center" && <AlignCenter className="w-3.5 h-3.5" />}
            {a === "right" && <AlignRight className="w-3.5 h-3.5" />}
          </button>
        ))}
        <button onClick={() => onChange({ uppercase: !layer.uppercase })}
          className={cn("h-8 px-2 rounded-md border text-[10px] font-bold",
            layer.uppercase ? "border-primary bg-primary/10" : "border-border/60 text-muted-foreground")}
          title="Maiúsculas">AA</button>
        <button onClick={() => onChange({ shadow: !layer.shadow })}
          className={cn("h-8 px-2 rounded-md border text-[10px]",
            layer.shadow ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground")}
          title="Sombra">◐</button>
      </div>
      <div className="pt-2 border-t border-border/40 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fundo (pílula)</Label>
          <button onClick={() => onChange({ bgColor: layer.bgColor ? null : brandAccent })}
            className={cn("text-[10px] px-2 py-0.5 rounded border",
              layer.bgColor ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground")}>
            {layer.bgColor ? "Ativo" : "Inativo"}
          </button>
        </div>
        {layer.bgColor && (
          <>
            <ColorField label="Cor" value={layer.bgColor} onChange={(v) => onChange({ bgColor: v })} />
            <SliderField label="Padding" value={layer.bgPadPct ?? 40} min={10} max={100} step={5} suffix="%" onChange={(v) => onChange({ bgPadPct: v })} />
            <SliderField label="Arredondamento" value={layer.bgRadiusPct ?? 20} min={0} max={50} step={1} suffix="%" onChange={(v) => onChange({ bgRadiusPct: v })} />
          </>
        )}
      </div>
    </div>
  );
}

function ImageInspector({ layer, brandAccent, onChange }: { layer: ImageLayer; brandAccent: string; onChange: (p: Partial<ImageLayer>) => void }) {
  return (
    <div className="space-y-3 pt-3 border-t border-border/60">
      <div className="grid grid-cols-2 gap-2">
        <SliderField label="X" value={layer.xPct} min={0} max={100 - layer.widthPct} step={0.5} suffix="%" onChange={(v) => onChange({ xPct: v })} />
        <SliderField label="Y" value={layer.yPct} min={0} max={100 - layer.heightPct} step={0.5} suffix="%" onChange={(v) => onChange({ yPct: v })} />
      </div>
      <SliderField label="Largura" value={layer.widthPct} min={5} max={100} step={1} suffix="%" onChange={(v) => onChange({ widthPct: v })} />
      <SliderField label="Altura" value={layer.heightPct} min={5} max={100} step={1} suffix="%" onChange={(v) => onChange({ heightPct: v })} />
      <SliderField label="Arredondamento" value={layer.radiusPct ?? 0} min={0} max={50} step={1} suffix="%" onChange={(v) => onChange({ radiusPct: v })} />
      <div className="grid grid-cols-2 gap-2">
        <SliderField label="Opacidade" value={layer.opacity ?? 1} min={0} max={1} step={0.05} onChange={(v) => onChange({ opacity: v })} />
        <SliderField label="Rotação" value={layer.rotateDeg ?? 0} min={-30} max={30} step={1} suffix="°" onChange={(v) => onChange({ rotateDeg: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SliderField label="Desfoque" value={layer.blur ?? 0} min={0} max={24} step={1} suffix="px" onChange={(v) => onChange({ blur: v || undefined })} />
        <SliderField label="Exposição" value={layer.brightness ?? 1} min={0.2} max={2} step={0.05} onChange={(v) => onChange({ brightness: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Ajuste" value={layer.fit ?? "cover"} onChange={(v) => onChange({ fit: v as ImageLayer["fit"] })}
          options={[["cover", "Preencher"], ["contain", "Conter"]]} />
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Brilho</Label>
          <button onClick={() => onChange({ glow: layer.glow ? null : brandAccent })}
            className={cn("w-full h-8 text-[10px] rounded border",
              layer.glow ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground")}>
            {layer.glow ? "Contorno ligado" : "Desligado"}
          </button>
        </div>
      </div>
      {layer.glow && <ColorField label="Cor do contorno" value={layer.glow} onChange={(v) => onChange({ glow: v })} />}
    </div>
  );
}

/* ─────────── small primitives ─────────── */

function SliderField({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {step < 1 ? value.toFixed(2) : Math.round(value)}{suffix ?? ""}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safe = value.length === 7 && value.startsWith("#") ? value : "#FFFFFF";
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={safe} onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="w-8 h-8 rounded border border-border/60 bg-background cursor-pointer" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs font-mono" />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 text-xs bg-background border border-border/60 rounded-md px-2">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function ResizeHandles({ onDown, textOnly = false }: {
  onDown: (corner: "br" | "bl" | "tr" | "tl", e: React.PointerEvent) => void;
  textOnly?: boolean;
}) {
  const corners: Array<{ c: "br" | "bl" | "tr" | "tl"; pos: string; cursor: string }> = textOnly
    ? [
        { c: "br", pos: "-right-1.5 -bottom-1.5", cursor: "ew-resize" },
        { c: "bl", pos: "-left-1.5 -bottom-1.5", cursor: "ew-resize" },
      ]
    : [
        { c: "tl", pos: "-left-1.5 -top-1.5", cursor: "nwse-resize" },
        { c: "tr", pos: "-right-1.5 -top-1.5", cursor: "nesw-resize" },
        { c: "bl", pos: "-left-1.5 -bottom-1.5", cursor: "nesw-resize" },
        { c: "br", pos: "-right-1.5 -bottom-1.5", cursor: "nwse-resize" },
      ];
  return (
    <>
      {corners.map(({ c, pos, cursor }) => (
        <div key={c}
          onPointerDown={(e) => onDown(c, e)}
          className={cn("absolute w-3 h-3 bg-primary rounded-sm shadow-md", pos)}
          style={{ cursor }}
        />
      ))}
    </>
  );
}
