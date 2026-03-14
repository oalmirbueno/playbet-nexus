import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
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
    notes: l.notes || "",
  };
}

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{children}</p>;
}

export default function TrackingLinkForm({ open, onOpenChange, editing: initialEditing, onSave, accounts, influencers, campanhas, landingPages, lpInstances, platforms }: Props) {
  const [form, setForm] = useState<FormState>(initialEditing);

  useEffect(() => {
    setForm(initialEditing);
  }, [initialEditing]);

  const set = (field: keyof FormState, value: string) => setForm(p => ({ ...p, [field]: value }));

  // Auto-fill from LP instance
  const handleInstanceChange = (instanceId: string) => {
    set("landing_page_instance_id", instanceId);
    const inst = lpInstances.find((i: any) => i.id === instanceId);
    if (inst) {
      if (inst.influencer_id) set("influencer_id", inst.influencer_id);
      if (inst.landing_page_id) set("landing_page_id", inst.landing_page_id);
    }
  };

  // Get platform name from account
  const selectedAccount = accounts.find(a => a.id === form.platform_account_id);
  const accountPlatformId = selectedAccount?.platform_id;
  const platformName = platforms.find((p: any) => p.id === accountPlatformId)?.name;

  const missingFields: string[] = [];
  if (!form.platform_account_id) missingFields.push("Conta da plataforma");
  if (!form.influencer_id) missingFields.push("Influencer");
  if (!form.base_url) missingFields.push("Link bruto da plataforma");

  // Filter instances by selected LP
  const filteredInstances = form.landing_page_id
    ? lpInstances.filter((i: any) => i.landing_page_id === form.landing_page_id)
    : lpInstances;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar Tracking Link" : "Novo Tracking Link"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Platform Account */}
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
              <Label className="text-xs font-medium">Influencer *</Label>
              <Select value={form.influencer_id} onValueChange={v => set("influencer_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o influencer" /></SelectTrigger>
                <SelectContent>
                  {(influencers as any[]).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <HelperText>Influencer que vai divulgar esse link</HelperText>
            </div>
          </div>

          {/* LP + Instance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Landing Page</Label>
              <Select value={form.landing_page_id} onValueChange={v => set("landing_page_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione a LP" /></SelectTrigger>
                <SelectContent>
                  {(landingPages as any[]).map((lp: any) => <SelectItem key={lp.id} value={lp.id}>{lp.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <HelperText>Página de destino do tráfego</HelperText>
            </div>
            <div>
              <Label className="text-xs font-medium">Instância / Slug da LP</Label>
              <Select value={form.landing_page_instance_id} onValueChange={handleInstanceChange}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o slug" /></SelectTrigger>
                <SelectContent>
                  {filteredInstances.map((inst: any) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      /{inst.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <HelperText>Slug personalizado do influencer na LP (auto-preenche influencer e LP)</HelperText>
            </div>
          </div>

          {/* Campanha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Campanha</Label>
              <Select value={form.campanha_id} onValueChange={v => set("campanha_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {(campanhas as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          {/* URLs */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Link bruto da plataforma *</Label>
            <Input className="h-9 text-xs font-mono" value={form.base_url} onChange={e => set("base_url", e.target.value)} placeholder="https://1wxxxx.com/casino/list?open=register&p=xxxx" />
            <HelperText>URL original de afiliado fornecida pela casa. É a base para montar o link final.</HelperText>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Link final (gerado)</Label>
              <Input className="h-9 text-xs font-mono bg-muted/50" value={form.final_url} onChange={e => set("final_url", e.target.value)} placeholder="Preenchido automaticamente ou manual" />
              <HelperText>URL final montada pelo painel com tracking. Se vazio, será gerado automaticamente.</HelperText>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Link curto operacional</Label>
              <Input className="h-9 text-xs font-mono" value={form.short_url} onChange={e => set("short_url", e.target.value)} placeholder="https://bit.ly/xxx ou similar" />
              <HelperText>Link encurtado para uso na operação (bio, stories, etc).</HelperText>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">Observações operacionais</Label>
            <Input className="h-9 text-xs" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Ex: link para stories da campanha de março" />
          </div>

          {missingFields.length > 0 && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs">
                Link incompleto para operação real. Falta: {missingFields.join(", ")}
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={() => onSave(form)}>
            {form.id ? "Salvar Alterações" : "Criar Tracking Link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
