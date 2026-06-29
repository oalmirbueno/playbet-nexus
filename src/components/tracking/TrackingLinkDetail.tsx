import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import PostbackEventBlocks from "./PostbackEventBlocks";
import type { TrackingLinkRow } from "@/services/trackingService";
import { buildPublicLpUrl, buildTrackedAffiliateUrl } from "@/lib/trackingUrl";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  influencer: { label: "Influencer", color: "bg-primary/15 text-primary" },
  socio: { label: "Sócio(a)", color: "bg-accent text-accent-foreground" },
  parceiro: { label: "Parceiro", color: "bg-secondary text-secondary-foreground" },
  interno: { label: "Interno/Teste", color: "bg-muted text-muted-foreground" },
};

interface Props {
  link: TrackingLinkRow | null;
  onClose: () => void;
  accounts: any[];
  influencers: any[];
  landingPages: any[];
  lpInstances: any[];
  platforms: any[];
}

function CopyBlock({ label, value, help, warn, primary }: { label: string; value: string; help?: string; warn?: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: `${label} copiado!` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-1 ${primary ? "border border-primary/30 bg-primary/5 rounded-lg p-3" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {primary && <CheckCircle2 size={12} className="text-primary shrink-0" />}
          <p className={`text-xs font-medium ${primary ? "text-primary" : "text-muted-foreground"}`}>{label}</p>
          {primary && <Badge className="text-[8px] h-3.5 bg-primary/20 text-primary border-0">PRINCIPAL</Badge>}
        </div>
        {value && (
          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 shrink-0" onClick={copy}>
            {copied ? <Check size={10} className="mr-1 text-green-500" /> : <Copy size={10} className="mr-1" />}
            Copiar
          </Button>
        )}
      </div>
      <code className="block bg-secondary/50 rounded-md p-2.5 text-xs font-mono break-all min-h-[2rem]">
        {value || <span className="text-muted-foreground italic">Não definido</span>}
      </code>
      {warn && (
        <div className="flex items-start gap-1 text-[10px] text-amber-600">
          <Info size={10} className="mt-0.5 shrink-0" /> {warn}
        </div>
      )}
      {help && !warn && <p className="text-[10px] text-muted-foreground">{help}</p>}
    </div>
  );
}

export default function TrackingLinkDetail({ link, onClose, accounts, influencers, landingPages, lpInstances, platforms }: Props) {
  if (!link) return null;

  const account = accounts.find(a => a.id === link.platform_account_id);
  const platform = account ? platforms.find((p: any) => p.id === account.platform_id) : null;
  const influencer = (influencers as any[]).find((i: any) => i.id === link.influencer_id);
  const lp = (landingPages as any[]).find((l: any) => l.id === link.landing_page_id);
  const instance = lpInstances.find((i: any) => i.id === link.landing_page_instance_id);
  const instanceAffiliateLink = instance?.affiliate_link || "";
  const hasInstanceLink = !!instanceAffiliateLink;
  const trackingRole = (link as any).tracking_role || "influencer";
  const roleInfo = ROLE_LABELS[trackingRole] || ROLE_LABELS.influencer;

  const hasDivergence = hasInstanceLink && link.base_url && instanceAffiliateLink !== link.base_url;

  const primaryLink = hasInstanceLink ? instanceAffiliateLink : (link.base_url || "");

  // Public LP URL (the link the influencer actually shares — passes through the LP)
  // Public LP URL (the link the influencer actually shares — passes through the LP)
  const publicLpUrl: string = buildPublicLpUrl(lp?.domain, instance?.slug, link.influencer_id || "", link.campanha_id || "");
  const trackedAffiliateUrl: string = buildTrackedAffiliateUrl(
    primaryLink,
    link.click_id_param_name || "sub1",
    (influencer as any)?.slug || "",
    link.influencer_id || "",
    link.campanha_id || "",
  );
  const shareUrl = publicLpUrl || trackedAffiliateUrl;

  const buildFinalUrl = () => shareUrl || link.final_url || "";

  const missingFields: string[] = [];
  if (!link.platform_account_id) missingFields.push("Conta");
  if (!link.influencer_id) missingFields.push("Influencer");
  if (!primaryLink) missingFields.push("Link operacional");

  return (
    <Dialog open={!!link} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes do Tracking Link
            <Badge className={`text-[9px] ${roleInfo.color}`}>{roleInfo.label}</Badge>
            {link.is_demo && <Badge variant="secondary" className="text-[9px] bg-yellow-500/15 text-yellow-600">DEMO</Badge>}
          </DialogTitle>
        </DialogHeader>

        {missingFields.length > 0 && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">
            <AlertTriangle size={14} />
            Link incompleto para operação real. Falta: {missingFields.join(", ")}
          </div>
        )}

        {trackingRole === "socio" && (
          <div className="text-xs bg-primary/10 text-primary rounded-md px-3 py-2">
            ℹ️ Vínculo de <strong>sócio(a)</strong> — tracking ativo, mas sem débito/comissão de influenciador na regra financeira.
          </div>
        )}

        {/* Operational bindings */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border rounded-lg p-3 bg-muted/30">
          <div><span className="text-muted-foreground text-xs">Plataforma:</span> <span className="font-medium text-xs">{platform?.name || "—"}</span></div>
          <div><span className="text-muted-foreground text-xs">Conta:</span> <span className="font-medium text-xs">{account?.nome_conta || "—"}</span></div>
          <div><span className="text-muted-foreground text-xs">Influencer / Parceiro:</span> <span className="font-medium text-xs">{influencer?.name || "—"}</span></div>
          <div><span className="text-muted-foreground text-xs">Papel:</span> <Badge className={`text-[9px] ml-1 ${roleInfo.color}`}>{roleInfo.label}</Badge></div>
          <div><span className="text-muted-foreground text-xs">Landing Page:</span> <span className="font-medium text-xs">{lp?.name || "—"}</span></div>
          <div><span className="text-muted-foreground text-xs">Slug / Instância:</span> <span className="font-mono font-medium text-xs">{instance ? `/${instance.slug}` : "—"}</span></div>
          <div><span className="text-muted-foreground text-xs">Click ID Param:</span> <span className="font-mono font-medium text-xs">{link.click_id_param_name || "sub1"}</span></div>
          <div><span className="text-muted-foreground text-xs">Status:</span> <Badge variant={link.status === "active" ? "default" : "secondary"} className="text-[10px] ml-1">{link.status || "active"}</Badge></div>
        </div>

        {/* Copy blocks */}
        <div className="space-y-3">
          {/* PRIMARY — what the influencer actually shares */}
          {publicLpUrl ? (
            <CopyBlock
              label={`Link para divulgar (passa pela LP /${instance?.slug})`}
              value={publicLpUrl}
              primary
              help="Este é o link que o influencer publica. Visitantes abrem a landing page e só depois são redirecionados para o afiliado."
            />
          ) : (
            <CopyBlock
              label="Link para divulgar (direto para o afiliado)"
              value={trackedAffiliateUrl}
              primary
              help="Sem LP vinculada — este link aponta direto para o afiliado já com sub1/sub2/sub3."
            />
          )}

          {/* Reference blocks */}
          {publicLpUrl && (
            <CopyBlock
              label="Link do afiliado (acionado pelo botão da LP)"
              value={trackedAffiliateUrl}
              help="Destino final do botão da landing page. Já carrega sub1/sub2/sub3 para fechar o loop de atribuição."
              warn={hasDivergence ? "Link bruto difere do link salvo na LP — verifique a instância." : undefined}
            />
          )}

          <CopyBlock
            label="Código interno de tracking"
            value={link.tracking_code}
            help="Identificador único gerado pelo painel. Usado nos SUBIDs para rastrear conversões."
          />

          {link.short_url && (
            <CopyBlock
              label="Link curto operacional"
              value={link.short_url}
              help="Link encurtado para facilitar compartilhamento (bio, stories, etc)."
            />
          )}
        </div>

        {/* Per-event postback blocks */}
        {platform && (
          <PostbackEventBlocks
            platformName={platform.name}
            trackingCode={link.tracking_code}
            influencerId={link.influencer_id || undefined}
            campanhaId={link.campanha_id || undefined}
          />
        )}

        {hasDivergence && (
          <div className="flex items-start gap-2 bg-muted/50 border rounded-md px-3 py-2 text-xs text-muted-foreground">
            <Info size={14} className="shrink-0 mt-0.5" />
            <div>
              O link bruto da plataforma está diferente do link em uso na LP.
              Isso é normal quando o link foi ajustado na instância.
              <strong className="text-foreground"> O link da LP é o principal.</strong>
            </div>
          </div>
        )}

        {link.notes && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            <span className="font-medium">Observações:</span> {link.notes}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
