import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, ArrowRight } from "lucide-react";
import type { TrackingLinkRow } from "@/services/trackingService";

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

  // 1. Influencer chosen → filter LP instances by influencer
  const influencerInstances = useMemo(
    () => form.influencer_id ? lpInstances.filter((i: any) => i.influencer_id === form.influencer_id) : lpInstances,
    [lpInstances, form.influencer_id],
  );

  // 2. Instance auto-fills LP + base_url
  const handleInstance = (instanceId: string) => {
    const inst = lpInstances.find((i: any) => i.id === instanceId);
    setForm(p => ({
      ...p,
      landing_page_instance_id: instanceId,
      landing_page_id: inst?.landing_page_id || p.landing_page_id,
      base_url: inst?.affiliate_link || p.base_url,
    }));
  };

  const selectedInfluencer = influencers.find((i: any) => i.id === form.influencer_id);
  const selectedInstance = lpInstances.find((i: any) => i.id === form.landing_page_instance_id);
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

  const finalUrl = useMemo(
    () => buildFinalUrl(form.base_url, form.click_id_param_name, subid),
    [form.base_url, form.click_id_param_name, subid],
  );

  const canSave = form.influencer_id && form.platform_account_id && form.base_url;

  const handleSave = () => {
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

          {/* 2. Landing page / slug */}
          <div className="space-y-1.5">
            <Step n={2} label="Landing page / slug" />
            <Select value={form.landing_page_instance_id} onValueChange={handleInstance} disabled={!form.influencer_id}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder={form.influencer_id ? "Selecione o slug" : "Escolha um influencer primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {influencerInstances.map((inst: any) => {
                  const lpName = landingPages.find((l: any) => l.id === inst.landing_page_id)?.name || "LP";
                  return (
                    <SelectItem key={inst.id} value={inst.id}>/{inst.slug} — {lpName}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
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

          {/* 4. Affiliate link + subid (appears once platform chosen) */}
          {form.platform_account_id && (
            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Step n={4} label="Link de afiliado + slug" />
              <div className="grid grid-cols-[1fr_140px] gap-2">
                <Input
                  className="h-9 text-xs font-mono"
                  value={form.base_url}
                  onChange={e => set("base_url", e.target.value)}
                  placeholder="Cole o link bruto da plataforma"
                />
                <Input
                  className="h-9 text-xs font-mono"
                  value={subid}
                  onChange={e => setSubid(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                  placeholder="slug"
                />
              </div>
              {finalUrl && form.base_url && (
                <div className="flex items-start gap-1.5 text-[10px] text-foreground">
                  <CheckCircle2 size={11} className="text-primary mt-0.5 shrink-0" />
                  <code className="font-mono break-all text-muted-foreground">{finalUrl}</code>
                </div>
              )}
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
