import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import TrackingDemoFilter from "@/components/TrackingDemoFilter";
import { usePlatformAccounts } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { Plus, Pencil, Power, Trash2, ExternalLink, Search, Building2, Copy, Check } from "lucide-react";
import type { PlatformAccountRow } from "@/services/trackingService";
import { useToast } from "@/hooks/use-toast";

const emptyForm = {
  platform_id: "",
  nome_conta: "",
  account_external_id: "",
  moeda: "BRL",
  modelo_comissao: "",
  revshare_percent: "",
  cpa_value: "",
  hybrid_details: "",
  manager_name: "",
  manager_email: "",
  manager_whatsapp: "",
  manager_telegram: "",
  login_url: "",
  dashboard_url: "",
  notes: "",
};

export default function TrackingAccounts() {
  const { data, isLoading, create, update, toggle, remove, isCreating } = usePlatformAccounts();
  const { data: platforms } = usePlatforms();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<typeof emptyForm & { id?: string }>(emptyForm);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = data.filter(a =>
    a.nome_conta.toLowerCase().includes(search.toLowerCase()) ||
    (a.manager_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getPlatformName = (id: string) => (platforms as any[]).find((p: any) => p.id === id)?.name || "—";

  const openCreate = () => { setEditing(emptyForm); setModalOpen(true); };
  const openEdit = (a: PlatformAccountRow) => {
    setEditing({
      id: a.id,
      platform_id: a.platform_id,
      nome_conta: a.nome_conta,
      account_external_id: a.account_external_id || "",
      moeda: a.moeda || "BRL",
      modelo_comissao: a.modelo_comissao || "",
      revshare_percent: a.revshare_percent?.toString() || "",
      cpa_value: a.cpa_value?.toString() || "",
      hybrid_details: a.hybrid_details || "",
      manager_name: a.manager_name || "",
      manager_email: a.manager_email || "",
      manager_whatsapp: a.manager_whatsapp || "",
      manager_telegram: a.manager_telegram || "",
      login_url: a.login_url || "",
      dashboard_url: a.dashboard_url || "",
      notes: a.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing.nome_conta || !editing.platform_id) return;
    const { id, revshare_percent, cpa_value, ...rest } = editing as any;
    const payload: any = {
      ...rest,
      revshare_percent: revshare_percent ? parseFloat(revshare_percent) : null,
      cpa_value: cpa_value ? parseFloat(cpa_value) : null,
    };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    // Keep required fields
    payload.nome_conta = editing.nome_conta;
    payload.platform_id = editing.platform_id;
    payload.moeda = editing.moeda || "BRL";

    if (id) {
      await update(id, payload);
    } else {
      await create(payload);
    }
    setModalOpen(false);
  };

  const postbackUrl = `https://rcrrbznhatdqcmfyzgbt.supabase.co/functions/v1/tracking-postback`;

  const copyPostback = (a: PlatformAccountRow) => {
    const platName = getPlatformName(a.platform_id).toLowerCase().replace(/\s+/g, "-");
    const url = `${postbackUrl}/${platName}?event={event}&sub1={click_id}&sub2={influencer_id}&sub3={campanha_id}&amount={amount}&transaction_id={transaction_id}&user_id={user_id}&country={country}`;
    navigator.clipboard.writeText(url);
    setCopiedId(a.id);
    toast({ title: "Postback URL copiada!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Contas" }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Contas por Plataforma</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas contas de afiliado em cada plataforma</p>
        </div>
        <div className="flex gap-2 items-center">
          <TrackingDemoFilter />
          <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Nova Conta</Button>
        </div>
      </div>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Carregando...</CardContent></Card>}

      {!isLoading && data.length === 0 && (
        <EmptyState
          icon={Building2}
          title="Nenhuma conta real cadastrada"
          description="Cadastre a conta da sua plataforma de afiliado para começar a receber dados reais. Você precisará do login, modelo de comissão e dados do gerente."
          actionLabel="Cadastrar Conta"
          onAction={openCreate}
        />
      )}

      {!isLoading && data.length > 0 && (
        <>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 h-9 text-xs" placeholder="Buscar conta..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Moeda</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          <div>
                            {a.nome_conta}
                            {a.is_demo && <Badge variant="secondary" className="ml-2 text-[9px] bg-yellow-500/15 text-yellow-600">DEMO</Badge>}
                          </div>
                          {a.account_external_id && <span className="text-[10px] font-mono text-muted-foreground">{a.account_external_id}</span>}
                        </TableCell>
                        <TableCell>{getPlatformName(a.platform_id)}</TableCell>
                        <TableCell className="text-xs">{a.modelo_comissao || "—"}</TableCell>
                        <TableCell className="text-xs font-medium">
                          {a.modelo_comissao === "RevShare" && a.revshare_percent ? `${a.revshare_percent}%` : ""}
                          {a.modelo_comissao === "CPA" && a.cpa_value ? `R$ ${a.cpa_value}` : ""}
                          {a.modelo_comissao === "Hybrid" ? `${a.revshare_percent || 0}% + R$${a.cpa_value || 0}` : ""}
                          {!a.modelo_comissao ? "—" : ""}
                        </TableCell>
                        <TableCell>{a.moeda}</TableCell>
                        <TableCell>
                          <div className="text-xs">{a.manager_name || "—"}</div>
                          {a.manager_email && <div className="text-[10px] text-muted-foreground">{a.manager_email}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px]">
                            {a.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Copiar Postback URL" onClick={() => copyPostback(a)}>
                              {copiedId === a.id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil size={13} /></Button>
                            {a.dashboard_url && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Abrir Dashboard" onClick={() => window.open(a.dashboard_url!, "_blank")}><ExternalLink size={13} /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle(a.id, !!a.is_active)}><Power size={13} /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(a.id)}><Trash2 size={13} /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar Conta" : "Nova Conta de Plataforma"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="geral" className="mt-2">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
              <TabsTrigger value="comissao">Comissão</TabsTrigger>
              <TabsTrigger value="contato">Contato & Acesso</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Plataforma *</Label>
                  <Select value={editing.platform_id} onValueChange={v => setEditing(p => ({ ...p, platform_id: v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione a casa" /></SelectTrigger>
                    <SelectContent>
                      {(platforms as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Nome da Conta *</Label>
                  <Input className="h-9 text-xs" value={editing.nome_conta} onChange={e => setEditing(p => ({ ...p, nome_conta: e.target.value }))} placeholder="Ex: PlayBet - Conta Principal" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">ID Externo</Label>
                  <Input className="h-9 text-xs" value={editing.account_external_id} onChange={e => setEditing(p => ({ ...p, account_external_id: e.target.value }))} placeholder="ID no painel da casa" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Moeda</Label>
                  <Select value={editing.moeda} onValueChange={v => setEditing(p => ({ ...p, moeda: v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL (Real)</SelectItem>
                      <SelectItem value="USD">USD (Dólar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Observações operacionais</Label>
                <Textarea className="text-xs min-h-[60px]" value={editing.notes} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} placeholder="Anotações sobre a conta, condições especiais, etc." />
              </div>
            </TabsContent>

            <TabsContent value="comissao" className="space-y-4 mt-4">
              <div>
                <Label className="text-xs font-medium">Modelo de Comissão</Label>
                <Select value={editing.modelo_comissao} onValueChange={v => setEditing(p => ({ ...p, modelo_comissao: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RevShare">RevShare (% da receita)</SelectItem>
                    <SelectItem value="CPA">CPA (valor fixo por FTD)</SelectItem>
                    <SelectItem value="Hybrid">Hybrid (RevShare + CPA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(editing.modelo_comissao === "RevShare" || editing.modelo_comissao === "Hybrid") && (
                <div>
                  <Label className="text-xs font-medium">Percentual RevShare (%)</Label>
                  <Input className="h-9 text-xs" type="number" step="0.1" value={editing.revshare_percent} onChange={e => setEditing(p => ({ ...p, revshare_percent: e.target.value }))} placeholder="Ex: 30" />
                </div>
              )}
              {(editing.modelo_comissao === "CPA" || editing.modelo_comissao === "Hybrid") && (
                <div>
                  <Label className="text-xs font-medium">Valor CPA (R$)</Label>
                  <Input className="h-9 text-xs" type="number" step="0.01" value={editing.cpa_value} onChange={e => setEditing(p => ({ ...p, cpa_value: e.target.value }))} placeholder="Ex: 50.00" />
                </div>
              )}
              {editing.modelo_comissao === "Hybrid" && (
                <div>
                  <Label className="text-xs font-medium">Detalhes do modelo híbrido</Label>
                  <Input className="h-9 text-xs" value={editing.hybrid_details} onChange={e => setEditing(p => ({ ...p, hybrid_details: e.target.value }))} placeholder="Condições especiais do acordo" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="contato" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Nome do Manager</Label>
                  <Input className="h-9 text-xs" value={editing.manager_name} onChange={e => setEditing(p => ({ ...p, manager_name: e.target.value }))} placeholder="Nome do gerente de afiliados" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Email</Label>
                  <Input className="h-9 text-xs" type="email" value={editing.manager_email} onChange={e => setEditing(p => ({ ...p, manager_email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">WhatsApp</Label>
                  <Input className="h-9 text-xs" value={editing.manager_whatsapp} onChange={e => setEditing(p => ({ ...p, manager_whatsapp: e.target.value }))} placeholder="+55..." />
                </div>
                <div>
                  <Label className="text-xs font-medium">Telegram</Label>
                  <Input className="h-9 text-xs" value={editing.manager_telegram} onChange={e => setEditing(p => ({ ...p, manager_telegram: e.target.value }))} placeholder="@usuario" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">URL de Login (Painel Afiliado)</Label>
                  <Input className="h-9 text-xs" value={editing.login_url} onChange={e => setEditing(p => ({ ...p, login_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <Label className="text-xs font-medium">URL do Dashboard</Label>
                  <Input className="h-9 text-xs" value={editing.dashboard_url} onChange={e => setEditing(p => ({ ...p, dashboard_url: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button className="mt-4 w-full" onClick={handleSave} disabled={isCreating || !editing.nome_conta || !editing.platform_id}>
            {editing.id ? "Salvar Alterações" : "Criar Conta"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
