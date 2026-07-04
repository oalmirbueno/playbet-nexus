import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInfluencers, useLandingPages, useLandingPageInstances, usePlatforms, useCampanhas } from "@/hooks/useSupabaseQuery";
import { usePlatformAccounts, useTrackingLinks } from "@/hooks/useTrackingData";
import { landingPageInstanceService } from "@/services/supabaseService";
import { toast } from "@/hooks/use-toast";
import { Link2, CheckCircle2, Plus, Sparkles, Copy, Flame, Wand2, RefreshCw, Loader2, Sigma } from "lucide-react";
import { buildPublicLpUrl, buildTrackedAffiliateUrl } from "@/lib/trackingUrl";
import { detectFromUrl, CATEGORY_LABELS, extractOddsDraftFromInput, inferAttributionParam, splitAffiliateAndOddsUrls, type LinkCategory } from "@/lib/linkIntelligence";
import GameArtwork from "@/components/tracking/GameArtwork";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncLinkAssets } from "@/lib/linkAssets";
import OddsSharePanel, { emptyOddsValue, type OddsPanelValue } from "@/components/tracking/OddsSharePanel";
import { upsertOdds } from "@/services/trackingLinkOddsService";

const LINK_CONTEXT_GAME = "game";
const LINK_CONTEXT_NO_GAME = "no_game";
const LINK_CONTEXT_ODDS = "odds";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultInfluencerId?: string;
  defaultLandingPageId?: string;
}

/**
 * Esteira universal de criação de link de afiliado.
 * Fluxo: Influencer → LP (opcional) → cola URL → plataforma é detectada → SubID → salvar.
 * Cada campo permite criar inline se o item não existir.
 * Funciona com qualquer casa de apostas (1win, SuperBet, PlayBet, etc.).
 */
export default function QuickLinkDialog({ open, onOpenChange, defaultInfluencerId = "", defaultLandingPageId = "" }: Props) {
  const { data: influencers, create: createInfluencer } = useInfluencers();
  const { data: landingPages, create: createLP } = useLandingPages();
  const { data: platforms, create: createPlatform } = usePlatforms();
  const { data: accounts, create: createAccount } = usePlatformAccounts();
  const { data: campanhas } = useCampanhas();
  const { data: lpInstances } = useLandingPageInstances();
  const { create: createLink } = useTrackingLinks();

  const [influencerId, setInfluencerId] = useState(defaultInfluencerId);
  const [landingPageId, setLandingPageId] = useState(defaultLandingPageId);
  const [accountId, setAccountId] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [rawLink, setRawLink] = useState("");
  const [subid, setSubid] = useState("");
  const [clickIdParam, setClickIdParam] = useState("sub1");
  const [gameSlug, setGameSlug] = useState("");
  const [gameName, setGameName] = useState("");
  const [gameIconUrl, setGameIconUrl] = useState("");
  const [linkContext, setLinkContext] = useState<typeof LINK_CONTEXT_GAME | typeof LINK_CONTEXT_NO_GAME | typeof LINK_CONTEXT_ODDS>(LINK_CONTEXT_NO_GAME);
  const [linkCategory, setLinkCategory] = useState("");
  const [hypeReason, setHypeReason] = useState("");
  const [campanhaId, setCampanhaId] = useState("");
  const [extraGameSlugs, setExtraGameSlugs] = useState<string[]>([]);
  const [odds, setOdds] = useState<OddsPanelValue>(emptyOddsValue);
  // Marca que o operador escolheu manualmente o contexto — a detecção automática
  // não deve mais sobrescrever a escolha (evita "misturar" odds com jogos).
  const [contextTouched, setContextTouched] = useState(false);
  // Modo de LP escolhido pelo operador. 'generated' = LP gerada pelo link (pull automático
  // de bilhete/jogo/marca). 'catalog' = LP padrão da casa. 'none' = link direto sem LP.
  const [lpGeneration, setLpGeneration] = useState<"none" | "catalog" | "generated">("generated");
  const [saving, setSaving] = useState(false);


  // Inline-create modal states
  const [newInfluencer, setNewInfluencer] = useState({ open: false, name: "", slug: "" });
  const [newLP, setNewLP] = useState({ open: false, name: "", base_url: "" });
  const [newPlatform, setNewPlatform] = useState({ open: false, name: "", domain: "" });

  useEffect(() => {
    if (open) {
      setInfluencerId(defaultInfluencerId);
      setLandingPageId(defaultLandingPageId);
      setAccountId("");
      setPlatformId("");
      setRawLink("");
      setSubid("");
      setClickIdParam("sub1");
      setGameSlug("");
      setGameName("");
      setGameIconUrl("");
      setLinkContext(LINK_CONTEXT_NO_GAME);
      setLinkCategory("");
      setHypeReason("");
      setCampanhaId("");
      setExtraGameSlugs([]);
      setOdds(emptyOddsValue);
      setContextTouched(false);
      setLpGeneration("generated");
    }
  }, [open, defaultInfluencerId, defaultLandingPageId]);


  const selectedInfluencer = useMemo(
    () => influencers.find((i: any) => i.id === influencerId),
    [influencers, influencerId],
  );

  // Auto-generate a UNIQUE subid per link: <influencer-slug>-<base36-timestamp>
  // Editable, but regenerated whenever the influencer changes or the dialog reopens.
  useEffect(() => {
    if (!open) return;
    const base = (selectedInfluencer as any)?.slug || "link";
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setSubid(`${base}-${unique}`);
  }, [selectedInfluencer, open]);

  // 🧠 Universal platform + game auto-detection from pasted URL
  const detection = useMemo(() => detectFromUrl(rawLink, platforms as any[]), [rawLink, platforms]);
  const detectedPlatformId = detection.platformCandidates[0]?.platformId ?? "";
  const detectedPlatform = useMemo(
    () => detectedPlatformId ? (platforms as any[]).find((p: any) => p.id === detectedPlatformId) : null,
    [detectedPlatformId, platforms],
  );

  // Sync detected platform → platformId, then auto-pick first matching account
  useEffect(() => {
    if (detectedPlatform?.id) {
      setPlatformId(detectedPlatform.id);
      const match = accounts.find((a: any) => a.platform_id === detectedPlatform.id && a.is_active !== false);
      if (match) setAccountId(match.id);
    }
  }, [detectedPlatform?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const platformAccounts = useMemo(
    () => platformId ? accounts.filter((a: any) => a.platform_id === platformId) : accounts,
    [accounts, platformId],
  );

  const selectedAccount = useMemo(() => accounts.find((a: any) => a.id === accountId), [accounts, accountId]);
  const currentPlatformId = selectedAccount?.platform_id || platformId || detectedPlatform?.id || "";
  const currentPlatform = useMemo(
    () => currentPlatformId ? (platforms as any[]).find((p: any) => p.id === currentPlatformId) : null,
    [platforms, currentPlatformId],
  );
  const selectedLP = useMemo(() => (landingPages as any[]).find((l: any) => l.id === landingPageId), [landingPages, landingPageId]);

  useEffect(() => {
    if (!rawLink) return;
    setClickIdParam(inferAttributionParam(rawLink, currentPlatform?.name || detectedPlatform?.name));
  }, [rawLink, currentPlatform?.name, detectedPlatform?.name]);

  const handleRawLink = (value: string) => {
    const split = splitAffiliateAndOddsUrls(value);
    const draft = extractOddsDraftFromInput(value);
    setRawLink(split.affiliateUrl || value);
    // Só auto-migra para Odds se o operador ainda não fixou um contexto.
    // Uma vez que ele clicou em "Sem jogo" ou "Jogos/cassino", respeitamos a escolha.
    if (draft.isSharedOdds && !contextTouched) {
      setLinkContext(LINK_CONTEXT_ODDS);
      setLinkCategory("odds_share");
      setGameSlug("");
      setGameName("");
      setGameIconUrl("");
      setExtraGameSlugs([]);
      setOdds(prev => ({
        ...prev,
        bookmaker_share_url: draft.bookmaker_share_url || prev.bookmaker_share_url,
        total_odd: draft.total_odd ?? prev.total_odd,
        event_label: draft.event_label || prev.event_label,
      }));
    } else if (draft.isSharedOdds && linkContext === LINK_CONTEXT_ODDS) {
      // Já está em odds → só enriquece o bilhete com dados detectados.
      setOdds(prev => ({
        ...prev,
        bookmaker_share_url: draft.bookmaker_share_url || prev.bookmaker_share_url,
        total_odd: draft.total_odd ?? prev.total_odd,
        event_label: draft.event_label || prev.event_label,
      }));
    }
  };

  useEffect(() => {
    // Detecção não pode sobrescrever contexto manual.
    if (contextTouched) {
      if (linkContext === LINK_CONTEXT_GAME) {
        if (detection.category && detection.category !== "odds_share") setLinkCategory(detection.category);
        if (detection.gameSlug) setGameSlug(detection.gameSlug);
        if (detection.gameName) setGameName(detection.gameName);
      }
      return;
    }
    if (detection.isSharedOdds || detection.category === "odds_share") {
      setLinkContext(LINK_CONTEXT_ODDS);
      setLinkCategory("odds_share");
      setGameSlug("");
      setGameName("");
      setGameIconUrl("");
      return;
    }
    if (linkContext === LINK_CONTEXT_GAME) {
      if (detection.category) setLinkCategory(detection.category);
      if (detection.gameSlug) setGameSlug(detection.gameSlug);
      if (detection.gameName) setGameName(detection.gameName);
    }
  }, [detection.category, detection.gameSlug, detection.gameName, detection.isSharedOdds, linkContext, contextTouched]);

  // Handler único: garante reset do outro contexto ao trocar, evitando
  // que odds "vazem" para jogos ou vice-versa.
  const chooseContext = (ctx: typeof LINK_CONTEXT_GAME | typeof LINK_CONTEXT_NO_GAME | typeof LINK_CONTEXT_ODDS) => {
    setContextTouched(true);
    setLinkContext(ctx);
    if (ctx === LINK_CONTEXT_NO_GAME) {
      setGameSlug(""); setGameName(""); setGameIconUrl("");
      setExtraGameSlugs([]); setHypeReason(""); setLinkCategory("");
      setOdds(emptyOddsValue);
    } else if (ctx === LINK_CONTEXT_ODDS) {
      setGameSlug(""); setGameName(""); setGameIconUrl("");
      setExtraGameSlugs([]); setHypeReason("");
      setLinkCategory("odds_share");
    } else {
      // GAME → limpa bilhete, mantém jogo detectado.
      setOdds(emptyOddsValue);
      if (linkCategory === "odds_share") setLinkCategory("slots");
    }
  };


  const qc = useQueryClient();
  const [refreshingHype, setRefreshingHype] = useState(false);

  const { data: hypedGames = [] } = useQuery({
    queryKey: ["quick_platform_hyped_games", currentPlatformId],
    enabled: !!currentPlatformId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_hyped_games")
        .select("id, game_name, game_slug, icon_url, category, priority, hype_reason")
        .eq("platform_id", currentPlatformId)
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
      await qc.invalidateQueries({ queryKey: ["quick_platform_hyped_games", currentPlatformId] });
      toast({ title: "Jogos atualizados", description: "Top jogos e logos recarregados." });
    } catch (e: any) {
      toast({ title: "Falha ao atualizar", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setRefreshingHype(false);
    }
  };

  const applyHypedGame = (g: any) => {
    setLinkContext(LINK_CONTEXT_GAME);
    setGameSlug(g.game_slug || "");
    setGameName(g.game_name || "");
    setGameIconUrl(g.icon_url || "");
    setLinkCategory(g.category || (linkCategory === "odds_share" ? "slots" : linkCategory));
    setHypeReason(g.hype_reason || hypeReason);
  };

  const trackingCode = useMemo(() => subid || `link-${Date.now().toString(36)}`, [subid]);

  const trackedAffiliateUrl = useMemo(
    () => buildTrackedAffiliateUrl(rawLink, clickIdParam, trackingCode, influencerId || "", campanhaId || ""),
    [rawLink, clickIdParam, trackingCode, influencerId, campanhaId],
  );

  // Resolve / preview the LP instance for (influencer × LP × affiliate_link).
  // Each distinct affiliate URL gets its OWN instance so the LP CTA points to
  // the right house - never overwrite a sibling instance's affiliate_link.
  const resolvedInstance = useMemo(() => {
    if (!landingPageId || !influencerId) return null;
    const raw = trackedAffiliateUrl.trim();
    if (!raw) return null;
    return (
      lpInstances.find(
        (i: any) =>
          i.landing_page_id === landingPageId &&
          i.influencer_id === influencerId &&
          (i.affiliate_link || "").trim() === raw,
      ) || null
    );
  }, [lpInstances, landingPageId, influencerId, trackedAffiliateUrl]);

  const plannedInstanceSlug = useMemo(() => {
    if (!landingPageId || !influencerId) return "";
    if (resolvedInstance?.slug) return resolvedInstance.slug;
    const baseSlug = ((selectedInfluencer as any)?.slug || (selectedInfluencer as any)?.name || "ref")
      .toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-|-$/g, "") || "ref";
    const taken = new Set(
      lpInstances.filter((i: any) => i.landing_page_id === landingPageId).map((i: any) => i.slug),
    );
    let slug = baseSlug;
    let n = 2;
    while (taken.has(slug)) { slug = `${baseSlug}-${n++}`; }
    return slug;
  }, [landingPageId, influencerId, resolvedInstance, selectedInfluencer, lpInstances]);

  // The link the influencer shares:
  //  · With LP → public LP URL (visitors hit the LP, click CTA, then get the affiliate)
  //  · Without LP → affiliate URL directly with sub1/sub2/sub3
  const finalUrl = useMemo(() => {
    if (landingPageId) {
      const slug = plannedInstanceSlug || (selectedInfluencer as any)?.slug || "";
      const lp = buildPublicLpUrl(selectedLP?.domain, slug, influencerId || "", campanhaId || "", selectedLP?.route, trackingCode);
      if (lp) return lp;
    }
    return trackedAffiliateUrl;
  }, [landingPageId, resolvedInstance, selectedLP, plannedInstanceSlug, selectedInfluencer, influencerId, campanhaId, trackedAffiliateUrl, trackingCode]);

  const canSave = influencerId && rawLink.trim() && (accountId || currentPlatformId);


  const handleSave = async () => {
    if (!canSave) {
      toast({ title: "Faltam dados", description: "Influencer e link são obrigatórios.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      let finalAccountId = accountId;

      if (!finalAccountId && currentPlatformId) {
        const created: any = await createAccount({
          platform_id: currentPlatformId,
          nome_conta: `${currentPlatform?.name || detectedPlatform?.name || "Plataforma"} · Principal`,
          is_demo: false,
        } as any);
        finalAccountId = created?.id;
      }

      // ── Resolve or create the LP instance so the link routes through the LP ──
      let instanceId: string | null = resolvedInstance?.id || null;
      // Se o operador escolheu "LP gerada"/"LP padrão" mas não apontou uma LP,
      // usamos como matriz a primeira LP ativa disponível. A LP-instance vai
      // ser especializada por link via lp-autoconfigure (modo odds/game).
      let effectiveLandingPageId = landingPageId;
      if (!effectiveLandingPageId && lpGeneration !== "none") {
        const fallbackLp = (landingPages as any[]).find((l: any) => l.is_active !== false) || (landingPages as any[])[0];
        if (fallbackLp?.id) {
          effectiveLandingPageId = fallbackLp.id;
        }
      }
      if (effectiveLandingPageId && !instanceId) {
        const slug = plannedInstanceSlug || `${(selectedInfluencer as any)?.slug || "ref"}-${trackingCode}`;
        try {
          const created: any = await landingPageInstanceService.create({
            landing_page_id: effectiveLandingPageId,
            influencer_id: influencerId,
            slug,
            affiliate_link: trackedAffiliateUrl,
            is_active: true,
          } as any);
          instanceId = created?.id || null;
        } catch (e: any) {
          toast({ title: "Erro ao vincular LP", description: e?.message || "Tente novamente.", variant: "destructive" });
          return;
        }
      }
      // NOTE: never mutate an existing instance's affiliate_link here - sibling
      // tracking links may share the same (influencer × LP) but point to a
      // different house. Distinct affiliate URLs always get distinct instances.


      const useLp = !!effectiveLandingPageId && lpGeneration !== "none";


      const createdLink: any = await createLink({
        influencer_id: influencerId,
        platform_account_id: finalAccountId,
        landing_page_id: effectiveLandingPageId || null,
        landing_page_instance_id: instanceId,
        campanha_id: campanhaId || null,
        base_url: rawLink.trim(),
        final_url: finalUrl,
        tracking_code: trackingCode,
        click_id_param_name: clickIdParam,
        use_lp: useLp,
        game_slug: linkContext === LINK_CONTEXT_GAME ? gameSlug || null : null,
        game_name: linkContext === LINK_CONTEXT_GAME ? gameName || null : null,
        game_icon_url: linkContext === LINK_CONTEXT_GAME ? gameIconUrl || null : null,
        link_category: linkContext === LINK_CONTEXT_ODDS ? "odds_share" : linkContext === LINK_CONTEXT_GAME ? linkCategory || null : null,
        hype_reason: hypeReason || null,
        commission_percent: (selectedInfluencer as any)?.commission_percent ?? null,
        status: "active",
      } as any);

      // ── Sync pós-criação ──────────────────────────────────────────────
      // O trigger de DB `trg_tracking_links_autopipeline` já cria os
      // materiais, configura a instância de LP e dispara notificações
      // automaticamente. Aqui apenas:
      //  • fixamos a source_tracking_link_id na instância;
      //  • disparamos `lp-autoconfigure` quando o caller passa
      //    extra_game_slugs / hype_copy que o trigger não cobre;
      //  • invalidamos as queries React Query para refletir o novo estado.
      const linkId = createdLink?.id;
      if (linkId) {
        if (linkContext === LINK_CONTEXT_ODDS) {
          await upsertOdds({
            tracking_link_id: linkId,
            platform_id: currentPlatformId || null,
            bet_type: odds.bet_type,
            total_odd: odds.total_odd,
            stake_suggested: odds.stake_suggested,
            selections: odds.selections ?? [],
            bookmaker_share_url: odds.bookmaker_share_url || null,
            screenshot_url: odds.screenshot_url || null,
            event_label: odds.event_label || null,
            event_starts_at: odds.event_starts_at ? new Date(odds.event_starts_at).toISOString() : null,
            notes: odds.notes || null,
          });
        }
        if (instanceId) {
          await supabase
            .from("landing_page_instances")
            .update({
              source_tracking_link_id: linkId,
              affiliate_link: trackedAffiliateUrl,
            } as any)
            .eq("id", instanceId);
        }

        const needsLpExtras = useLp && linkContext === LINK_CONTEXT_GAME && (extraGameSlugs.length > 0 || !!hypeReason);
        syncLinkAssets(
          linkId,
          {
            useLp: needsLpExtras,
            extraGameSlugs,
            hypeCopy: needsLpExtras ? { subtitle: hypeReason || null } : null,
          },
          qc,
        );
        if (linkContext === LINK_CONTEXT_ODDS) {
          supabase.functions.invoke("materials-autogenerate", { body: { tracking_link_id: linkId } }).catch(() => {});
        }
      }


      let copiedUrl = finalUrl;
      if (createdLink?.id) {
        const { data: syncedLink } = await supabase
          .from("tracking_links")
          .select("final_url")
          .eq("id", createdLink.id)
          .maybeSingle();
        copiedUrl = (syncedLink as any)?.final_url || finalUrl;
      }

      try { await navigator.clipboard.writeText(copiedUrl); } catch {}

      toast({
        title: "Link cadastrado",
        description: useLp
          ? "LP e materiais estão sincronizando em segundo plano."
          : "Link copiado · materiais gerando em segundo plano.",
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Inline creators ────────────────────────────
  const handleCreateInfluencer = async () => {
    if (!newInfluencer.name.trim()) return;
    const slug = newInfluencer.slug || newInfluencer.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const created: any = await createInfluencer({ name: newInfluencer.name.trim(), slug, is_active: true } as any);
    if (created?.id) setInfluencerId(created.id);
    setNewInfluencer({ open: false, name: "", slug: "" });
  };

  const handleCreateLP = async () => {
    if (!newLP.name.trim()) return;
    const slug = newLP.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const created: any = await createLP({ name: newLP.name.trim(), slug, base_url: newLP.base_url || null, is_active: true } as any);
    if (created?.id) setLandingPageId(created.id);
    setNewLP({ open: false, name: "", base_url: "" });
  };

  const handleCreatePlatform = async () => {
    if (!newPlatform.name.trim()) return;
    const slug = newPlatform.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const domains = newPlatform.domain ? [newPlatform.domain.trim().toLowerCase()] : [];
    const created: any = await createPlatform({ name: newPlatform.name.trim(), slug, domains, is_active: true } as any);
    if (created?.id) {
      setPlatformId(created.id);
      const acc: any = await createAccount({ platform_id: created.id, nome_conta: `${newPlatform.name} · Principal`, is_demo: false } as any);
      if (acc?.id) setAccountId(acc.id);
    }
    setNewPlatform({ open: false, name: "", domain: "" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md flex flex-col max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2"><Link2 size={16} className="text-primary" /> Novo Link de Afiliado</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 px-6 overflow-y-auto flex-1 min-h-0">
            {/* 1. INFLUENCER */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-medium">1. Influencer *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() => setNewInfluencer({ ...newInfluencer, open: true })}
                >
                  <Plus size={10} /> Cadastrar novo
                </Button>
              </div>
              <Select value={influencerId} onValueChange={setInfluencerId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione ou cadastre um influencer" /></SelectTrigger>
                <SelectContent>
                  {influencers.map((i: any) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}{i.team_label ? ` · ${i.team_label}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. LANDING PAGE */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-medium">2. Landing Page (opcional)</Label>
                <button onClick={() => setNewLP({ ...newLP, open: true })} className="text-[10px] text-primary hover:underline flex items-center gap-1"><Plus size={10} /> Nova</button>
              </div>
              <Select value={landingPageId || "none"} onValueChange={(v) => setLandingPageId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Sem LP" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem LP (direto)</SelectItem>
                  {landingPages.map((lp: any) => <SelectItem key={lp.id} value={lp.id}>{lp.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {/* LP mode: escolha entre padrão (catalog) x gerada (single_game / odds) x sem LP */}
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {([
                  { v: "generated", label: "LP gerada", hint: "auto por link" },
                  { v: "catalog", label: "LP padrão", hint: "vitrine da casa" },
                  { v: "none", label: "Sem LP", hint: "afiliado direto" },
                ] as const).map(opt => {
                  const active = lpGeneration === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setLpGeneration(opt.v)}
                      className={`h-11 rounded-md border text-[11px] font-medium transition flex flex-col items-center justify-center leading-tight ${
                        active
                          ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                      title={opt.hint}
                    >
                      <span>{opt.label}</span>
                      <span className="text-[9px] opacity-70">{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                {lpGeneration === "generated"
                  ? (linkContext === LINK_CONTEXT_ODDS
                      ? "Vamos gerar uma LP em modo Odds com o bilhete embutido, marca da casa e CTA copy-and-paste."
                      : linkContext === LINK_CONTEXT_GAME
                        ? "LP focada no jogo selecionado, hero co-brand, hype e CTA de conversão."
                        : "LP hero co-brand PlayBet + casa + CTA único, sem jogos.")
                  : lpGeneration === "catalog"
                    ? "Usa a vitrine padrão registrada. O CTA aponta para este link, mas as seções ficam da LP mãe."
                    : "Sem LP: o afiliado abre direto na casa (sem página intermediária)."}
              </p>
            </div>


            {/* 3. RAW LINK + auto detect */}
            <div>
              <Label className="text-xs font-medium">3. Cole o link de afiliado *</Label>
              <Input
                className="h-9 text-xs font-mono mt-1"
                value={rawLink}
                onChange={(e) => handleRawLink(e.target.value)}
                placeholder="Cole link afiliado ou afiliado + bilhete de odds"
              />
              {rawLink && (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  {detectedPlatform || currentPlatform ? (
                    <span className="text-[10px] flex items-center gap-1 text-success"><Sparkles size={10} /> Detectado: <strong className="text-foreground">{detectedPlatform?.name || currentPlatform?.name}</strong></span>
                  ) : (
                    <span className="text-[10px] text-warning">Cole o link e selecione a casa; a inteligência aplica contexto mesmo sem domínio conhecido.</span>
                  )}
                  <button onClick={() => setNewPlatform({ ...newPlatform, open: true })} className="text-[10px] text-primary hover:underline flex items-center gap-1"><Plus size={10} /> Nova plataforma</button>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-medium">Tipo de link *</Label>
                <span className="text-[10px] text-muted-foreground">
                  {linkContext === LINK_CONTEXT_ODDS
                    ? "Painel ativo: bilhete de odds"
                    : linkContext === LINK_CONTEXT_GAME
                      ? "Painel ativo: jogo/cassino"
                      : "Painel ativo: link direto"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => chooseContext(LINK_CONTEXT_NO_GAME)}
                  className={`h-10 rounded-md border text-xs font-medium transition ${linkContext === LINK_CONTEXT_NO_GAME ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
                >
                  Sem jogo
                </button>
                <button
                  type="button"
                  onClick={() => chooseContext(LINK_CONTEXT_ODDS)}
                  className={`h-10 rounded-md border text-xs font-medium transition ${linkContext === LINK_CONTEXT_ODDS ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
                >
                  <Sigma size={12} className="inline mr-1" /> Odds
                </button>
                <button
                  type="button"
                  onClick={() => chooseContext(LINK_CONTEXT_GAME)}
                  className={`h-10 rounded-md border text-xs font-medium transition ${linkContext === LINK_CONTEXT_GAME ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
                >
                  Jogos/cassino
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {linkContext === LINK_CONTEXT_ODDS
                  ? "Salvaremos apenas o bilhete (odd total, seleções, screenshot). Jogo/categoria não são gravados."
                  : linkContext === LINK_CONTEXT_GAME
                    ? "Salvaremos jogo, categoria e hype. Bilhete de odds é ignorado."
                    : "Salvaremos só o link afiliado — sem jogo e sem bilhete."}
              </p>
            </div>


            {/* 4. PLATFORM (auto-detected) + ACCOUNT */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-medium">4. Plataforma</Label>
                  <div className="flex items-center gap-2">
                    {detectedPlatform && <span className="text-[9px] text-success flex items-center gap-0.5"><Sparkles size={9} /> auto</span>}
                    <button
                      type="button"
                      onClick={() => setNewPlatform({ ...newPlatform, open: true })}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={9} /> Nova
                    </button>
                  </div>
                </div>
                <Select value={platformId} onValueChange={(v) => { setPlatformId(v); setAccountId(""); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Casa de aposta" /></SelectTrigger>
                  <SelectContent>
                    {(platforms as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">5. Conta</Label>
                <Select value={accountId} onValueChange={setAccountId} disabled={!platformId && platformAccounts.length === 0}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={platformId ? "Selecione" : "Escolha plataforma"} /></SelectTrigger>
                  <SelectContent>
                    {platformAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.nome_conta}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(rawLink || currentPlatformId) && linkContext === LINK_CONTEXT_ODDS && (
              <OddsSharePanel value={odds} onChange={setOdds} />
            )}

            {(rawLink || currentPlatformId) && linkContext === LINK_CONTEXT_GAME && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                  <Wand2 size={11} className="text-primary" />
                  <span className="uppercase tracking-wider font-semibold text-primary/90">Contexto inteligente</span>
                  {(linkCategory || detection.category) && (
                    <span className="px-1.5 py-0.5 rounded bg-secondary/60 text-foreground text-[9px]">
                      {CATEGORY_LABELS[(linkCategory || detection.category) as LinkCategory] ?? linkCategory}
                    </span>
                  )}
                  {gameName && (
                    <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/25 text-[9px]">
                      {gameName}
                    </span>
                  )}
                </div>

                {(hypedGames.length > 0 || currentPlatformId) && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Flame size={11} className="text-warning" />
                      <span className="font-semibold text-warning uppercase tracking-wider">Jogos em alta</span>
                      {hypedGames.length > 0 && <span className="text-muted-foreground">· {hypedGames.length}</span>}
                      <button
                        type="button"
                        onClick={refreshHypedGames}
                        disabled={refreshingHype || !currentPlatformId}
                        className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/60 bg-background/50 hover:bg-secondary text-[9px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                        title="Buscar novos jogos e logos reais da casa"
                      >
                        {refreshingHype ? <Loader2 size={9} className="animate-spin" /> : <RefreshCw size={9} />}
                        {refreshingHype ? "Atualizando" : "Atualizar"}
                      </button>
                    </div>
                    {hypedGames.length > 0 ? (
                      <div className="invisible-scroll flex gap-1.5 overflow-x-auto snap-x pb-1 -mx-0.5 px-0.5">
                        {hypedGames.map((g: any) => {
                          const selected = gameSlug === g.game_slug;
                          const inExtras = extraGameSlugs.includes(g.game_slug);
                          return (
                            <div
                              key={g.id}
                              className={`snap-start shrink-0 w-[72px] rounded-md border p-1.5 text-center transition relative ${selected ? "border-warning/60 bg-warning/10" : inExtras ? "border-primary/60 bg-primary/10" : "border-border/50 bg-background/50 hover:border-warning/40"}`}
                            >
                              <button
                                type="button"
                                onClick={() => applyHypedGame(g)}
                                className="w-full text-center"
                                title={g.hype_reason || g.game_name}
                              >
                                <div className="flex justify-center mb-1 relative">
                                  <GameArtwork slug={g.game_slug} name={g.game_name} iconUrl={g.icon_url} size="md" />
                                  <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-warning text-warning-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                    {g.priority}
                                  </span>
                                </div>
                                <span className="block text-[9px] font-medium leading-tight truncate">{g.game_name}</span>
                              </button>
                              {landingPageId && !selected && (
                                <button
                                  type="button"
                                  onClick={() => setExtraGameSlugs((prev) => inExtras ? prev.filter((s) => s !== g.game_slug) : [...prev, g.game_slug])}
                                  className={`absolute -bottom-1 -right-1 text-[8px] font-bold rounded px-1 border ${inExtras ? "bg-primary text-primary-foreground border-primary" : "bg-background/80 text-primary border-primary/40"}`}
                                  title={inExtras ? "Remover da LP" : "Adicionar à LP"}
                                >
                                  {inExtras ? "✓ LP" : "+ LP"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">Nenhum jogo em alta cadastrado para esta casa. Clique em Atualizar.</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Tipo</Label>
                    <Select value={linkCategory || "none"} onValueChange={(v) => setLinkCategory(v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Auto</SelectItem>
                        {(Object.keys(CATEGORY_LABELS) as LinkCategory[]).map(k => <SelectItem key={k} value={k}>{CATEGORY_LABELS[k]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Jogo / estratégia</Label>
                    <Input
                      className="h-8 text-xs"
                      value={gameName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setGameName(name);
                        setGameSlug(name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
                      }}
                      placeholder="Fortune Tiger, Aviator…"
                    />
                  </div>
                </div>
                <Input className="h-8 text-xs" value={hypeReason} onChange={(e) => setHypeReason(e.target.value)} placeholder="Motivo do hype para influenciador/gerente" />
              </div>
            )}

            {/* 5. SUBID */}
            <div>
              <Label className="text-xs font-medium">5. Atribuição única por link</Label>
              <div className="grid grid-cols-[110px_1fr] gap-2 mt-1">
                <Select value={clickIdParam} onValueChange={setClickIdParam}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="afp">AFP</SelectItem>
                    <SelectItem value="sub1">sub1</SelectItem>
                    <SelectItem value="click_id">click_id</SelectItem>
                    <SelectItem value="clickid">clickid</SelectItem>
                    <SelectItem value="aff_sub">aff_sub</SelectItem>
                    <SelectItem value="s1">s1</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="h-9 text-xs font-mono"
                  value={subid}
                  onChange={(e) => setSubid(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                  placeholder="influencer-xxxxx"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Gerado automaticamente por link · permite repetir influencer, LP e conta sem bloquear.</p>
            </div>

            {/* 6. CAMPANHA opcional */}
            <div>
              <Label className="text-xs font-medium">6. Campanha (opcional)</Label>
              <Select value={campanhaId || "none"} onValueChange={(v) => setCampanhaId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Sem campanha" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem campanha</SelectItem>
                  {campanhas.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* PREVIEW */}
            {canSave && (
              <div className="space-y-2 bg-primary/10 border border-primary/20 rounded-md px-3 py-2.5">
                <div className="grid grid-cols-3 gap-2 pb-2 border-b border-primary/15">
                  <div>
                    <p className="text-[9px] font-semibold text-primary uppercase tracking-wider">SubID</p>
                    <code className="block text-[10px] font-mono text-foreground break-all">{subid || "-"}</code>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-primary uppercase tracking-wider">Parâmetro</p>
                    <code className="block text-[10px] font-mono text-foreground break-all">{clickIdParam}</code>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-primary uppercase tracking-wider">Contexto</p>
                    <code className="block text-[10px] font-mono text-foreground truncate">{linkContext === LINK_CONTEXT_ODDS ? (odds.event_label || "odds") : gameName || CATEGORY_LABELS[linkCategory as LinkCategory] || "auto"}</code>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="text-primary mt-0.5 shrink-0" />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-[9px] font-semibold text-primary uppercase tracking-wider">Link final</p>
                    <code className="block text-[10px] font-mono text-foreground break-all">{finalUrl}</code>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(finalUrl)} className="text-primary hover:text-primary/80 shrink-0" title="Copiar"><Copy size={11} /></button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 pb-6 pt-3 border-t shrink-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!canSave || saving}>{saving ? "Salvando…" : "Salvar e copiar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Inline: Novo Influencer ── */}
      <Dialog open={newInfluencer.open} onOpenChange={(v) => setNewInfluencer({ ...newInfluencer, open: v })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Influencer</DialogTitle></DialogHeader>
          <div className="space-y-2.5 py-2">
            <div><Label className="text-xs">Nome *</Label><Input className="h-9 text-xs mt-1" value={newInfluencer.name} onChange={(e) => setNewInfluencer({ ...newInfluencer, name: e.target.value })} /></div>
            <div><Label className="text-xs">Slug (opcional, gera do nome)</Label><Input className="h-9 text-xs mt-1 font-mono" value={newInfluencer.slug} onChange={(e) => setNewInfluencer({ ...newInfluencer, slug: e.target.value.replace(/[^a-z0-9-]/g, "") })} /></div>
          </div>
          <DialogFooter><Button onClick={handleCreateInfluencer}>Criar e selecionar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Inline: Nova LP ── */}
      <Dialog open={newLP.open} onOpenChange={(v) => setNewLP({ ...newLP, open: v })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Landing Page</DialogTitle></DialogHeader>
          <div className="space-y-2.5 py-2">
            <div><Label className="text-xs">Nome *</Label><Input className="h-9 text-xs mt-1" value={newLP.name} onChange={(e) => setNewLP({ ...newLP, name: e.target.value })} /></div>
            <div><Label className="text-xs">URL base (opcional)</Label><Input className="h-9 text-xs mt-1 font-mono" value={newLP.base_url} onChange={(e) => setNewLP({ ...newLP, base_url: e.target.value })} placeholder="https://..." /></div>
          </div>
          <DialogFooter><Button onClick={handleCreateLP}>Criar e selecionar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Inline: Nova Plataforma ── */}
      <Dialog open={newPlatform.open} onOpenChange={(v) => setNewPlatform({ ...newPlatform, open: v })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Plataforma</DialogTitle></DialogHeader>
          <div className="space-y-2.5 py-2">
            <div><Label className="text-xs">Nome *</Label><Input className="h-9 text-xs mt-1" value={newPlatform.name} onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })} placeholder="SuperBet" /></div>
            <div><Label className="text-xs">Domínio (para auto-detecção)</Label><Input className="h-9 text-xs mt-1 font-mono" value={newPlatform.domain} onChange={(e) => setNewPlatform({ ...newPlatform, domain: e.target.value })} placeholder="superbet.com" /></div>
          </div>
          <DialogFooter><Button onClick={handleCreatePlatform}>Criar e selecionar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
