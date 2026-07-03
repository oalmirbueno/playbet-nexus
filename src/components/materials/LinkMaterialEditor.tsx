import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  renderCreative, downloadCreative, slugify, downloadRawAsset,
  FORMAT_SIZES, STYLE_LABEL,
  type CreativeFormat, type CreativeStyle, type CreativeInput, type RenderedCreative,
} from "@/lib/creativeStudio";
import playbetLogo from "@/assets/logo-mark.png";
import {
  Loader2, Save, RefreshCw, Download, Sparkles, ExternalLink, Wand2, Layout, Package,
} from "lucide-react";

import { useLinkBrand } from "@/lib/useLinkBrand";
import { BrandLockBadge } from "@/components/brand/BrandLockBadge";


interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trackingLinkId: string | null;
  /** When true, hides all save controls and disables editable fields. Used by influencer/manager portals. */
  readOnly?: boolean;
}

interface LinkRow {
  id: string;
  game_name: string | null;
  game_icon_url: string | null;
  game_slug: string | null;
  short_url: string | null;
  tracking_code: string | null;
  hype_reason: string | null;
  landing_page_instance_id: string | null;
  platform_account_id: string | null;
  influencer_id: string | null;
}

interface Instance {
  id: string;
  slug: string;
  hype_copy: any;
  landing_page_id: string;
}

interface Material {
  id: string;
  format: CreativeFormat;
  style: CreativeStyle;
  meta: any;
}

const FORMATS: CreativeFormat[] = ["feed", "story", "landscape", "square_wa"];
const STYLES: CreativeStyle[] = ["hype", "minimal", "editorial"];

export function LinkMaterialEditor({ open, onOpenChange, trackingLinkId, readOnly = false }: Props) {
  const { data: brandCtx } = useLinkBrand(trackingLinkId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [link, setLink] = useState<LinkRow | null>(null);
  const [instance, setInstance] = useState<Instance | null>(null);
  const [lpSlug, setLpSlug] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState<string | null>(null);
  const [influencerSlug, setInfluencerSlug] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [preview, setPreview] = useState<RenderedCreative | null>(null);
  const [rendering, setRendering] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Editable LP hype copy
  const [hcTitle, setHcTitle] = useState("");
  const [hcSubtitle, setHcSubtitle] = useState("");
  const [hcCta, setHcCta] = useState("");

  // Editable per-material overrides
  const [mHeadline, setMHeadline] = useState("");
  const [mCta, setMCta] = useState("");
  const [mHandle, setMHandle] = useState("");
  const [mStyle, setMStyle] = useState<CreativeStyle>("hype");
  const [mFormat, setMFormat] = useState<CreativeFormat>("feed");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  /* ────────── load ────────── */
  useEffect(() => {
    if (!open || !trackingLinkId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: tl, error } = await supabase
          .from("tracking_links")
          .select("id, game_name, game_icon_url, game_slug, short_url, tracking_code, hype_reason, landing_page_instance_id, platform_account_id, influencer_id")
          .eq("id", trackingLinkId).maybeSingle();
        if (error) throw error;
        if (!tl) throw new Error("Link não encontrado");

        let inst: Instance | null = null;
        let lpSlugLocal: string | null = null;
        if (tl.landing_page_instance_id) {
          const { data: i } = await supabase
            .from("landing_page_instances")
            .select("id, slug, hype_copy, landing_page_id")
            .eq("id", tl.landing_page_instance_id).maybeSingle();
          if (i) {
            inst = i as any;
            const { data: lp } = await supabase.from("landing_pages").select("slug").eq("id", i.landing_page_id).maybeSingle();
            lpSlugLocal = lp?.slug ?? null;
          }
        }

        let pName: string | null = null;
        if (tl.platform_account_id) {
          const { data: pa } = await supabase
            .from("platform_accounts").select("platforms(name)").eq("id", tl.platform_account_id).maybeSingle();
          pName = (pa as any)?.platforms?.name ?? null;
        }

        let iSlug: string | null = null;
        if (tl.influencer_id) {
          const { data: inf } = await supabase.from("influencers").select("slug").eq("id", tl.influencer_id).maybeSingle();
          iSlug = inf?.slug ?? null;
        }

        const { data: mats } = await supabase
          .from("link_materials")
          .select("id, format, style, meta")
          .eq("tracking_link_id", trackingLinkId)
          .order("created_at", { ascending: true });

        if (cancelled) return;
        setLink(tl as any);
        setInstance(inst);
        setLpSlug(lpSlugLocal);
        setPlatformName(pName);
        setInfluencerSlug(iSlug);
        setMaterials((mats ?? []) as any);

        const hc = inst?.hype_copy ?? {};
        setHcTitle(hc.title ?? tl.game_name ?? "");
        setHcSubtitle(hc.subtitle ?? tl.hype_reason ?? "");
        setHcCta(hc.cta ?? "JOGAR AGORA");

        const first = (mats ?? [])[0] as Material | undefined;
        if (first) {
          setActiveMaterialId(first.id);
          hydrateMaterialForm(first, tl as any);
        } else {
          setActiveMaterialId(null);
        }
      } catch (e) {
        toast.error("Falha ao carregar", { description: (e as Error).message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, trackingLinkId]);

  function hydrateMaterialForm(m: Material, tl: LinkRow) {
    const o = m.meta?.overrides ?? {};
    setMFormat(m.format);
    setMStyle(m.style);
    setMHeadline(o.headline ?? tl.game_name ?? "");
    setMCta(o.cta ?? "JOGUE AGORA");
    setMHandle(o.handle ?? (tl.short_url ? tl.short_url.replace(/^https?:\/\//, "") : ""));
  }

  const activeMaterial = useMemo(
    () => materials.find(m => m.id === activeMaterialId) ?? null,
    [materials, activeMaterialId],
  );

  /* ────────── render preview ────────── */
  const creativeInput = useMemo<CreativeInput | null>(() => {
    if (!link) return null;
    return {
      format: mFormat, style: mStyle,
      gameName: link.game_name,
      gameImageUrl: link.game_icon_url,
      platformName,
      cta: mCta,
      handle: mHandle,
      headline: mHeadline,
      hypeReason: link.hype_reason,
      shortUrl: link.short_url ?? undefined,
    };
  }, [link, platformName, mFormat, mStyle, mCta, mHandle, mHeadline]);

  useEffect(() => {
    if (!creativeInput) return;
    let cancelled = false;
    setRendering(true);
    renderCreative(creativeInput)
      .then(r => { if (!cancelled) setPreview(r); })
      .catch(e => { if (!cancelled) toast.error("Falha no preview", { description: e.message }); })
      .finally(() => { if (!cancelled) setRendering(false); });
    return () => { cancelled = true; };
  }, [creativeInput]);

  /* ────────── save actions ────────── */
  const saveLpCopy = async () => {
    if (readOnly) { toast.info("Somente leitura", { description: "Peça ao admin para editar a copy da LP." }); return; }
    if (!instance) { toast.info("Este link não tem LP vinculada"); return; }
    setSaving(true);
    try {
      const nextCopy = { ...(instance.hype_copy ?? {}), title: hcTitle, subtitle: hcSubtitle, cta: hcCta };
      const { error } = await supabase
        .from("landing_page_instances")
        .update({ hype_copy: nextCopy, updated_at: new Date().toISOString() })
        .eq("id", instance.id);
      if (error) throw error;
      setInstance({ ...instance, hype_copy: nextCopy });
      setIframeKey(k => k + 1);
      toast.success("LP atualizada", { description: "Preview recarregado." });
    } catch (e) {
      toast.error("Falha ao salvar LP", { description: (e as Error).message });
    } finally { setSaving(false); }
  };

  const saveMaterial = async () => {
    if (readOnly) { toast.info("Somente leitura", { description: "Peça ao admin para editar este material." }); return; }
    if (!activeMaterial) return;
    setSaving(true);
    try {
      const nextMeta = {
        ...(activeMaterial.meta ?? {}),
        overrides: { headline: mHeadline, cta: mCta, handle: mHandle },
      };
      const { error } = await supabase
        .from("link_materials")
        .update({ format: mFormat, style: mStyle, meta: nextMeta, updated_at: new Date().toISOString() })
        .eq("id", activeMaterial.id);
      if (error) throw error;
      setMaterials(ms => ms.map(m => m.id === activeMaterial.id
        ? { ...m, format: mFormat, style: mStyle, meta: nextMeta } : m));
      toast.success("Material salvo");
    } catch (e) {
      toast.error("Falha ao salvar material", { description: (e as Error).message });
    } finally { setSaving(false); }
  };

  const download = () => {
    if (!preview || !link) return;
    downloadCreative(preview, `playbet-${slugify(link.game_name || "criativo")}-${mFormat}`);
  };

  const brand = brandCtx?.brand;
  const platformLogoSrc = brand?.logos.wordmark || brand?.logos.lockup || brand?.logos.mark || null;
  const platformSealSrc = brand?.seal?.horizontal.light || brand?.seal?.horizontal.dark || null;
  const platformSlugForFile = slugify(brand?.name || platformName || "plataforma");

  const downloadPlaybetLogo = async () => {
    try {
      await downloadRawAsset(playbetLogo, "playbet-logo");
      toast.success("Logo PlayBet baixada");
    } catch (e) { toast.error("Falha ao baixar logo PlayBet", { description: (e as Error).message }); }
  };
  const downloadPlatformLogo = async () => {
    if (!platformLogoSrc) return toast.error("Logo da plataforma indisponível");
    try {
      await downloadRawAsset(platformLogoSrc, `${platformSlugForFile}-logo`);
      toast.success(`Logo ${brand?.name || "plataforma"} baixada`);
    } catch (e) { toast.error("Falha ao baixar logo", { description: (e as Error).message }); }
  };
  const downloadPlatformSeal = async () => {
    if (!platformSealSrc) return toast.error("Selo da plataforma indisponível");
    try {
      await downloadRawAsset(platformSealSrc, `${platformSlugForFile}-selo-oficial`);
      toast.success(`Selo ${brand?.name || "plataforma"} baixado`);
    } catch (e) { toast.error("Falha ao baixar selo", { description: (e as Error).message }); }
  };
  const downloadBrandKit = async () => {
    await downloadPlaybetLogo().catch(() => {});
    await new Promise((r) => setTimeout(r, 120));
    if (platformLogoSrc) { await downloadPlatformLogo().catch(() => {}); await new Promise((r) => setTimeout(r, 120)); }
    if (platformSealSrc) { await downloadPlatformSeal().catch(() => {}); }
  };


  const lpPreviewUrl = useMemo(() => {
    if (!lpSlug || !influencerSlug) return null;
    const inst = instance?.slug ? `?i=${encodeURIComponent(instance.slug)}` : "";
    return `/lp/${lpSlug}/${influencerSlug}${inst}`;
  }, [lpSlug, influencerSlug, instance?.slug]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden gap-0 bg-background border-border/60">
        <DialogHeader className="px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            {link?.game_icon_url && (
              <img src={link.game_icon_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border/40" />
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base flex items-center gap-2 truncate">
                Editor · {link?.game_name || "Link"}
                {link?.hype_reason && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    <Sparkles className="w-3 h-3 mr-1" />{link.hype_reason}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs flex items-center gap-2 flex-wrap">
                <span>{platformName || "Plataforma"} · {readOnly ? "visualização — material já está pronto pra usar." : "edite textos/arte e veja o reflexo na LP."}</span>
                <BrandLockBadge ctx={brandCtx} className="text-[10px]" />
                {readOnly && <Badge variant="outline" className="text-[10px]">Somente leitura</Badge>}
              </DialogDescription>
            </div>

            {lpPreviewUrl && (
              <a href={lpPreviewUrl} target="_blank" rel="noreferrer"
                 className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary/40">
                <ExternalLink className="w-3.5 h-3.5" /> Abrir LP
              </a>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="p-8"><Skeleton className="h-96 w-full" /></div>
        ) : (
          <Tabs defaultValue="material" className="w-full">
            <TabsList className="mx-6 mt-4">
              <TabsTrigger value="material"><Wand2 className="w-3.5 h-3.5 mr-1.5" />Material</TabsTrigger>
              <TabsTrigger value="lp"><Layout className="w-3.5 h-3.5 mr-1.5" />LP & Copy</TabsTrigger>
            </TabsList>

            {/* MATERIAL TAB */}
            <TabsContent value="material" className="m-0">
              <div className="grid md:grid-cols-[1fr_340px] max-h-[70vh]">
                {/* preview */}
                <div className="relative bg-gradient-to-br from-secondary/20 to-secondary/5 min-h-[420px] flex items-center justify-center p-6 overflow-auto">
                  {rendering && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                  {preview ? (
                    <img src={preview.dataUrl} alt="Preview"
                         className="rounded-lg shadow-2xl max-h-[62vh] w-auto object-contain"
                         style={{ aspectRatio: `${FORMAT_SIZES[mFormat].w} / ${FORMAT_SIZES[mFormat].h}` }} />
                  ) : <Skeleton className="w-[320px] h-[320px] rounded-lg" />}
                </div>

                {/* controls */}
                <div className="border-t md:border-t-0 md:border-l border-border/60 p-5 space-y-4 overflow-y-auto">
                  {/* Kit da marca — sempre disponível, essencial para links sem jogo */}
                  <div className="space-y-2 pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between">
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
                        title="Logo PlayBet"
                      >
                        <Package className="w-3.5 h-3.5 mr-1.5" /> PlayBet
                      </Button>
                      <Button
                        onClick={downloadPlatformLogo}
                        disabled={!platformLogoSrc}
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px] px-2"
                        title={`Logo oficial ${brand?.name || "da plataforma"}`}
                      >
                        <Package className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        <span className="truncate">{brand?.name || "Plataforma"}</span>
                      </Button>
                      <Button
                        onClick={downloadPlatformSeal}
                        disabled={!platformSealSrc}
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px] px-2"
                        title={`Selo oficial ${brand?.name || "da plataforma"}`}
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Selo
                      </Button>
                    </div>
                    {!link?.game_slug && !link?.game_name && (
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Link sem jogo: use estes ativos separados para montar o post direto pra plataforma.
                      </p>
                    )}
                  </div>


                  {materials.length > 1 && (
                    <div className="space-y-2">
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Materiais deste link</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {materials.map(m => (
                          <button key={m.id}
                                  onClick={() => { setActiveMaterialId(m.id); if (link) hydrateMaterialForm(m, link); }}
                                  className={`text-[11px] px-2.5 py-1.5 rounded-md border ${
                                    m.id === activeMaterialId ? "border-primary bg-primary/10" : "border-border/60 text-muted-foreground hover:text-foreground"
                                  }`}>
                            {FORMAT_SIZES[m.format]?.label ?? m.format} · {STYLE_LABEL[m.style] ?? m.style}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Formato</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FORMATS.map(f => (
                        <button key={f} onClick={() => setMFormat(f)}
                          className={`text-[11px] px-2 py-2 rounded-md border ${mFormat === f ? "border-primary bg-primary/10" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>
                          {FORMAT_SIZES[f].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Estilo</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {STYLES.map(s => (
                        <button key={s} onClick={() => setMStyle(s)}
                          className={`text-[11px] px-2 py-2 rounded-md border ${mStyle === s ? "border-primary bg-primary/10" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>
                          {STYLE_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Headline</Label>
                    <Input value={mHeadline} onChange={e => setMHeadline(e.target.value)} disabled={readOnly} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">CTA</Label>
                    <Input value={mCta} onChange={e => setMCta(e.target.value)} disabled={readOnly} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Assinatura</Label>
                    <Input value={mHandle} onChange={e => setMHandle(e.target.value)} disabled={readOnly} className="h-9 text-sm" placeholder="@seuperfil" />
                  </div>

                  <div className="pt-3 border-t border-border/60 space-y-2">
                    {!readOnly && (
                      <Button onClick={saveMaterial} disabled={saving || !activeMaterial} className="w-full h-9 text-sm">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar material
                      </Button>
                    )}
                    <Button onClick={download} disabled={!preview} variant="secondary" className="w-full h-9 text-sm">
                      <Download className="w-4 h-4 mr-2" /> Baixar PNG
                    </Button>
                    {readOnly && (
                      <p className="text-[11px] text-muted-foreground text-center leading-snug">
                        Material publicado pelo admin. Baixe e poste — as atualizações chegam em tempo real.
                      </p>
                    )}
                    {!readOnly && !activeMaterial && (
                      <p className="text-[11px] text-muted-foreground text-center">
                        Este link ainda não tem materiais na fila — ajuste e baixe manualmente.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* LP TAB */}
            <TabsContent value="lp" className="m-0">
              <div className="grid md:grid-cols-[340px_1fr] max-h-[70vh]">
                <div className="p-5 space-y-4 border-b md:border-b-0 md:border-r border-border/60 overflow-y-auto">
                  {!instance ? (
                    <div className="text-sm text-muted-foreground">
                      Este link não está associado a uma instância de LP. Gere uma nova pela Central de Links para editar copy aqui.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Título</Label>
                        <Input value={hcTitle} onChange={e => setHcTitle(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Subtítulo / motivo do hype</Label>
                        <Textarea value={hcSubtitle} onChange={e => setHcSubtitle(e.target.value)} rows={3} className="text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">CTA</Label>
                        <Input value={hcCta} onChange={e => setHcCta(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div className="pt-3 border-t border-border/60 space-y-2">
                        <Button onClick={saveLpCopy} disabled={saving} className="w-full h-9 text-sm">
                          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Salvar e atualizar preview
                        </Button>
                        <Button onClick={() => setIframeKey(k => k + 1)} variant="ghost" size="sm" className="w-full h-8 text-xs text-muted-foreground">
                          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Recarregar preview
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-secondary/20 min-h-[420px]">
                  {lpPreviewUrl ? (
                    <iframe
                      key={iframeKey}
                      ref={iframeRef}
                      src={lpPreviewUrl}
                      title="LP Preview"
                      className="w-full h-full min-h-[65vh] border-0 bg-background"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
                      Preview indisponível — a LP ou o influenciador não têm slug configurado.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
