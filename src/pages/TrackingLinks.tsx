import { useState } from "react";
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
import { useTrackingLinks, usePlatformAccounts } from "@/hooks/useTrackingData";
import { useInfluencers, useCampanhas, useLandingPages } from "@/hooks/useSupabaseQuery";
import { Plus, Pencil, Trash2, Link2, Copy, Check } from "lucide-react";
import type { TrackingLinkRow } from "@/services/trackingService";
import { useToast } from "@/hooks/use-toast";

const emptyForm = {
  platform_account_id: "",
  landing_page_id: "",
  influencer_id: "",
  campanha_id: "",
  base_url: "",
  click_id_param_name: "sub1",
  notes: "",
};

export default function TrackingLinks() {
  const { data, isLoading, create, update, remove } = useTrackingLinks();
  const { data: accounts } = usePlatformAccounts();
  const { data: influencers } = useInfluencers();
  const { data: campanhas } = useCampanhas();
  const { data: landingPages } = useLandingPages();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<typeof emptyForm & { id?: string }>(emptyForm);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = data.filter(l =>
    (l.tracking_code || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.base_url || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.notes || "").toLowerCase().includes(search.toLowerCase())
  );

  const getAccountName = (id: string | null) => accounts.find(a => a.id === id)?.nome_conta || "—";
  const getInfluencerName = (id: string | null) => (influencers as any[]).find((i: any) => i.id === id)?.name || "—";
  const getLpName = (id: string | null) => (landingPages as any[]).find((lp: any) => lp.id === id)?.name || "—";

  const openCreate = () => { setEditing(emptyForm); setModalOpen(true); };
  const openEdit = (l: TrackingLinkRow) => {
    setEditing({
      id: l.id,
      platform_account_id: l.platform_account_id || "",
      landing_page_id: l.landing_page_id || "",
      influencer_id: l.influencer_id || "",
      campanha_id: l.campanha_id || "",
      base_url: l.base_url || "",
      click_id_param_name: l.click_id_param_name || "sub1",
      notes: l.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...editing };
    const id = payload.id;
    delete (payload as any).id;
    // Clean empty strings to null
    Object.keys(payload).forEach(k => {
      if ((payload as any)[k] === "") (payload as any)[k] = null;
    });
    if (id) {
      await update(id, payload);
    } else {
      await create(payload);
    }
    setModalOpen(false);
  };

  const copyUrl = (l: TrackingLinkRow) => {
    const url = l.final_url || l.base_url || l.tracking_code;
    navigator.clipboard.writeText(url || "");
    setCopiedId(l.id);
    toast({ title: "URL copiada" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Links" }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tracking Links</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Links rastreáveis com código de tracking e SUBIDs</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Novo Link</Button>
      </div>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Carregando...</CardContent></Card>}

      {!isLoading && data.length === 0 && (
        <EmptyState
          icon={Link2}
          title="Nenhum tracking link cadastrado"
          description="Crie links rastreáveis para conectar plataformas, influencers e campanhas."
          actionLabel="Criar Link"
          onAction={openCreate}
        />
      )}

      {!isLoading && data.length > 0 && (
        <>
          <Input className="h-9 text-xs max-w-sm" placeholder="Buscar link..." value={search} onChange={e => setSearch(e.target.value)} />
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking Code</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Influencer</TableHead>
                      <TableHead>LP</TableHead>
                      <TableHead>Base URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs font-medium">{l.tracking_code}</TableCell>
                        <TableCell className="text-xs">{getAccountName(l.platform_account_id)}</TableCell>
                        <TableCell className="text-xs">{getInfluencerName(l.influencer_id)}</TableCell>
                        <TableCell className="text-xs">{getLpName(l.landing_page_id)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{l.base_url || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={l.status === "active" ? "default" : "secondary"} className="text-[10px]">
                            {l.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyUrl(l)}>
                              {copiedId === l.id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}><Pencil size={13} /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(l.id)}><Trash2 size={13} /></Button>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar Link" : "Novo Tracking Link"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Conta Plataforma</Label>
                <Select value={editing.platform_account_id} onValueChange={v => setEditing(p => ({ ...p, platform_account_id: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.nome_conta}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Influencer</Label>
                <Select value={editing.influencer_id} onValueChange={v => setEditing(p => ({ ...p, influencer_id: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(influencers as any[]).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Landing Page</Label>
                <Select value={editing.landing_page_id} onValueChange={v => setEditing(p => ({ ...p, landing_page_id: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(landingPages as any[]).map((lp: any) => <SelectItem key={lp.id} value={lp.id}>{lp.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Campanha</Label>
                <Select value={editing.campanha_id} onValueChange={v => setEditing(p => ({ ...p, campanha_id: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(campanhas as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Base URL</Label>
                <Input className="h-9 text-xs" value={editing.base_url} onChange={e => setEditing(p => ({ ...p, base_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Click ID Param</Label>
                <Select value={editing.click_id_param_name} onValueChange={v => setEditing(p => ({ ...p, click_id_param_name: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["sub1", "sub2", "sub3", "clickid", "click_id"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Input className="h-9 text-xs" value={editing.notes} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button onClick={handleSave}>
              {editing.id ? "Salvar" : "Criar Link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
