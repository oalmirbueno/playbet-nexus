import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInfluencers, useLandingPages, usePlatforms, useCampanhas } from "@/hooks/useSupabaseQuery";
import { usePlatformAccounts, useTrackingLinks } from "@/hooks/useTrackingData";
import { toast } from "@/hooks/use-toast";
import { Link2, CheckCircle2, Plus, Sparkles, Copy } from "lucide-react";
import { detectPlatformByUrl, appendSubId } from "@/lib/platformDetect";

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
  const { create: createLink } = useTrackingLinks();

  const [influencerId, setInfluencerId] = useState(defaultInfluencerId);
  const [landingPageId, setLandingPageId] = useState(defaultLandingPageId);
  const [accountId, setAccountId] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [rawLink, setRawLink] = useState("");
  const [subid, setSubid] = useState("");
  const [campanhaId, setCampanhaId] = useState("");
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
      setCampanhaId("");
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

  // 🧠 Universal platform auto-detection from pasted URL
  const detectedPlatform = useMemo(() => {
    if (!rawLink) return null;
    return detectPlatformByUrl(rawLink, platforms as any[]);
  }, [rawLink, platforms]);

  // Sync detected platform → platformId, then auto-pick first matching account
  useEffect(() => {
    if (detectedPlatform) {
      setPlatformId(detectedPlatform.id);
      const match = accounts.find((a: any) => a.platform_id === detectedPlatform.id);
      if (match) setAccountId(match.id);
    }
  }, [detectedPlatform]); // eslint-disable-line react-hooks/exhaustive-deps

  const platformAccounts = useMemo(
    () => platformId ? accounts.filter((a: any) => a.platform_id === platformId) : accounts,
    [accounts, platformId],
  );

  const selectedAccount = useMemo(() => accounts.find((a: any) => a.id === accountId), [accounts, accountId]);
  const finalUrl = useMemo(() => appendSubId(rawLink, "sub1", subid), [rawLink, subid]);

  const trackingCode = useMemo(() => subid || `link-${Date.now().toString(36)}`, [subid]);

  const canSave = influencerId && rawLink.trim() && (accountId || detectedPlatform);

  const handleSave = async () => {
    if (!canSave) {
      toast({ title: "Faltam dados", description: "Influencer e link são obrigatórios.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      let finalAccountId = accountId;

      // If user pasted a link from a detected platform but has no account, create one on-the-fly
      if (!finalAccountId && detectedPlatform) {
        const created: any = await createAccount({
          platform_id: detectedPlatform.id,
          nome_conta: `${detectedPlatform.name} · Principal`,
          is_demo: false,
        } as any);
        finalAccountId = created?.id;
      }

      await createLink({
        influencer_id: influencerId,
        platform_account_id: finalAccountId,
        landing_page_id: landingPageId || null,
        campanha_id: campanhaId || null,
        base_url: rawLink.trim(),
        final_url: finalUrl,
        tracking_code: trackingCode,
        click_id_param_name: "sub1",
        status: "active",
      } as any);

      // Copy to clipboard
      try { await navigator.clipboard.writeText(finalUrl); } catch {}

      toast({ title: "Link cadastrado", description: "Link copiado. Postback ativo." });
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 size={16} className="text-primary" /> Novo Link de Afiliado</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
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
            </div>

            {/* 3. RAW LINK + auto detect */}
            <div>
              <Label className="text-xs font-medium">3. Cole o link de afiliado *</Label>
              <Input
                className="h-9 text-xs font-mono mt-1"
                value={rawLink}
                onChange={(e) => setRawLink(e.target.value)}
                placeholder="https://qualquer-casa.com/?p=xxxx"
              />
              {rawLink && (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  {detectedPlatform ? (
                    <span className="text-[10px] flex items-center gap-1 text-emerald-500"><Sparkles size={10} /> Detectado: <strong className="text-foreground">{detectedPlatform.name}</strong></span>
                  ) : (
                    <span className="text-[10px] text-amber-500">Plataforma não reconhecida — selecione ou cadastre.</span>
                  )}
                  <button onClick={() => setNewPlatform({ ...newPlatform, open: true })} className="text-[10px] text-primary hover:underline flex items-center gap-1"><Plus size={10} /> Nova plataforma</button>
                </div>
              )}
            </div>

            {/* 4. PLATFORM (auto-detected) + ACCOUNT */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-medium">4. Plataforma</Label>
                  <div className="flex items-center gap-2">
                    {detectedPlatform && <span className="text-[9px] text-emerald-500 flex items-center gap-0.5"><Sparkles size={9} /> auto</span>}
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

            {/* 5. SUBID */}
            <div>
              <Label className="text-xs font-medium">5. SubID único (auto)</Label>
              <Input
                className="h-9 text-xs font-mono mt-1"
                value={subid}
                onChange={(e) => setSubid(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                placeholder="influencer-xxxxx"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Gerado automaticamente por link · anexado como <code>?sub1=</code>.</p>
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
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-primary/15">
                  <div>
                    <p className="text-[9px] font-semibold text-primary uppercase tracking-wider">SubID</p>
                    <code className="block text-[10px] font-mono text-foreground break-all">{subid || "—"}</code>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-primary uppercase tracking-wider">Tracking code</p>
                    <code className="block text-[10px] font-mono text-foreground break-all">{trackingCode}</code>
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
            )}
          </div>

          <DialogFooter>
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
