import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { usePlatformAccounts } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { Plus, Pencil, Power, Trash2, ExternalLink, Search } from "lucide-react";
import type { PlatformAccountRow } from "@/services/trackingService";

const emptyForm = {
  platform_id: "",
  nome_conta: "",
  account_external_id: "",
  moeda: "BRL",
  modelo_comissao: "",
  manager_name: "",
  manager_email: "",
  manager_whatsapp: "",
  login_url: "",
  notes: "",
};

export default function TrackingAccounts() {
  const navigate = useNavigate();
  const { data, isLoading, create, update, toggle, remove, isCreating } = usePlatformAccounts();
  const { data: platforms } = usePlatforms();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<typeof emptyForm & { id?: string }>(emptyForm);

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
      manager_name: a.manager_name || "",
      manager_email: a.manager_email || "",
      manager_whatsapp: a.manager_whatsapp || "",
      login_url: a.login_url || "",
      notes: a.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing.nome_conta || !editing.platform_id) return;
    const payload = { ...editing };
    const id = payload.id;
    delete (payload as any).id;
    if (id) {
      await update(id, payload);
    } else {
      await create(payload);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Contas" }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Contas por Plataforma</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas contas de afiliado em cada plataforma</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Nova Conta</Button>
      </div>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Carregando...</CardContent></Card>}

      {!isLoading && data.length === 0 && (
        <EmptyState
          icon={Plus}
          title="Nenhuma conta cadastrada"
          description="Cadastre suas contas nas plataformas para começar o tracking."
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>ID Externo</TableHead>
                    <TableHead>Moeda</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nome_conta}</TableCell>
                      <TableCell>{getPlatformName(a.platform_id)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{a.account_external_id || "—"}</TableCell>
                      <TableCell>{a.moeda}</TableCell>
                      <TableCell>{a.manager_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px]">
                          {a.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil size={13} /></Button>
                          {a.login_url && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(a.login_url!, "_blank")}><ExternalLink size={13} /></Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle(a.id, !!a.is_active)}><Power size={13} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(a.id)}><Trash2 size={13} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Plataforma *</Label>
                <Select value={editing.platform_id} onValueChange={v => setEditing(p => ({ ...p, platform_id: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(platforms as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nome da Conta *</Label>
                <Input className="h-9 text-xs" value={editing.nome_conta} onChange={e => setEditing(p => ({ ...p, nome_conta: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">ID Externo</Label>
                <Input className="h-9 text-xs" value={editing.account_external_id} onChange={e => setEditing(p => ({ ...p, account_external_id: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Moeda</Label>
                <Select value={editing.moeda} onValueChange={v => setEditing(p => ({ ...p, moeda: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Modelo Comissão</Label>
                <Select value={editing.modelo_comissao} onValueChange={v => setEditing(p => ({ ...p, modelo_comissao: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RevShare">RevShare</SelectItem>
                    <SelectItem value="CPA">CPA</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Manager</Label>
                <Input className="h-9 text-xs" value={editing.manager_name} onChange={e => setEditing(p => ({ ...p, manager_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input className="h-9 text-xs" type="email" value={editing.manager_email} onChange={e => setEditing(p => ({ ...p, manager_email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">WhatsApp</Label>
                <Input className="h-9 text-xs" value={editing.manager_whatsapp} onChange={e => setEditing(p => ({ ...p, manager_whatsapp: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">URL de Login</Label>
              <Input className="h-9 text-xs" value={editing.login_url} onChange={e => setEditing(p => ({ ...p, login_url: e.target.value }))} placeholder="https://" />
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Input className="h-9 text-xs" value={editing.notes} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button onClick={handleSave} disabled={isCreating || !editing.nome_conta || !editing.platform_id}>
              {editing.id ? "Salvar" : "Criar Conta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
