import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useTrackingMetrics, usePlatformAccounts } from "@/hooks/useTrackingData";
import { useInfluencers, useCampanhas, usePlatforms } from "@/hooks/useSupabaseQuery";
import { Save, ArrowLeft } from "lucide-react";

export default function TrackingMetricsForm() {
  const navigate = useNavigate();
  const { create } = useTrackingMetrics();
  const { data: accounts } = usePlatformAccounts();
  const { data: influencers } = useInfluencers();
  const { data: campanhas } = useCampanhas();
  const { data: platforms } = usePlatforms();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    platform_id: "",
    platform_account_id: "",
    influencer_id: "",
    campanha_id: "",
    data_ref: new Date().toISOString().split("T")[0],
    cliques: 0,
    registros: 0,
    ftd: 0,
    redepositos: 0,
    depositos_total: 0,
    revenue: 0,
    revenue_liquido: 0,
    saque_disponivel: 0,
    custo_trafego: 0,
    custo_influencer: 0,
    observacoes: "",
    origem_importacao: "manual",
  });

  const set = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!form.data_ref) return;
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.platform_id) delete payload.platform_id;
      if (!payload.platform_account_id) delete payload.platform_account_id;
      if (!payload.influencer_id) delete payload.influencer_id;
      if (!payload.campanha_id) delete payload.campanha_id;
      await create(payload);
      navigate("/tracking");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Registrar Métrica" }]} />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/tracking")}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Registrar Métrica</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Insira dados de performance manualmente</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Vínculos</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Data de Referência *</Label>
              <Input type="date" className="h-9 text-xs" value={form.data_ref} onChange={e => set("data_ref", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Plataforma</Label>
              <Select value={form.platform_id} onValueChange={v => set("platform_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(platforms as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Conta</Label>
              <Select value={form.platform_account_id} onValueChange={v => set("platform_account_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => !form.platform_id || a.platform_id === form.platform_id).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.nome_conta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Influencer</Label>
              <Select value={form.influencer_id} onValueChange={v => set("influencer_id", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(influencers as any[]).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Métricas de Funil</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: "cliques", label: "Cliques" },
              { key: "registros", label: "Registros" },
              { key: "ftd", label: "FTD" },
              { key: "redepositos", label: "Redepósitos" },
              { key: "depositos_total", label: "Depósitos Total" },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input type="number" className="h-9 text-xs" value={(form as any)[f.key]} onChange={e => set(f.key, Number(e.target.value))} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Financeiro</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: "revenue", label: "Revenue Bruto" },
              { key: "revenue_liquido", label: "Revenue Líquido" },
              { key: "saque_disponivel", label: "Saque Disponível" },
              { key: "custo_trafego", label: "Custo Tráfego" },
              { key: "custo_influencer", label: "Custo Influencer" },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input type="number" step="0.01" className="h-9 text-xs" value={(form as any)[f.key]} onChange={e => set(f.key, Number(e.target.value))} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div>
            <Label className="text-xs">Observações</Label>
            <Input className="h-9 text-xs" value={form.observacoes} onChange={e => set("observacoes", e.target.value)} />
          </div>
          <Button className="mt-4 w-full" onClick={handleSave} disabled={saving || !form.data_ref}>
            <Save size={14} className="mr-1.5" /> {saving ? "Salvando..." : "Registrar Métrica"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
