import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { TrackingLinkRow } from "@/services/trackingService";

const POSTBACK_BASE = "https://rcrrbznhatdqcmfyzgbt.supabase.co/functions/v1/tracking-postback";

interface Props {
  link: TrackingLinkRow | null;
  onClose: () => void;
  accounts: any[];
  influencers: any[];
  landingPages: any[];
  lpInstances: any[];
  platforms: any[];
}

function CopyBlock({ label, value, help }: { label: string; value: string; help?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: `${label} copiado!` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={copy}>
          {copied ? <Check size={10} className="mr-1 text-green-500" /> : <Copy size={10} className="mr-1" />}
          Copiar
        </Button>
      </div>
      <code className="block bg-secondary/50 rounded-md p-2.5 text-xs font-mono break-all min-h-[2rem]">
        {value || <span className="text-muted-foreground italic">Não definido</span>}
      </code>
      {help && <p className="text-[10px] text-muted-foreground">{help}</p>}
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

  const buildFinalUrl = () => {
    if (link.final_url) return link.final_url;
    if (!link.base_url) return "";
    const sep = link.base_url.includes("?") ? "&" : "?";
    return `${link.base_url}${sep}${link.click_id_param_name || "sub1"}={click_id}`;
  };

  const buildPostbackUrl = () => {
    const platName = platform?.name?.toLowerCase() || "generic";
    return `${POSTBACK_BASE}/${platName}?event={event}&sub1=${link.tracking_code}&sub2=${link.influencer_id || "{influencer_id}"}&sub3=${link.campanha_id || "{campanha_id}"}&amount={amount}&transaction_id={transaction_id}&user_id={user_id}&country={country}`;
  };

  const missingFields: string[] = [];
  if (!link.platform_account_id) missingFields.push("Conta");
  if (!link.influencer_id) missingFields.push("Influencer");
  if (!link.base_url) missingFields.push("Link bruto");
  if (!link.landing_page_id) missingFields.push("LP");

  return (
    <Dialog open={!!link} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes do Tracking Link
            {link.is_demo && <Badge variant="secondary" className="text-[9px] bg-yellow-500/15 text-yellow-600">DEMO</Badge>}
          </DialogTitle>
        </DialogHeader>

        {missingFields.length > 0 && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">
            <AlertTriangle size={14} />
            Link incompleto para operação real. Falta: {missingFields.join(", ")}
          </div>
        )}

        {/* Vínculos operacionais */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border rounded-lg p-3 bg-muted/30">
          <div><span className="text-muted-foreground text-xs">Plataforma:</span> <span className="font-medium text-xs">{platform?.name || "—"}</span></div>
          <div><span className="text-muted-foreground text-xs">Conta:</span> <span className="font-medium text-xs">{account?.nome_conta || "—"}</span></div>
          <div><span className="text-muted-foreground text-xs">Influencer:</span> <span className="font-medium text-xs">{influencer?.name || "—"}</span></div>
          <div><span className="text-muted-foreground text-xs">Slug / Instância:</span> <span className="font-mono font-medium text-xs">{instance ? `/${instance.slug}` : "—"}</span></div>
          <div><span className="text-muted-foreground text-xs">Landing Page:</span> <span className="font-medium text-xs">{lp?.name || "—"}</span></div>
          <div><span className="text-muted-foreground text-xs">Click ID Param:</span> <span className="font-mono font-medium text-xs">{link.click_id_param_name || "sub1"}</span></div>
          <div><span className="text-muted-foreground text-xs">Status:</span> <Badge variant={link.status === "active" ? "default" : "secondary"} className="text-[10px] ml-1">{link.status || "active"}</Badge></div>
          <div><span className="text-muted-foreground text-xs">Modelo comissão:</span> <span className="font-medium text-xs">{account?.modelo_comissao || "—"}</span></div>
        </div>

        {/* Copy blocks */}
        <div className="space-y-3">
          <CopyBlock
            label="Código interno de tracking"
            value={link.tracking_code}
            help="Identificador único gerado pelo painel. Usado nos SUBIDs para rastrear conversões."
          />
          <CopyBlock
            label="Link bruto da plataforma"
            value={link.base_url || ""}
            help="URL original de afiliado fornecida pela casa."
          />
          <CopyBlock
            label="Link final para operação"
            value={buildFinalUrl()}
            help="URL montada com parâmetro de click ID. Este é o link que o influencer deve usar."
          />
          <CopyBlock
            label="Link curto para uso"
            value={link.short_url || ""}
            help="Link encurtado para facilitar compartilhamento (bio, stories, etc)."
          />
          <CopyBlock
            label="URL de Postback (configurar na plataforma)"
            value={buildPostbackUrl()}
            help="Cole esta URL no painel da casa para receber eventos de conversão automaticamente."
          />
        </div>

        {link.notes && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            <span className="font-medium">Observações:</span> {link.notes}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
