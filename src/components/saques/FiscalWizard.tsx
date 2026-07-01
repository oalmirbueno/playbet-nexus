import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WITHDRAWAL_TERMS, WITHDRAWAL_TERMS_VERSION } from "@/config/withdrawalTerms";
import { FileText, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

const PIX_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Celular" },
  { value: "random", label: "Aleatória" },
];

const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

interface FiscalProfile {
  document_type: "pf" | "cnpj" | null;
  document_number: string | null;
  legal_name: string | null;
  trade_name: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  phone: string | null;
  withdrawal_terms_accepted_at: string | null;
  withdrawal_terms_version: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  onComplete: () => void;
}

export function FiscalWizard({ open, onOpenChange, userId, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [p, setP] = useState<FiscalProfile>({
    document_type: null, document_number: null, legal_name: null, trade_name: null,
    address_street: null, address_number: null, address_complement: null, address_district: null,
    address_city: null, address_state: null, address_zip: null,
    pix_key: null, pix_key_type: null, phone: null,
    withdrawal_terms_accepted_at: null, withdrawal_terms_version: null,
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (data) {
        setP({
          document_type: (data.document_type ?? null) as FiscalProfile["document_type"],
          document_number: data.document_number ?? null,
          legal_name: data.legal_name ?? data.full_name ?? null,
          trade_name: data.trade_name ?? null,
          address_street: data.address_street ?? null,
          address_number: data.address_number ?? null,
          address_complement: data.address_complement ?? null,
          address_district: data.address_district ?? null,
          address_city: data.address_city ?? data.city ?? null,
          address_state: data.address_state ?? null,
          address_zip: data.address_zip ?? null,
          pix_key: data.pix_key ?? null,
          pix_key_type: data.pix_key_type ?? null,
          phone: data.phone ?? null,
          withdrawal_terms_accepted_at: data.withdrawal_terms_accepted_at ?? null,
          withdrawal_terms_version: data.withdrawal_terms_version ?? null,
        });
      }
      setStep(1);
      setAccepted(false);
    })();
  }, [open, userId]);

  const step1Valid =
    !!p.document_type &&
    !!p.document_number?.trim() &&
    !!p.legal_name?.trim();

  const step2Valid =
    !!p.address_zip?.trim() &&
    !!p.address_street?.trim() &&
    !!p.address_number?.trim() &&
    !!p.address_city?.trim() &&
    !!p.address_state?.trim() &&
    !!p.pix_key?.trim() &&
    !!p.pix_key_type;

  async function save() {
    if (!accepted) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      document_type: p.document_type,
      document_number: p.document_number,
      legal_name: p.legal_name,
      trade_name: p.trade_name,
      address_street: p.address_street,
      address_number: p.address_number,
      address_complement: p.address_complement,
      address_district: p.address_district,
      address_city: p.address_city,
      address_state: p.address_state,
      address_zip: p.address_zip,
      pix_key: p.pix_key,
      pix_key_type: p.pix_key_type,
      phone: p.phone,
      city: p.address_city,
      withdrawal_terms_accepted_at: new Date().toISOString(),
      withdrawal_terms_version: WITHDRAWAL_TERMS_VERSION,
    }).eq("id", userId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cadastro fiscal concluído", description: "Você já pode solicitar saques." });
    onOpenChange(false);
    onComplete();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-lg font-display">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Configurar dados fiscais
          </DialogTitle>
          <DialogDescription>
            Você precisa completar seus dados fiscais e ler os termos antes do primeiro saque.
          </DialogDescription>
          <div className="flex items-center gap-1 pt-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step >= n ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span className={step === 1 ? "text-foreground font-medium" : ""}>1. Identificação</span>
            <span className={step === 2 ? "text-foreground font-medium" : ""}>2. Endereço &amp; PIX</span>
            <span className={step === 3 ? "text-foreground font-medium" : ""}>3. Termos</span>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] px-6 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Como você vai receber?
                </Label>
                <RadioGroup
                  className="mt-2 grid grid-cols-2 gap-2"
                  value={p.document_type ?? ""}
                  onValueChange={(v) => setP({ ...p, document_type: v as any })}
                >
                  {[
                    { v: "pf", t: "Pessoa Física", d: "CPF · sem CNPJ" },
                    { v: "cnpj", t: "CNPJ", d: "Emissão de NF ágil" },
                  ].map((o) => (
                    <label
                      key={o.v}
                      className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                        p.document_type === o.v ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/40"
                      }`}
                    >
                      <RadioGroupItem value={o.v} />
                      <div>
                        <div className="text-sm font-medium">{o.t}</div>
                        <div className="text-[11px] text-muted-foreground">{o.d}</div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <FieldRow>
                <FieldCol label={p.document_type === "cnpj" ? "CNPJ" : "CPF"} required>
                  <Input
                    value={p.document_number ?? ""}
                    onChange={(e) => setP({ ...p, document_number: e.target.value })}
                    placeholder={p.document_type === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                  />
                </FieldCol>
                <FieldCol label={p.document_type === "cnpj" ? "Razão social" : "Nome completo"} required>
                  <Input
                    value={p.legal_name ?? ""}
                    onChange={(e) => setP({ ...p, legal_name: e.target.value })}
                  />
                </FieldCol>
              </FieldRow>

              {p.document_type === "cnpj" && (
                <FieldCol label="Nome fantasia">
                  <Input value={p.trade_name ?? ""} onChange={(e) => setP({ ...p, trade_name: e.target.value })} />
                </FieldCol>
              )}

              <FieldCol label="WhatsApp para contato">
                <Input value={p.phone ?? ""} onChange={(e) => setP({ ...p, phone: e.target.value })} placeholder="(11) 99999-0000" />
              </FieldCol>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground bg-secondary/40 border border-border/40 rounded-lg p-3">
                Usamos o endereço para emissão da nota fiscal e conferência do pagamento.
              </div>
              <FieldRow>
                <FieldCol label="CEP" required>
                  <Input value={p.address_zip ?? ""} onChange={(e) => setP({ ...p, address_zip: e.target.value })} placeholder="00000-000" />
                </FieldCol>
                <FieldCol label="UF" required>
                  <Select value={p.address_state ?? ""} onValueChange={(v) => setP({ ...p, address_state: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldCol>
              </FieldRow>
              <FieldCol label="Cidade" required>
                <Input value={p.address_city ?? ""} onChange={(e) => setP({ ...p, address_city: e.target.value })} />
              </FieldCol>
              <FieldRow>
                <FieldCol label="Rua / Logradouro" required>
                  <Input value={p.address_street ?? ""} onChange={(e) => setP({ ...p, address_street: e.target.value })} />
                </FieldCol>
                <FieldCol label="Número" required>
                  <Input value={p.address_number ?? ""} onChange={(e) => setP({ ...p, address_number: e.target.value })} />
                </FieldCol>
              </FieldRow>
              <FieldRow>
                <FieldCol label="Bairro">
                  <Input value={p.address_district ?? ""} onChange={(e) => setP({ ...p, address_district: e.target.value })} />
                </FieldCol>
                <FieldCol label="Complemento">
                  <Input value={p.address_complement ?? ""} onChange={(e) => setP({ ...p, address_complement: e.target.value })} />
                </FieldCol>
              </FieldRow>

              <div className="pt-2 border-t border-border/40" />

              <FieldRow>
                <FieldCol label="Tipo da chave PIX" required>
                  <Select value={p.pix_key_type ?? ""} onValueChange={(v) => setP({ ...p, pix_key_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {PIX_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldCol>
                <FieldCol label="Chave PIX" required>
                  <Input
                    className="font-mono"
                    value={p.pix_key ?? ""}
                    onChange={(e) => setP({ ...p, pix_key: e.target.value })}
                    placeholder="Sua chave PIX"
                  />
                </FieldCol>
              </FieldRow>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-display font-semibold">
                  <FileText className="h-4 w-4 text-primary" />
                  Termos de saque · v{WITHDRAWAL_TERMS_VERSION}
                </div>
                <ul className="space-y-3">
                  {WITHDRAWAL_TERMS.map((t) => (
                    <li key={t.title} className="text-[13px] leading-relaxed">
                      <div className="font-semibold text-foreground">{t.title}</div>
                      <div className="text-muted-foreground">{t.body}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-border/60 bg-secondary/30 p-3">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(!!v)}
                  className="mt-0.5"
                />
                <span className="text-[13px]">
                  Li e concordo com os termos de saque da Playbet. Entendo que a nota fiscal é obrigatória e que os saques seguem o ciclo mensal descrito acima.
                </span>
              </label>
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4 bg-secondary/30">
          <Button
            variant="ghost"
            onClick={() => (step === 1 ? onOpenChange(false) : setStep((step - 1) as 1 | 2))}
          >
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((step + 1) as 2 | 3)}
              disabled={step === 1 ? !step1Valid : !step2Valid}
              className="gap-2"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={save} disabled={!accepted || saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {saving ? "Salvando..." : "Aceitar e concluir"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}
function FieldCol({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function isFiscalComplete(profile: any): boolean {
  if (!profile) return false;
  return !!(
    profile.document_type &&
    profile.document_number &&
    profile.legal_name &&
    profile.address_zip &&
    profile.address_street &&
    profile.address_number &&
    profile.address_city &&
    profile.address_state &&
    profile.pix_key &&
    profile.pix_key_type &&
    profile.withdrawal_terms_accepted_at
  );
}
