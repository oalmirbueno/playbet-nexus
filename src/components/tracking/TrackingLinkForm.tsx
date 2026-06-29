import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, ArrowRight, Loader2, Plus } from "lucide-react";
import type { TrackingLinkRow } from "@/services/trackingService";
import { landingPageInstanceService } from "@/services/supabaseService";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
};

export function formFromRow(l: TrackingLinkRow): FormState {
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
  };
}

const TRACKING_ROLES = [
  { value: "influencer", label: "Influencer" },
  { value: "socio", label: "Sócio(a)" },
  { value: "parceiro", label: "Parceiro" },
  { value: "interno", label: "Interno / Teste" },
];

/**
 * Universal sub-id appender — works on any house (EstrelaBet AFP, Vooopi AFP,
 * 1win sub1/2/3, Betano clickid, etc).
 *
 * Standard:
 *   sub1 = click_id    → atribuição de receita (AFP em casas BR)
 *   sub2 = influencer  → quem trouxe o jogador
 *   sub3 = campanha    → criativo / campanha de origem
 *
 * The postback edge function (`tracking-postback`) reads exactly these 3
 * fields and closes the loop click → FTD → revenue → comissão.
 */
function appendParam(url: string, name: string, value: string): string {
  if (!url || !value) return url;
  try {
    const u = new URL(url);
    u.searchParams.set(name, value);
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}${name}=${encodeURIComponent(value)}`;
  }
}

export function buildTrackedUrl(
  baseUrl: string,
  paramName: string,
  sub1: string,
  sub2: string,
  sub3: string,
): string {
  let out = baseUrl;
  if (sub1) out = appendParam(out, paramName, sub1);
  if (sub2) out = appendParam(out, "sub2", sub2);
  if (sub3) out = appendParam(out, "sub3", sub3);
  return out;
}

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

  useEffect(() => { setForm(initialEditing); }, [initialEditing]);

  const set = (field: keyof FormState, value: string) => setForm(p => ({ ...p, [field]: value }));

  const qc = useQueryClient();
  const [creatingInstance, setCreatingInstance] = useState(false);

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

  // LPs the influencer doesn't have yet — offered as "create new for"
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
    if (!selectedLP?.domain || !selectedInstance?.slug) return "";
    const base = selectedLP.domain.replace(/\/+$/, "");
    const slugPath = `/${selectedInstance.slug}`;
    let url = `${base}${slugPath}`;
    if (sub2Value) url = appendParam(url, "sub2", sub2Value);
    if (sub3Value) url = appendParam(url, "sub3", sub3Value);
    return url;
  }, [selectedLP, selectedInstance, sub2Value, sub3Value]);

  // The deep affiliate URL with attribution params — used by the LP CTA, not shared directly.
  const trackedAffiliateUrl = useMemo(
    () => buildTrackedUrl(form.base_url, form.click_id_param_name, sub1Value, sub2Value, sub3Value),
    [form.base_url, form.click_id_param_name, sub1Value, sub2Value, sub3Value],
  );

  const finalUrl = publicLpUrl || trackedAffiliateUrl; // saved as tracking_link.final_url

  const canSave = form.influencer_id && form.landing_page_instance_id && form.platform_account_id && form.base_url;

  const handleSave = async () => {
    // Persist the affiliate URL on the LP instance so the LP CTA can use it.
    if (selectedInstance && form.base_url && selectedInstance.affiliate_link !== form.base_url) {
      try {
        await landingPageInstanceService.update(selectedInstance.id, { affiliate_link: form.base_url });
        await qc.invalidateQueries({ queryKey: ["landing_page_instances"] });
      } catch (e: any) {
        toast({ title: "Erro ao salvar link no botão da LP", description: e.message, variant: "destructive" });
        return;
      }
    }
    onSave({ ...form, final_url: finalUrl });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{form.id ? "Editar link" : "Novo link"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
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

          {/* 2. Landing page (pick the LP; instance + affiliate link auto-resolve) */}
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
              <div className="flex items-center gap-2 text-[10px] text-foreground px-2 py-1.5 rounded bg-primary/5 border border-primary/15">
                <CheckCircle2 size={11} className="text-primary shrink-0" />
                <span className="text-muted-foreground">CTA da LP:</span>
                <code className="font-mono truncate" title={selectedInstance.affiliate_link}>
                  {selectedInstance.affiliate_link || <em className="not-italic text-muted-foreground">vazio — preencha abaixo</em>}
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
                    {sub1Value || <span className="text-muted-foreground">—</span>}
                  </div>
                </div>
                <div className="rounded border border-border/60 bg-background/40 p-2">
                  <div className="text-[9px] uppercase text-muted-foreground font-semibold">sub2 · influencer</div>
                  <div className="font-mono text-[10px] mt-0.5 truncate" title={sub2Value}>
                    {sub2Value ? <span className="text-foreground">{sub2Value.slice(0, 8)}…</span> : <span className="text-muted-foreground">—</span>}
                  </div>
                </div>
                <div className="rounded border border-border/60 bg-background/40 p-2">
                  <div className="text-[9px] uppercase text-muted-foreground font-semibold">sub3 · campanha</div>
                  <div className="font-mono text-[10px] mt-0.5 truncate" title={sub3Value}>
                    {sub3Value ? <span className="text-foreground">{sub3Value.slice(0, 8)}…</span> : <span className="text-muted-foreground">—</span>}
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

          {/* Public LP share link — what the influencer actually sends */}
          {publicLpUrl && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-500">
                  Link para divulgar (passa pela landing page)
                </span>
              </div>
              <code className="block font-mono text-xs break-all text-foreground">{publicLpUrl}</code>
              <p className="text-[9px] text-muted-foreground">
                Visitante → LP → clica no CTA → redireciona para o afiliado com <code>{form.click_id_param_name}</code> de atribuição.
              </p>
            </div>
          )}

          {/* 5. Campaign (optional) + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Step n={5} label="Campanha (opcional)" />
              <Select value={form.campanha_id} onValueChange={v => set("campanha_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
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
