import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, Camera, CalendarDays, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: any[];
  platforms: any[];
  onSaveMetric: (data: any) => Promise<void>;
  onSaveSnapshot: (data: any) => Promise<void>;
}

export default function HistoricalImport({ open, onOpenChange, accounts, platforms, onSaveMetric, onSaveSnapshot }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState("manual");

  // Manual metric entry
  const [metricForm, setMetricForm] = useState({
    platform_account_id: "",
    data_ref: new Date().toISOString().slice(0, 10),
    cliques: "",
    registros: "",
    ftd: "",
    redepositos: "",
    depositos_total: "",
    revenue: "",
    saque_disponivel: "",
    observacoes: "",
    origem_importacao: "manual_historico",
  });

  const setField = (k: string, v: string) => setMetricForm(p => ({ ...p, [k]: v }));

  const handleSaveMetric = async () => {
    if (!metricForm.platform_account_id || !metricForm.data_ref) {
      toast({ title: "Preencha conta e data", variant: "destructive" });
      return;
    }
    const account = accounts.find((a: any) => a.id === metricForm.platform_account_id);
    const payload: any = {
      platform_account_id: metricForm.platform_account_id,
      platform_id: account?.platform_id || null,
      data_ref: metricForm.data_ref,
      cliques: parseInt(metricForm.cliques) || 0,
      registros: parseInt(metricForm.registros) || 0,
      ftd: parseInt(metricForm.ftd) || 0,
      redepositos: parseInt(metricForm.redepositos) || 0,
      depositos_total: parseFloat(metricForm.depositos_total) || 0,
      revenue: parseFloat(metricForm.revenue) || 0,
      saque_disponivel: parseFloat(metricForm.saque_disponivel) || 0,
      observacoes: metricForm.observacoes || null,
      origem_importacao: "manual_historico",
    };
    await onSaveMetric(payload);
    toast({ title: "Métrica histórica registrada!" });
  };

  // Snapshot entry
  const [snapForm, setSnapForm] = useState({
    platform_account_id: "",
    data_snapshot: new Date().toISOString().slice(0, 10),
    snapshot_type: "historico",
    cliques: "",
    registros: "",
    ftd: "",
    redepositos: "",
    depositos_total: "",
    revenue: "",
    saque_disponivel: "",
    notes: "",
  });

  const setSnap = (k: string, v: string) => setSnapForm(p => ({ ...p, [k]: v }));

  const handleSaveSnapshot = async () => {
    if (!snapForm.platform_account_id || !snapForm.data_snapshot) {
      toast({ title: "Preencha conta e data", variant: "destructive" });
      return;
    }
    const account = accounts.find((a: any) => a.id === snapForm.platform_account_id);
    const payload: any = {
      platform_account_id: snapForm.platform_account_id,
      platform_id: account?.platform_id || null,
      data_snapshot: snapForm.data_snapshot,
      snapshot_type: "historico",
      cliques: parseInt(snapForm.cliques) || 0,
      registros: parseInt(snapForm.registros) || 0,
      ftd: parseInt(snapForm.ftd) || 0,
      redepositos: parseInt(snapForm.redepositos) || 0,
      depositos_total: parseFloat(snapForm.depositos_total) || 0,
      revenue: parseFloat(snapForm.revenue) || 0,
      saque_disponivel: parseFloat(snapForm.saque_disponivel) || 0,
      notes: snapForm.notes || null,
    };
    await onSaveSnapshot(payload);
    toast({ title: "Snapshot histórico registrado!" });
  };

  const AccountSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <Label className="text-xs font-medium">Conta da Plataforma *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent>
          {accounts.map((a: any) => {
            const plat = platforms.find((p: any) => p.id === a.platform_id);
            return <SelectItem key={a.id} value={a.id}>{a.nome_conta} {plat ? `(${plat.name})` : ""}</SelectItem>;
          })}
        </SelectContent>
      </Select>
    </div>
  );

  const MetricFields = ({ form, setFn }: { form: any; setFn: (k: string, v: string) => void }) => (
    <div className="grid grid-cols-3 gap-3">
      {[
        { k: "cliques", label: "Cliques" },
        { k: "registros", label: "Registros" },
        { k: "ftd", label: "FTD" },
        { k: "redepositos", label: "Redepósitos" },
        { k: "depositos_total", label: "Depósitos (R$)" },
        { k: "revenue", label: "Revenue (R$)" },
        { k: "saque_disponivel", label: "Sacável (R$)" },
      ].map(({ k, label }) => (
        <div key={k}>
          <Label className="text-[10px] text-muted-foreground">{label}</Label>
          <Input className="h-8 text-xs" type="number" value={form[k]} onChange={e => setFn(k, e.target.value)} placeholder="0" />
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={16} className="text-primary" />
            Importar Dados Históricos
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Importe dados que já existem na operação para que o Tracking Hub não comece "do zero".
          Use métricas consolidadas por dia ou snapshots de período.
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="manual" className="text-xs gap-1.5">
              <FileSpreadsheet size={12} /> Métrica Diária
            </TabsTrigger>
            <TabsTrigger value="snapshot" className="text-xs gap-1.5">
              <Camera size={12} /> Snapshot de Período
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-3">
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="text-[10px] font-medium">Métrica consolidada por dia</p>
              <p className="text-[10px] text-muted-foreground">Ideal para importar dados diários de um relatório da plataforma (print, export CSV, etc).</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AccountSelect value={metricForm.platform_account_id} onChange={v => setField("platform_account_id", v)} />
              <div>
                <Label className="text-xs font-medium">Data de referência *</Label>
                <Input className="h-9 text-xs" type="date" value={metricForm.data_ref} onChange={e => setField("data_ref", e.target.value)} />
              </div>
            </div>

            <MetricFields form={metricForm} setFn={setField} />

            <div>
              <Label className="text-[10px] text-muted-foreground">Observações</Label>
              <Input className="h-8 text-xs" value={metricForm.observacoes} onChange={e => setField("observacoes", e.target.value)} placeholder="Ex: dados extraídos do relatório semanal 1win" />
            </div>

            <Badge variant="secondary" className="text-[9px]">
              <CalendarDays size={10} className="mr-1" /> Origem: importação manual histórica
            </Badge>

            <Button className="w-full" onClick={handleSaveMetric}>
              <CheckCircle2 size={14} className="mr-1.5" /> Registrar Métrica Histórica
            </Button>
          </TabsContent>

          <TabsContent value="snapshot" className="space-y-4 mt-3">
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="text-[10px] font-medium">Snapshot consolidado</p>
              <p className="text-[10px] text-muted-foreground">Ideal para registrar um "retrato" de um período (ex: totais acumulados até hoje).</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AccountSelect value={snapForm.platform_account_id} onChange={v => setSnap("platform_account_id", v)} />
              <div>
                <Label className="text-xs font-medium">Data do snapshot *</Label>
                <Input className="h-9 text-xs" type="date" value={snapForm.data_snapshot} onChange={e => setSnap("data_snapshot", e.target.value)} />
              </div>
            </div>

            <MetricFields form={snapForm} setFn={setSnap} />

            <div>
              <Label className="text-[10px] text-muted-foreground">Notas</Label>
              <Input className="h-8 text-xs" value={snapForm.notes} onChange={e => setSnap("notes", e.target.value)} placeholder="Ex: totais acumulados da 1win até março/2026" />
            </div>

            <Button className="w-full" onClick={handleSaveSnapshot}>
              <CheckCircle2 size={14} className="mr-1.5" /> Registrar Snapshot Histórico
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
