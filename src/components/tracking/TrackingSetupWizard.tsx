import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Sparkles, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { findPresetByName, generateTrackingCode, EVENT_LABELS, type PlatformPreset } from "@/config/platformPresets";
import PostbackEventBlocks from "./PostbackEventBlocks";

const TRACKING_ROLES = [
  { value: "influencer", label: "Influencer", desc: "Comissão padrão" },
  { value: "socio", label: "Sócio(a)", desc: "Sem débito de influencer" },
  { value: "parceiro", label: "Parceiro", desc: "Regra própria" },
  { value: "interno", label: "Interno/Teste", desc: "Sem regra financeira" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: any[];
  influencers: any[];
  campanhas: any[];
  landingPages: any[];
  lpInstances: any[];
  platforms: any[];
  onComplete: (data: any) => void;
  onApplyMappings: (platformId: string, preset: PlatformPreset, accountId?: string) => void;
  existingMappingsCount: number;
}

export default function TrackingSetupWizard({
  open, onOpenChange, accounts, influencers, campanhas, landingPages, lpInstances, platforms,
  onComplete, onApplyMappings, existingMappingsCount,
}: Props) {
  const [step, setStep] = useState(0);
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  // Wizard state
  const [platformAccountId, setPlatformAccountId] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [trackingRole, setTrackingRole] = useState("influencer");
  const [campanhaId, setCampanhaId] = useState("");
  const [mappingsApplied, setMappingsApplied] = useState(false);
  const [previewTrackingCode] = useState(() => generateTrackingCode());

  // Derived
  const selectedAccount = accounts.find(a => a.id === platformAccountId);
  const selectedPlatform = selectedAccount ? platforms.find((p: any) => p.id === selectedAccount.platform_id) : null;
  const preset = selectedPlatform ? findPresetByName(selectedPlatform.name) : null;

  const selectedInstance = lpInstances.find((i: any) => i.id === instanceId);
  const affiliateLink = selectedInstance?.affiliate_link || "";
  const influencer = selectedInstance ? influencers.find((i: any) => i.id === selectedInstance.influencer_id) : null;
  const landingPage = selectedInstance ? landingPages.find((lp: any) => lp.id === selectedInstance.landing_page_id) : null;

  // Filter instances by platform's LPs
  const relevantInstances = useMemo(() => {
    return lpInstances.filter((inst: any) => inst.is_active !== false);
  }, [lpInstances]);

  const buildFinalUrl = () => {
    if (!affiliateLink) return "";
    const param = preset?.click_id_param || "sub1";
    const macro = preset?.click_id_macro || `{${param}}`;
    const sep = affiliateLink.includes("?") ? "&" : "?";
    return `${affiliateLink}${sep}${param}=${macro}`;
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast({ title: "Copiado!" });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleApplyMappings = () => {
    if (selectedPlatform && preset) {
      onApplyMappings(selectedPlatform.id, preset, platformAccountId);
      setMappingsApplied(true);
      toast({ title: "Mapeamentos aplicados!", description: `${preset.events.length} eventos configurados para ${preset.label}` });
    }
  };

  const handleFinish = () => {
    const payload: any = {
      platform_account_id: platformAccountId || null,
      landing_page_instance_id: instanceId || null,
      landing_page_id: selectedInstance?.landing_page_id || null,
      influencer_id: selectedInstance?.influencer_id || null,
      campanha_id: campanhaId && campanhaId !== "none" ? campanhaId : null,
      base_url: affiliateLink || null,
      click_id_param_name: preset?.click_id_param || "sub1",
      tracking_role: trackingRole,
      tracking_code: previewTrackingCode,
    };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    onComplete(payload);
  };

  const canProceed = [
    () => !!platformAccountId,
    () => !!instanceId,
    () => true, // role selection always valid
    () => true, // review always valid
  ];

  const steps = [
    { title: "Plataforma & Conta", desc: "Escolha a casa de apostas" },
    { title: "Instância / Slug", desc: "Selecione o link em operação" },
    { title: "Vínculo & Campanha", desc: "Defina o papel e campanha" },
    { title: "Revisar & Confirmar", desc: "Tudo pronto para operar" },
  ];

  const reset = () => {
    setStep(0);
    setPlatformAccountId("");
    setInstanceId("");
    setTrackingRole("influencer");
    setCampanhaId("");
    setMappingsApplied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            Setup Guiado de Tracking
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-2">
          {steps.map((s, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
              <p className={`text-[9px] mt-1 ${i === step ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {s.title}
              </p>
            </div>
          ))}
        </div>

        {/* Step 0: Platform & Account */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Conta da Plataforma</Label>
              <Select value={platformAccountId} onValueChange={setPlatformAccountId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Ex: 1win Principal" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a: any) => {
                    const plat = platforms.find((p: any) => p.id === a.platform_id);
                    return (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome_conta} {plat ? `(${plat.name})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedPlatform && preset && (
              <Alert className="border-primary/30 bg-primary/5 py-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  <strong>{preset.label}</strong> detectada! O painel já conhece os eventos, SUBIDs e configurações padrão desta plataforma.
                  {existingMappingsCount > 0
                    ? ` (${existingMappingsCount} mapeamentos já existem)`
                    : " Os mapeamentos serão aplicados automaticamente."
                  }
                </AlertDescription>
              </Alert>
            )}

            {selectedPlatform && !preset && (
              <Alert className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Plataforma "{selectedPlatform.name}" ainda não tem preset automático. Os mapeamentos deverão ser configurados manualmente.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Step 1: Instance */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Instância da LP / Slug</Label>
              <Select value={instanceId} onValueChange={setInstanceId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione a instância em operação" /></SelectTrigger>
                <SelectContent>
                  {relevantInstances.map((inst: any) => {
                    const inf = influencers.find((i: any) => i.id === inst.influencer_id);
                    const lp = landingPages.find((l: any) => l.id === inst.landing_page_id);
                    return (
                      <SelectItem key={inst.id} value={inst.id}>
                        /{inst.slug} — {inf?.name || "?"} {lp ? `(${lp.name})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">O sistema usará o link já distribuído nessa instância como link principal.</p>
            </div>

            {selectedInstance && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-primary" />
                    <p className="text-xs font-semibold text-primary">Dados preenchidos automaticamente</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Influencer:</span> <span className="font-medium">{influencer?.name || "—"}</span></div>
                    <div><span className="text-muted-foreground">Landing Page:</span> <span className="font-medium">{landingPage?.name || "—"}</span></div>
                    <div><span className="text-muted-foreground">Slug:</span> <span className="font-mono font-medium">/{selectedInstance.slug}</span></div>
                    <div><span className="text-muted-foreground">Link em uso:</span> <span className="font-medium text-primary">{affiliateLink ? "✓ Sim" : "✗ Não"}</span></div>
                  </div>
                  {affiliateLink && (
                    <div className="mt-1">
                      <code className="block bg-secondary/50 rounded px-2 py-1.5 text-[10px] font-mono break-all">{affiliateLink}</code>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Este é o link principal da operação.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Role & Campaign */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Papel do vínculo</Label>
              <Select value={trackingRole} onValueChange={setTrackingRole}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRACKING_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label} — {r.desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {trackingRole === "socio" && (
                <p className="text-[10px] text-primary mt-1 bg-primary/10 rounded px-2 py-1">
                  ℹ️ Sócio(a) — tracking ativo, sem débito padrão de influenciador.
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium">Campanha (opcional)</Label>
              <Select value={campanhaId} onValueChange={setCampanhaId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {(campanhas as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <Card className="border-primary/20">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-semibold">Resumo do Setup</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Plataforma:</span> <span className="font-medium">{selectedPlatform?.name || "—"}</span></div>
                  <div><span className="text-muted-foreground">Conta:</span> <span className="font-medium">{selectedAccount?.nome_conta || "—"}</span></div>
                  <div><span className="text-muted-foreground">Influencer:</span> <span className="font-medium">{influencer?.name || "—"}</span></div>
                  <div><span className="text-muted-foreground">Papel:</span> <Badge variant="outline" className="text-[9px] ml-1">{TRACKING_ROLES.find(r => r.value === trackingRole)?.label}</Badge></div>
                  <div><span className="text-muted-foreground">LP:</span> <span className="font-medium">{landingPage?.name || "—"}</span></div>
                  <div><span className="text-muted-foreground">Slug:</span> <span className="font-mono font-medium">/{selectedInstance?.slug || "—"}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Links */}
            {affiliateLink && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Links Operacionais</p>

                <div className="border rounded-md p-2.5 bg-primary/5 border-primary/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-primary" />
                      <span className="text-xs font-medium text-primary">Link em uso na LP</span>
                      <Badge className="text-[8px] h-3.5 bg-primary/20 text-primary border-0">PRINCIPAL</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => copyText(affiliateLink, "aff")}>
                      {copied === "aff" ? <Check size={10} className="mr-1 text-green-500" /> : <Copy size={10} className="mr-1" />}
                      Copiar
                    </Button>
                  </div>
                  <code className="block bg-secondary/50 rounded px-2 py-1.5 text-[10px] font-mono break-all">{affiliateLink}</code>
                </div>

                <div className="border rounded-md p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Link final rastreado</span>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => copyText(buildFinalUrl(), "final")}>
                      {copied === "final" ? <Check size={10} className="mr-1 text-green-500" /> : <Copy size={10} className="mr-1" />}
                      Copiar
                    </Button>
                  </div>
                  <code className="block bg-secondary/50 rounded px-2 py-1.5 text-[10px] font-mono break-all">{buildFinalUrl()}</code>
                </div>
              </div>
            )}

            {/* Auto-mappings */}
            {preset && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Mapeamentos Automáticos</p>
                  {!mappingsApplied && existingMappingsCount === 0 && (
                    <Button size="sm" className="h-7 text-[10px]" onClick={handleApplyMappings}>
                      <Sparkles size={10} className="mr-1" /> Aplicar {preset.events.length} mapeamentos
                    </Button>
                  )}
                  {(mappingsApplied || existingMappingsCount > 0) && (
                    <Badge className="text-[9px] bg-green-500/15 text-green-600 border-0">
                      <CheckCircle2 size={10} className="mr-1" /> Configurado
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {preset.events.map((evt, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-muted/30">
                      <Badge variant="outline" className="text-[8px] font-mono">{evt.raw_event_name}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{EVENT_LABELS[evt.canonical_event_name] || evt.canonical_event_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Postbacks */}
            {preset && selectedPlatform && (
              <PostbackEventBlocks
                platformName={selectedPlatform.name}
                trackingCode={previewTrackingCode}
                influencerId={selectedInstance?.influencer_id}
                campanhaId={campanhaId && campanhaId !== "none" ? campanhaId : undefined}
              />
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ArrowLeft size={14} className="mr-1" /> Voltar
          </Button>
          <p className="text-[10px] text-muted-foreground">Passo {step + 1} de {steps.length}</p>
          {step < steps.length - 1 ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canProceed[step]()}>
              Próximo <ArrowRight size={14} className="ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish}>
              <CheckCircle2 size={14} className="mr-1" /> Criar Tracking Link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
