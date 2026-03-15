import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: any[];
  platforms: any[];
  onSaveMetric: (data: any) => Promise<any>;
}

const METRIC_FIELDS = [
  { k: "cliques", label: "Cliques", type: "int" },
  { k: "registros", label: "Registros", type: "int" },
  { k: "ftd", label: "FTD", type: "int" },
  { k: "redepositos", label: "Redepósitos", type: "int" },
  { k: "depositos_total", label: "Depósitos (valor)", type: "float" },
  { k: "revenue", label: "Revenue", type: "float" },
  { k: "saque_disponivel", label: "Saque Disponível", type: "float" },
];

export default function HistoricalImportDialog({ open, onOpenChange, accounts, platforms, onSaveMetric }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    platform_account_id: "",
    data_ref: new Date().toISOString().slice(0, 10),
    moeda: "USD",
    cliques: "", registros: "", ftd: "", redepositos: "",
    depositos_total: "", revenue: "", saque_disponivel: "",
    observacoes: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.platform_account_id || !form.data_ref) {
      toast({ title: "Preencha conta e data", variant: "destructive" });
      return;
    }
    const account = accounts.find((a: any) => a.id === form.platform_account_id);
    await onSaveMetric({
      platform_account_id: form.platform_account_id,
      platform_id: account?.platform_id || null,
      data_ref: form.data_ref,
      cliques: parseInt(form.cliques) || 0,
      registros: parseInt(form.registros) || 0,
      ftd: parseInt(form.ftd) || 0,
      redepositos: parseInt(form.redepositos) || 0,
      depositos_total: parseFloat(form.depositos_total) || 0,
      revenue: parseFloat(form.revenue) || 0,
      saque_disponivel: parseFloat(form.saque_disponivel) || 0,
      observacoes: form.observacoes || `Importação histórica ${form.moeda}`,
      origem_importacao: "historico_plataforma",
      original_currency: form.moeda,
      is_demo: false,
    });
    toast({ title: "Dados históricos importados!" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Upload size={16} className="text-primary" />
            Importar Histórico da Plataforma
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/30 rounded-lg p-3 space-y-1">
          <p className="text-[10px] font-semibold">Importação manual de dados históricos</p>
          <p className="text-[10px] text-muted-foreground">
            Insira os dados que já existem no painel da plataforma para alinhar o Tracking Hub com a realidade operacional.
            Os dados ficam marcados como importação histórica e não se misturam com eventos automáticos.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Conta da Plataforma *</Label>
              <Select value={form.platform_account_id} onValueChange={v => set("platform_account_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((a: any) => !a.is_demo).map((a: any) => {
                    const plat = platforms.find((p: any) => p.id === a.platform_id);
                    return <SelectItem key={a.id} value={a.id}>{a.nome_conta} {plat ? `(${plat.name})` : ""}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Data de referência *</Label>
              <Input className="h-9 text-xs" type="date" value={form.data_ref} onChange={e => set("data_ref", e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium">Moeda original</Label>
            <Select value={form.moeda} onValueChange={v => set("moeda", v)}>
              <SelectTrigger className="h-9 text-xs w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="BRL">BRL</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {METRIC_FIELDS.map(({ k, label }) => (
              <div key={k}>
                <Label className="text-[10px] text-muted-foreground">{label}</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  value={(form as any)[k]}
                  onChange={e => set(k, e.target.value)}
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">Observações</Label>
            <Input className="h-8 text-xs" value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Ex: dados do painel 1win até março/2026" />
          </div>

          <Badge variant="secondary" className="text-[9px]">
            Origem: importação histórica da plataforma
          </Badge>

          <Button className="w-full" onClick={handleSave}>
            <CheckCircle2 size={14} className="mr-1.5" /> Importar Dados Históricos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
