import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, ArrowRight, Loader2, Plus, Sparkles, Wand2, Flame, RefreshCw } from "lucide-react";
import type { TrackingLinkRow } from "@/services/trackingService";
import { landingPageInstanceService } from "@/services/supabaseService";
import { toast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { detectFromUrl, CATEGORY_LABELS, inferAttributionParam, type LinkCategory } from "@/lib/linkIntelligence";
import GameArtwork from "@/components/tracking/GameArtwork";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: FormState;
  onSave: (data: FormState) => void;
  accounts: any[];
  influencers: any[];
  campanhas: any[];
  landingPages: any[];
  lpInstances: any[];
  platforms: any[];
}

export interface FormState {
  id?: string;
  platform_account_id: string;
  landing_page_id: string;
  landing_page_instance_id: string;
  influencer_id: string;
  campanha_id: string;
  conteudo_id: string;
  base_url: string;
  final_url: string;
  short_url: string;
  click_id_param_name: string;
  tracking_role: string;
  notes: string;
  use_lp: boolean;
  // Inteligência de link
  game_slug: string;
  game_name: string;
  game_icon_url: string;
  link_category: string;
  hype_reason: string;
  parent_link_id?: string | null;
}

export const emptyForm: FormState = {
  platform_account_id: "",
  landing_page_id: "",
  landing_page_instance_id: "",
  influencer_id: "",
  campanha_id: "",
  conteudo_id: "",
  base_url: "",
  final_url: "",
  short_url: "",
  click_id_param_name: "sub1",
  tracking_role: "influencer",
  notes: "",
  use_lp: true,
  game_slug: "",
  game_name: "",
  game_icon_url: "",
  link_category: "",
  hype_reason: "",
  parent_link_id: null,
};

export function formFromRow(l: TrackingLinkRow): FormState {
  const stored = (l as any).use_lp;
  return {
    id: l.id,
    platform_account_id: l.platform_account_id || "",
    landing_page_id: l.landing_page_id || "",
    landing_page_instance_id: l.landing_page_instance_id || "",
    influencer_id: l.influencer_id || "",
    campanha_id: l.campanha_id || "",
    conteudo_id: l.conteudo_id || "",
    base_url: l.base_url || "",
    final_url: l.final_url || "",
    short_url: l.short_url || "",
    click_id_param_name: l.click_id_param_name || "sub1",
    tracking_role: (l as any).tracking_role || "influencer",
    notes: l.notes || "",
    // Prefer the explicit stored mode; fall back to inference for legacy rows.
    use_lp: typeof stored === "boolean" ? stored : !!(l.landing_page_instance_id || l.landing_page_id),
    game_slug: (l as any).game_slug || "",
    game_name: (l as any).game_name || "",
    game_icon_url: (l as any).game_icon_url || "",
    link_category: (l as any).link_category || "",
    hype_reason: (l as any).hype_reason || "",
    parent_link_id: (l as any).parent_link_id ?? null,
  };
}

const TRACKING_ROLES = [
  { value: "influencer", label: "Influencer" },
  { value: "socio", label: "Sócio(a)" },
  { value: "parceiro", label: "Parceiro" },
  { value: "interno", label: "Interno / Teste" },
];

/**
 * Universal sub-id mapping (see lib/trackingUrl):
 *   sub1 = click_id    → atribuição de receita (AFP em casas BR)
 *   sub2 = influencer  → quem trouxe o jogador
 *   sub3 = campanha    → criativo / campanha de origem
 */
import { buildPublicLpUrl, buildTrackedAffiliateUrl } from "@/lib/trackingUrl";

export const buildTrackedUrl = buildTrackedAffiliateUrl;

function Step({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold">{n}</span>
      {label}
    </div>
  );
}

export default function TrackingLinkForm({ open, onOpenChange, editing: initialEditing, onSave, accounts, influencers, campanhas, landingPages, lpInstances, platforms }: Props) {
  const [form, setForm] = useState<FormState>(initialEditing);

  useEffect(() => {
    setForm(initialEditing);
  }, [initialEditing]);

  // Single source of truth for the mode - persisted on the row as use_lp.
  const useLp = form.use_lp;
  const setUseLp = (v: boolean) => setForm(p => ({ ...p, use_lp: v }));

  const set = (field: keyof FormState, value: string) => setForm(p => ({ ...p, [field]: value }));

  const qc = useQueryClient();
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [batchApplying, setBatchApplying] = useState(false);
  const [refreshingHype, setRefreshingHype] = useState(false);

  // ── Link intelligence: auto-detect platform/category/game from pasted URL ──
  const detection = useMemo(
    () => detectFromUrl(form.base_url, platforms as any[]),
    [form.base_url, platforms],
  );

  const detectedPlatformId = detection.platformCandidates[0]?.platformId ?? null;
  const detectedPlatformName = detectedPlatformId
    ? (platforms as any[]).find((p: any) => p.id === detectedPlatformId)?.name ?? null
    : null;

  // Auto-fill platform account when we detect a platform and no account is chosen yet
  useEffect(() => {
    if (!detectedPlatformId || form.platform_account_id) return;
    const acc = (accounts as any[]).find((a: any) => a.platform_id === detectedPlatformId && a.is_active !== false);
    if (acc) setForm(p => ({ ...p, platform_account_id: acc.id }));
  }, [detectedPlatformId, form.platform_account_id, accounts]);

  // Auto-fill category / game from URL heuristics, without stomping user overrides
  useEffect(() => {
    setForm(p => {
      const next = { ...p };
      let changed = false;
      if (!p.link_category && detection.category) { next.link_category = detection.category; changed = true; }
      if (!p.game_slug && detection.gameSlug) { next.game_slug = detection.gameSlug; changed = true; }
      if (!p.game_name && detection.gameName) { next.game_name = detection.gameName; changed = true; }
      return changed ? next : p;
    });
  }, [detection.category, detection.gameSlug, detection.gameName]);

  // Resolve the "current" platform id (detected or from selected account)
  const currentAccount = (accounts as any[]).find((a: any) => a.id === form.platform_account_id);
  const currentPlatformId = currentAccount?.platform_id ?? detectedPlatformId ?? null;
  const currentPlatformName = currentPlatformId
    ? (platforms as any[]).find((p: any) => p.id === currentPlatformId)?.name ?? detectedPlatformName
    : detectedPlatformName;

  useEffect(() => {
    if (!form.base_url) return;
    const nextParam = inferAttributionParam(form.base_url, currentPlatformName);
    if (nextParam && form.click_id_param_name !== nextParam) {
      setForm(p => ({ ...p, click_id_param_name: nextParam }));
    }
  }, [form.base_url, currentPlatformName, form.click_id_param_name]);

  // Fetch hyped games for this platform
  const { data: hypedGames = [] } = useQuery({
    queryKey: ["platform_hyped_games", currentPlatformId],
    enabled: !!currentPlatformId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_hyped_games")
        .select("id, game_name, game_slug, icon_url, category, priority, hype_reason")
        .eq("platform_id", currentPlatformId as string)
        .eq("is_active", true)
        .order("priority", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const refreshHypedGames = async () => {
    if (!currentPlatformId) return;
    setRefreshingHype(true);
    try {
      const { error } = await supabase.functions.invoke("hyped-games-refresh", {
        body: { platform_id: currentPlatformId },
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["platform_hyped_games", currentPlatformId] });
      toast({ title: "Jogos atualizados", description: "Top jogos e logos reais recarregados." });
    } catch (e: any) {
      toast({ title: "Falha ao atualizar", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setRefreshingHype(false);
    }
  };

  const applyHypedGame = (g: any) => {
    setForm(p => ({
      ...p,
      game_slug: g.game_slug,
      game_name: g.game_name,
      game_icon_url: g.icon_url || "",
      link_category: g.category || p.link_category,
      hype_reason: g.hype_reason || p.hype_reason,
    }));
    toast({ title: `Aplicado: ${g.game_name}`, description: g.hype_reason || "Jogo em alta selecionado." });
  };

  const applyAllHypedBatch = async () => {
    if (form.id) {
      toast({ title: "Batch indisponível", description: "Use lote apenas ao criar um link novo.", variant: "destructive" });
      return;
    }
    if (!form.influencer_id || !form.platform_account_id || !form.base_url) {
      toast({ title: "Faltam dados", description: "Preencha influencer, conta e link de afiliado antes.", variant: "destructive" });
      return;
    }
    if (useLp && !form.landing_page_instance_id) {
      toast({ title: "Faltam dados", description: "Selecione a landing page.", variant: "destructive" });
      return;
    }
    if (!hypedGames.length) return;

    setBatchApplying(true);
    try {
      // Persist affiliate URL on the LP instance once (Com LP)
      if (useLp && selectedInstance && selectedInstance.affiliate_link !== form.base_url) {
        await landingPageInstanceService.update(selectedInstance.id, { affiliate_link: form.base_url });
        await qc.invalidateQueries({ queryKey: ["landing_page_instances"] });
      }

      const rows = hypedGames.map((g: any) => ({
        influencer_id: form.influencer_id,
        platform_account_id: form.platform_account_id,
        landing_page_id: useLp ? (form.landing_page_id || null) : null,
        landing_page_instance_id: useLp ? (form.landing_page_instance_id || null) : null,
        campanha_id: form.campanha_id || null,
        conteudo_id: form.conteudo_id || null,
        base_url: form.base_url,
        final_url: finalUrl,
        short_url: form.short_url || null,
        click_id_param_name: form.click_id_param_name,
        tracking_role: form.tracking_role,
        notes: form.notes || null,
        use_lp: useLp,
        game_slug: g.game_slug,
        game_name: g.game_name,
        game_icon_url: g.icon_url || null,
        link_category: g.category || form.link_category || null,
        hype_reason: g.hype_reason || null,
        hype_priority: g.priority ?? null,
      }));

      const { data: inserted, error } = await (supabase as any)
        .from("tracking_links")
        .insert(rows)
        .select("id, game_name");

      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["tracking_links"] });
      toast({
        title: `${inserted?.length ?? rows.length} links criados em lote`,
        description: (inserted ?? rows).map((r: any) => r.game_name).filter(Boolean).join(", "),
      });
      onOpenChange(false);
    } catch (e: any) {
      const msg = e?.message?.includes("duplicate") || e?.code === "23505"
        ? "Alguns jogos já têm link para este influencer/LP. Remova os duplicados e tente de novo."
        : (e?.message || "Falha ao criar links em lote.");
      toast({ title: "Erro no lote", description: msg, variant: "destructive" });
    } finally {
      setBatchApplying(false);
    }
  };

  // LPs where this influencer already has an instance (resolved + ready)
  const lpsForInfluencer = useMemo(() => {
    if (!form.influencer_id) return [] as any[];
    const lpIds = new Set(
      lpInstances
        .filter((i: any) => i.influencer_id === form.influencer_id)
        .map((i: any) => i.landing_page_id),
    );
    return landingPages.filter((lp: any) => lpIds.has(lp.id));
  }, [lpInstances, landingPages, form.influencer_id]);

  // LPs the influencer doesn't have yet - offered as "create new for"
  const lpsWithoutInstance = useMemo(() => {
    if (!form.influencer_id) return [] as any[];
    const lpIds = new Set(lpsForInfluencer.map((lp: any) => lp.id));
    return landingPages.filter((lp: any) => !lpIds.has(lp.id));
  }, [lpsForInfluencer, landingPages, form.influencer_id]);

  // Resolve the instance for (influencer, LP) and autofill base_url
  const handleLandingPage = (lpId: string) => {
    const inst = lpInstances.find(
      (i: any) => i.landing_page_id === lpId && i.influencer_id === form.influencer_id,
    );
    setForm(p => ({
      ...p,
      landing_page_id: lpId,
      landing_page_instance_id: inst?.id || "",
      base_url: inst?.affiliate_link || p.base_url,
    }));
  };

  // Create a new instance for (influencer, LP) when one doesn't exist yet
  const handleCreateInstanceForLP = async (lpId: string) => {
    const inf = influencers.find((i: any) => i.id === form.influencer_id);
    if (!inf) return;
    const lp = landingPages.find((l: any) => l.id === lpId);
    const base = (inf.slug || inf.name || "ref").toLowerCase().replace(/[^a-z0-9-]/g, "-");
    // ensure unique against existing instances of this LP
    const existing = lpInstances.filter((i: any) => i.landing_page_id === lpId).map((i: any) => i.slug);
    let slug = base;
    let n = 2;
    while (existing.includes(slug)) { slug = `${base}-${n++}`; }
    setCreatingInstance(true);
    try {
      const created: any = await landingPageInstanceService.create({
        landing_page_id: lpId,
        influencer_id: form.influencer_id,
        slug,
        affiliate_link: "",
        is_active: true,
      } as any);
      await qc.invalidateQueries({ queryKey: ["landing_page_instances"] });
      setForm(p => ({
        ...p,
        landing_page_id: lpId,
        landing_page_instance_id: created.id,
        base_url: "",
      }));
      toast({ title: "Landing page vinculada", description: `${lp?.name || "LP"} · /${slug}` });
    } catch (e: any) {
      toast({ title: "Erro ao vincular LP", description: e.message, variant: "destructive" });
    } finally {
      setCreatingInstance(false);
    }
  };

  const selectedInfluencer = influencers.find((i: any) => i.id === form.influencer_id);
  const selectedInstance = lpInstances.find((i: any) => i.id === form.landing_page_instance_id);
  const selectedLP = landingPages.find((l: any) => l.id === form.landing_page_id);
  const selectedAccount = accounts.find(a => a.id === form.platform_account_id);
  const platformName = platforms.find((p: any) => p.id === selectedAccount?.platform_id)?.name;

  // Default slug = influencer slug (universal subid)
  const defaultSubid = (selectedInfluencer as any)?.slug || "";
  const currentSubid = (() => {
    if (!form.base_url) return defaultSubid;
    try {
      const u = new URL(form.base_url);
      return u.searchParams.get(form.click_id_param_name) || defaultSubid;
    } catch { return defaultSubid; }
  })();
  const [subid, setSubid] = useState(currentSubid);
  useEffect(() => { setSubid(currentSubid); /* eslint-disable-next-line */ }, [form.influencer_id, form.base_url]);

  // sub1 = click_id slug (atribuição). Editável. Default = slug do influencer.
  const sub1Value = subid;
  // sub2 = influencer_id (UUID). Automático.
  const sub2Value = form.influencer_id || "";
  // sub3 = campanha_id (UUID). Automático quando campanha selecionada.
  const sub3Value = form.campanha_id || "";

  // The link the influencer shares = the LP public URL (NOT the affiliate URL).
  // Visitors land on the LP, click the CTA, and only then get redirected to
  // the affiliate URL (which is stored on the LP instance).
  const publicLpUrl = useMemo(() => {
    if (!useLp) return "";
    return buildPublicLpUrl(selectedLP?.domain, selectedInstance?.slug, sub2Value, sub3Value);
  }, [useLp, selectedLP, selectedInstance, sub2Value, sub3Value]);

  // The deep affiliate URL with attribution params - used by the LP CTA, not shared directly.
  const trackedAffiliateUrl = useMemo(
    () => buildTrackedUrl(form.base_url, form.click_id_param_name, sub1Value, sub2Value, sub3Value),
    [form.base_url, form.click_id_param_name, sub1Value, sub2Value, sub3Value],
  );

  // Without LP, the shared link goes straight to the affiliate.
  const finalUrl = useLp ? (publicLpUrl || trackedAffiliateUrl) : trackedAffiliateUrl;

  const canSave = form.influencer_id
    && form.platform_account_id
    && form.base_url
    && (useLp ? !!form.landing_page_instance_id : true);

  const handleSave = async () => {
    // Persist the affiliate URL on the LP instance so the LP CTA can use it (Com LP only).
    if (useLp && selectedInstance && form.base_url && selectedInstance.affiliate_link !== form.base_url) {
      try {
        await landingPageInstanceService.update(selectedInstance.id, { affiliate_link: form.base_url });
        await qc.invalidateQueries({ queryKey: ["landing_page_instances"] });
      } catch (e: any) {
        toast({ title: "Erro ao salvar link no botão da LP", description: e.message, variant: "destructive" });
        return;
      }
    }
    // Sem LP: drop instance/LP refs so the saved tracking_link reflects mode.
    const payload = useLp
      ? form
      : { ...form, landing_page_id: "", landing_page_instance_id: "" };
    onSave({ ...payload, final_url: finalUrl });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-3xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base">{form.id ? "Editar link" : "Novo link"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1 min-w-0">


          {/* 1. Influencer */}
          <div className="space-y-1.5">
            <Step n={1} label="Influencer" />
            <Select value={form.influencer_id} onValueChange={v => set("influencer_id", v)}>
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Selecione o influencer" /></SelectTrigger>
              <SelectContent>
                {(influencers as any[]).map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}{i.slug ? ` · ${i.slug}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode toggle: Com LP / Sem LP */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 p-2.5">
            <div className="text-[11px]">
              <div className="font-semibold text-foreground">Fluxo do link</div>
              <div className="text-[10px] text-muted-foreground">
                {useLp
                  ? "Visitante → landing page → clica no CTA → afiliado"
                  : "Visitante → afiliado direto (sem LP)"}
              </div>
            </div>
            <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-[10px] font-medium">
              <button
                type="button"
                onClick={() => setUseLp(true)}
                className={`px-2.5 py-1 rounded ${useLp ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >Com LP</button>
              <button
                type="button"
                onClick={() => setUseLp(false)}
                className={`px-2.5 py-1 rounded ${!useLp ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >Sem LP</button>
            </div>
          </div>

          {/* 2. Landing page (pick the LP; instance + affiliate link auto-resolve) */}
          {useLp && (
            <div className="space-y-1.5">
            <Step n={2} label="Landing page" />
            <Select
              value={form.landing_page_id}
              onValueChange={handleLandingPage}
              disabled={!form.influencer_id}
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder={form.influencer_id ? "Escolha a landing page" : "Escolha um influencer primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {lpsForInfluencer.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">Vinculadas a {selectedInfluencer?.name?.split(" ")[0] || "influencer"}</div>
                    {lpsForInfluencer.map((lp: any) => {
                      const inst = lpInstances.find((i: any) => i.landing_page_id === lp.id && i.influencer_id === form.influencer_id);
                      return (
                        <SelectItem key={lp.id} value={lp.id}>
                          {lp.name} <span className="text-muted-foreground">· /{inst?.slug}</span>
                        </SelectItem>
                      );
                    })}
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Visual confirmation of resolved affiliate link */}
            {selectedInstance && (
              <div className="flex items-center gap-2 text-[10px] text-foreground px-2 py-1.5 rounded bg-primary/5 border border-primary/15 min-w-0">
                <CheckCircle2 size={11} className="text-primary shrink-0" />
                <span className="text-muted-foreground shrink-0">CTA da LP:</span>
                <code className="font-mono truncate min-w-0 flex-1" title={selectedInstance.affiliate_link}>
                  {selectedInstance.affiliate_link || <em className="not-italic text-muted-foreground">vazio - preencha abaixo</em>}
                </code>
              </div>
            )}


            {/* Inline create instance for LPs not yet linked to this influencer */}
            {form.influencer_id && lpsWithoutInstance.length > 0 && (
              <details className="text-[10px] mt-1">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  + Vincular outra landing page a este influencer
                </summary>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {lpsWithoutInstance.map((lp: any) => (
                    <button
                      key={lp.id}
                      type="button"
                      disabled={creatingInstance}
                      onClick={() => handleCreateInstanceForLP(lp.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-secondary text-[10px]"
                    >
                      {creatingInstance ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                      {lp.name}
                    </button>
                  ))}
                </div>
              </details>
            )}
            </div>
          )}

          {/* 3. Platform account */}
          <div className="space-y-1.5">
            <Step n={3} label="Conta na plataforma" />
            <Select value={form.platform_account_id} onValueChange={v => set("platform_account_id", v)}>
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="PlayBet, SuperBet, 1win…" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.nome_conta}</SelectItem>)}
              </SelectContent>
            </Select>
            {platformName && <p className="text-[10px] text-primary/80">Plataforma: {platformName}</p>}
          </div>

          {/* 4. Affiliate link + auto sub1/sub2/sub3 */}
          {form.platform_account_id && (
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <Step n={4} label="Link de afiliado (destino do CTA)" />
                <span className="text-[9px] uppercase tracking-wider text-primary/80 font-semibold">
                  AFP / sub1 = atribuição
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground -mt-1">
                Esse link entra no <b>botão da landing page</b>. O visitante chega na LP primeiro, clica no CTA e só então é redirecionado para a casa.
              </p>

              <Input
                className="h-9 text-xs font-mono"
                value={form.base_url}
                onChange={e => set("base_url", e.target.value)}
                placeholder="Cole o link bruto da plataforma"
              />

              {/* Detecção inteligente */}
              {form.base_url && (
                <div className="rounded-md border border-primary/20 bg-background/40 p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                    <Wand2 size={11} className="text-primary" />
                    <span className="uppercase tracking-wider font-semibold text-primary/90">Detectado</span>
                    {detectedPlatformName || platformName ? (
                      <span className="text-foreground">{detectedPlatformName || platformName}</span>
                    ) : (
                      <span className="text-warning">selecione a casa; a inteligência aplica jogo/categoria mesmo sem domínio conhecido</span>
                    )}
                    {form.link_category && (
                      <span className="px-1.5 py-0.5 rounded bg-secondary/60 text-foreground text-[9px]">
                        {CATEGORY_LABELS[form.link_category as LinkCategory] ?? form.link_category}
                      </span>
                    )}
                    {form.game_name && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px]">
                        {form.game_name}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Tipo</Label>
                      <Select value={form.link_category || "none"} onValueChange={v => set("link_category", v === "none" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Auto" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Auto</SelectItem>
                          {(Object.keys(CATEGORY_LABELS) as LinkCategory[]).map(k => (
                            <SelectItem key={k} value={k}>{CATEGORY_LABELS[k]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Jogo / evento</Label>
                      <Input
                        className="h-8 text-xs"
                        value={form.game_name}
                        onChange={e => setForm(p => ({ ...p, game_name: e.target.value, game_slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") }))}
                        placeholder="Fortune Tiger, Aviator…"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Motivo do hype</Label>
                    <Input
                      className="h-8 text-xs"
                      value={form.hype_reason}
                      onChange={e => set("hype_reason", e.target.value)}
                      placeholder="Ex: Fortune Tiger está pagando muito essa semana"
                    />
                  </div>
                </div>
              )}

              {/* Jogos hypados da casa */}
              {currentPlatformId && (
                <div className="rounded-md border border-orange-500/25 bg-orange-500/5 p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                    <Flame size={11} className="text-orange-400" />
                    <span className="uppercase tracking-wider font-semibold text-orange-400">Jogos em alta</span>
                    {hypedGames.length > 0 && <span className="text-muted-foreground">· {hypedGames.length} · clique para aplicar</span>}
                    <button
                      type="button"
                      onClick={refreshHypedGames}
                      disabled={refreshingHype}
                      className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 text-[9px] font-medium disabled:opacity-60"
                      title="Buscar top jogos e logos reais desta casa"
                    >
                      {refreshingHype ? <Loader2 size={9} className="animate-spin" /> : <RefreshCw size={9} />}
                      {refreshingHype ? "Atualizando" : "Atualizar"}
                    </button>
                    {!form.id && hypedGames.length > 0 && (
                      <button
                        type="button"
                        onClick={applyAllHypedBatch}
                        disabled={batchApplying}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 text-[10px] font-semibold disabled:opacity-60"
                        title="Cria 1 link para cada jogo em alta"
                      >
                        {batchApplying ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        {batchApplying ? "Criando…" : `Lote (${hypedGames.length})`}
                      </button>
                    )}
                  </div>
                  {hypedGames.length > 0 ? (
                    <div className="invisible-scroll flex gap-1.5 overflow-x-auto snap-x pb-1 -mx-0.5 px-0.5">
                      {hypedGames.map((g: any) => {
                        const selected = form.game_slug === g.game_slug;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => applyHypedGame(g)}
                            className={`snap-start shrink-0 w-[76px] flex flex-col items-center gap-1 rounded-md border p-1.5 text-center transition ${
                              selected
                                ? "border-orange-500/60 bg-orange-500/10"
                                : "border-border/50 bg-background/40 hover:border-orange-500/40 hover:bg-orange-500/5"
                            }`}
                            title={g.hype_reason || g.game_name}
                          >
                            <div className="relative">
                              <GameArtwork slug={g.game_slug} name={g.game_name} iconUrl={g.icon_url} size="md" />
                              <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-orange-500 text-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                {g.priority}
                              </span>
                            </div>
                            <span className="text-[9px] font-medium truncate w-full leading-tight">{g.game_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic">Nenhum jogo cadastrado. Clique em Atualizar para buscar do catálogo da casa.</p>
                  )}
                </div>
              )}


              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Parâmetro de atribuição (escolha o equivalente na casa)
                </Label>
                <div className="grid grid-cols-[1fr_140px] gap-2">
                  <Select value={form.click_id_param_name} onValueChange={v => set("click_id_param_name", v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sub1">sub1 (padrão universal)</SelectItem>
                      <SelectItem value="afp">AFP (EstrelaBet, Vooopi)</SelectItem>
                      <SelectItem value="click_id">click_id (1win, Alanbase)</SelectItem>
                      <SelectItem value="clickid">clickid (Betano)</SelectItem>
                      <SelectItem value="aff_sub">aff_sub (Stake)</SelectItem>
                      <SelectItem value="s1">s1 (genérico)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-9 text-xs font-mono"
                    value={subid}
                    onChange={e => setSubid(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                    placeholder="slug"
                  />
                </div>
              </div>

              {/* Sub breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="rounded border border-border/60 bg-background/40 p-2">
                  <div className="text-[9px] uppercase text-primary font-semibold">{form.click_id_param_name} · atribuição</div>
                  <div className="font-mono text-[10px] mt-0.5 truncate text-foreground" title={sub1Value}>
                    {sub1Value || <span className="text-muted-foreground">-</span>}
                  </div>
                </div>
                <div className="rounded border border-border/60 bg-background/40 p-2">
                  <div className="text-[9px] uppercase text-muted-foreground font-semibold">sub2 · influencer</div>
                  <div className="font-mono text-[10px] mt-0.5 truncate" title={sub2Value}>
                    {sub2Value ? <span className="text-foreground">{sub2Value.slice(0, 8)}…</span> : <span className="text-muted-foreground">-</span>}
                  </div>
                </div>
                <div className="rounded border border-border/60 bg-background/40 p-2">
                  <div className="text-[9px] uppercase text-muted-foreground font-semibold">sub3 · campanha</div>
                  <div className="font-mono text-[10px] mt-0.5 truncate" title={sub3Value}>
                    {sub3Value ? <span className="text-foreground">{sub3Value.slice(0, 8)}…</span> : <span className="text-muted-foreground">-</span>}
                  </div>
                </div>
              </div>

              {trackedAffiliateUrl && form.base_url && (
                <div className="flex items-start gap-1.5 text-[10px] pt-1 border-t border-border/40">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5 shrink-0">CTA →</span>
                  <code className="font-mono break-all text-muted-foreground">{trackedAffiliateUrl}</code>
                </div>
              )}
            </div>
          )}

          {/* Share link - LP URL (Com LP) or affiliate URL direto (Sem LP) */}
          {finalUrl && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-500">
                  Link para divulgar {useLp ? "(passa pela landing page)" : "(direto para o afiliado)"}
                </span>
              </div>
              <code className="block font-mono text-xs break-all text-foreground">{finalUrl}</code>
              <p className="text-[9px] text-muted-foreground">
                {useLp
                  ? <>Visitante → LP → clica no CTA → redireciona para o afiliado com <code>{form.click_id_param_name}</code> de atribuição.</>
                  : <>Visitante vai direto para o afiliado, já com <code>{form.click_id_param_name}</code> de atribuição.</>}
              </p>
            </div>
          )}

          {/* 5. Campaign (optional) + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Step n={5} label="Campanha (opcional)" />
              <Select value={form.campanha_id} onValueChange={v => set("campanha_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  {(campanhas as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Step n={6} label="Papel" />
              <Select value={form.tracking_role} onValueChange={v => set("tracking_role", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRACKING_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} disabled={!canSave} className="w-full h-10">
            {form.id ? "Salvar alterações" : "Criar link"}
            <ArrowRight size={14} className="ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
