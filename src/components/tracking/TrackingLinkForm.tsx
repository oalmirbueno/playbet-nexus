import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";
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

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{children}</p>;
}

const TRACKING_ROLES = [
  { value: "influencer", label: "Influencer", desc: "Comissão padrão de influenciador" },
  { value: "socio", label: "Sócio(a)", desc: "Rastreia, mas NÃO gera débito de influencer" },
  { value: "parceiro", label: "Parceiro", desc: "Parceiro externo com regra própria" },
  { value: "interno", label: "Interno/Teste", desc: "Uso interno, sem regra financeira" },
];

export default function TrackingLinkForm({ open, onOpenChange, editing: initialEditing, onSave, accounts, influencers, campanhas, landingPages, lpInstances, platforms }: Props) {
  const [form, setForm] = useState<FormState>(initialEditing);

  useEffect(() => {
    setForm(initialEditing);
  }, [initialEditing]);

  const set = (field: keyof FormState, value: string) => setForm(p => ({ ...p, [field]: value }));

  // Auto-fill from LP instance (influencer, LP, and affiliate_link as base_url)
  const handleInstanceChange = (instanceId: string) => {
    const inst = lpInstances.find((i: any) => i.id === instanceId);
    const updates: Partial<FormState> = { landing_page_instance_id: instanceId };
    if (inst) {
      if (inst.influencer_id) updates.influencer_id = inst.influencer_id;
      if (inst.landing_page_id) updates.landing_page_id = inst.landing_page_id;
      // Use the affiliate_link already distributed as the base_url
      if (inst.affiliate_link && !form.base_url) {
        updates.base_url = inst.affiliate_link;
      }
    }
    setForm(p => ({ ...p, ...updates }));
  };

  // Get platform name from account
  const selectedAccount = accounts.find(a => a.id === form.platform_account_id);
  const accountPlatformId = selectedAccount?.platform_id;
  const platformName = platforms.find((p: any) => p.id === accountPlatformId)?.name;

  // Get instance info for divergence check
  const selectedInstance = lpInstances.find((i: any) => i.id === form.landing_page_instance_id);
  const instanceAffiliateLink = selectedInstance?.affiliate_link || "";
  const hasDivergence = instanceAffiliateLink && form.base_url && instanceAffiliateLink !== form.base_url;

  const missingFields: string[] = [];
  if (!form.platform_account_id) missingFields.push("Conta da plataforma");
  if (!form.influencer_id) missingFields.push("Influencer / Parceiro");
  if (!form.base_url) missingFields.push("Link bruto da plataforma");

  // Filter instances by selected LP
  const filteredInstances = form.landing_page_id
    ? lpInstances.filter((i: any) => i.landing_page_id === form.landing_page_id)
    : lpInstances;

  const selectedRole = TRACKING_ROLES.find(r => r.value === form.tracking_role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar Tracking Link" : "Novo Tracking Link"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Instance first — drives auto-fill */}
          <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
            <p className="text-xs font-semibold text-foreground">1. Selecionar instância da LP (recomendado)</p>
            <HelperText>Ao selecionar a instância, o influencer, LP e link de afiliado serão preenchidos automaticamente.</HelperText>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Landing Page</Label>
                <Select value={form.landing_page_id} onValueChange={v => set("landing_page_id", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione a LP" /></SelectTrigger>
                  <SelectContent>
                    {(landingPages as any[]).map((lp: any) => <SelectItem key={lp.id} value={lp.id}>{lp.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Instância / Slug</Label>
                <Select value={form.landing_page_instance_id} onValueChange={handleInstanceChange}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o slug" /></SelectTrigger>
                  <SelectContent>
                    {filteredInstances.map((inst: any) => {
                      const infName = (influencers as any[]).find((i: any) => i.id === inst.influencer_id)?.name || "";
                      return (
                        <SelectItem key={inst.id} value={inst.id}>
                          /{inst.slug} {infName && `— ${infName}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedInstance && (
              <div className="text-[10px] bg-secondary/60 rounded px-2 py-1.5 font-mono break-all">
                <span className="text-muted-foreground">Link de afiliado na LP:</span> {instanceAffiliateLink || "Não definido"}
              </div>
            )}
          </div>

          {/* Platform Account + Influencer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Conta da Plataforma *</Label>
              <Select value={form.platform_account_id} onValueChange={v => set("platform_account_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Ex: 1win Principal" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.nome_conta}</SelectItem>)}
                </SelectContent>
              </Select>
              <HelperText>Casa/plataforma onde o link será usado</HelperText>
              {platformName && <p className="text-[10px] text-primary font-medium mt-0.5">Plataforma: {platformName}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium">Influencer / Parceiro *</Label>
              <Select value={form.influencer_id} onValueChange={v => set("influencer_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(influencers as any[]).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <HelperText>Pessoa vinculada a esse rastreio</HelperText>
            </div>
          </div>

          {/* Tracking Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Papel do vínculo</Label>
              <Select value={form.tracking_role} onValueChange={v => set("tracking_role", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRACKING_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <HelperText>{selectedRole?.desc}</HelperText>
            </div>
            <div>
              <Label className="text-xs font-medium">Campanha</Label>
              <Select value={form.campanha_id} onValueChange={v => set("campanha_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {(campanhas as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* URLs */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Link bruto da plataforma *</Label>
            <Input className="h-9 text-xs font-mono" value={form.base_url} onChange={e => set("base_url", e.target.value)} placeholder="https://1wxxxx.com/casino/list?open=register&p=xxxx" />
            <HelperText>URL original de afiliado. Se veio da instância, já está preenchido. Pode editar se necessário.</HelperText>
          </div>

          {hasDivergence && (
            <Alert className="py-2 border-amber-500/50 bg-amber-500/10">
              <Info className="h-3.5 w-3.5 text-amber-600" />
              <AlertDescription className="text-xs text-amber-700">
                O link bruto está diferente do link de afiliado na LP (<span className="font-mono">{instanceAffiliateLink}</span>). Verifique qual deve ser usado na operação.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Link final (gerado)</Label>
              <Input className="h-9 text-xs font-mono bg-muted/50" value={form.final_url} onChange={e => set("final_url", e.target.value)} placeholder="Automático ou manual" />
              <HelperText>URL final com tracking. Se vazio, será gerado a partir do link bruto.</HelperText>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Link curto operacional</Label>
              <Input className="h-9 text-xs font-mono" value={form.short_url} onChange={e => set("short_url", e.target.value)} placeholder="https://bit.ly/xxx" />
              <HelperText>Link encurtado para bio, stories, etc.</HelperText>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Parâmetro do Click ID</Label>
              <Select value={form.click_id_param_name} onValueChange={v => set("click_id_param_name", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["sub1", "sub2", "sub3", "clickid", "click_id", "aff_sub"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <HelperText>Parâmetro que identifica o clique na URL (normalmente sub1)</HelperText>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Observações operacionais</Label>
              <Input className="h-9 text-xs" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Ex: link para stories março" />
            </div>
          </div>

          {missingFields.length > 0 && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs">
                Link incompleto para operação real. Falta: {missingFields.join(", ")}
              </AlertDescription>
            </Alert>
          )}

          {form.tracking_role === "socio" && (
            <div className="text-[10px] bg-primary/10 text-primary rounded px-2 py-1.5">
              ℹ️ Este vínculo é de <strong>sócio(a)</strong>. O tracking funcionará normalmente, mas NÃO gerará débito/comissão de influenciador na regra financeira.
            </div>
          )}

          <Button onClick={() => onSave(form)}>
            {form.id ? "Salvar Alterações" : "Criar Tracking Link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
