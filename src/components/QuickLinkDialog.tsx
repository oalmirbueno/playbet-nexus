import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInfluencers } from "@/hooks/useSupabaseQuery";
import { usePlatformAccounts, useTrackingLinks } from "@/hooks/useTrackingData";
import { toast } from "@/hooks/use-toast";
import { Link2, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultInfluencerId?: string;
}

/**
 * Cadastro unificado de link de afiliado.
 * Fluxo de 2 cliques: escolher influencer + plataforma, colar o link bruto, salvar.
 * Gera tracking_link com subid (slug do influencer) e o postback existente assume daí.
 */
export default function QuickLinkDialog({ open, onOpenChange, defaultInfluencerId = "" }: Props) {
  const { data: influencers } = useInfluencers();
  const { data: accounts } = usePlatformAccounts();
  const { create } = useTrackingLinks();

  const [influencerId, setInfluencerId] = useState(defaultInfluencerId);
  const [accountId, setAccountId] = useState("");
  const [rawLink, setRawLink] = useState("");
  const [subid, setSubid] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setInfluencerId(defaultInfluencerId);
      setAccountId("");
      setRawLink("");
      setSubid("");
    }
  }, [open, defaultInfluencerId]);

  const selectedInfluencer = useMemo(
    () => influencers.find((i: any) => i.id === influencerId),
    [influencers, influencerId],
  );

  // Auto-fill subid with influencer slug
  useEffect(() => {
    if (selectedInfluencer && !subid) {
      setSubid((selectedInfluencer as any).slug || "");
    }
  }, [selectedInfluencer]); // eslint-disable-line react-hooks/exhaustive-deps

  const trackingCode = useMemo(() => {
    const slug = (selectedInfluencer as any)?.slug || "link";
    return `${slug}-${Date.now().toString(36)}`;
  }, [selectedInfluencer]);

  const buildFinalUrl = () => {
    if (!rawLink) return "";
    try {
      const url = new URL(rawLink);
      if (subid) url.searchParams.set("sub1", subid);
      return url.toString();
    } catch {
      const sep = rawLink.includes("?") ? "&" : "?";
      return subid ? `${rawLink}${sep}sub1=${encodeURIComponent(subid)}` : rawLink;
    }
  };

  const canSave = influencerId && accountId && rawLink.trim();

  const handleSave = async () => {
    if (!canSave) {
      toast({ title: "Faltam dados", description: "Influencer, plataforma e link são obrigatórios.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const finalUrl = buildFinalUrl();
      await create({
        influencer_id: influencerId,
        platform_account_id: accountId,
        base_url: rawLink.trim(),
        final_url: finalUrl,
        tracking_code: trackingCode,
        click_id_param_name: "sub1",
        status: "active",
      } as any);
      toast({ title: "Link cadastrado", description: "Postback ativo: a receita será puxada automaticamente." });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 size={16} className="text-primary" /> Novo Link de Afiliado</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs font-medium">Influencer *</Label>
            <Select value={influencerId} onValueChange={setInfluencerId}>
              <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Selecione o influencer" /></SelectTrigger>
              <SelectContent>
                {influencers.map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}{(i as any).team_label ? ` · ${(i as any).team_label}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium">Plataforma *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="PlayBet, SuperBet, 1win…" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.nome_conta}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium">Link de afiliado (cole da plataforma) *</Label>
            <Input
              className="h-9 text-xs font-mono mt-1"
              value={rawLink}
              onChange={(e) => setRawLink(e.target.value)}
              placeholder="https://1wxxxx.com/casino/list?open=register&p=xxxx"
            />
          </div>

          <div>
            <Label className="text-xs font-medium">SubID / apelido</Label>
            <Input
              className="h-9 text-xs font-mono mt-1"
              value={subid}
              onChange={(e) => setSubid(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
              placeholder="auto: slug do influencer"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Identifica o clique no postback. Mantém auto se quiser.
            </p>
          </div>

          {canSave && (
            <div className="flex items-start gap-2 bg-primary/10 border border-primary/20 rounded-md px-3 py-2">
              <CheckCircle2 size={13} className="text-primary mt-0.5 shrink-0" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Link final</p>
                <code className="block text-[10px] font-mono text-foreground break-all">{buildFinalUrl()}</code>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? "Salvando…" : "Salvar link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
