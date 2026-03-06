import { useState } from "react";
import { Check, X, Download, Eye, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialSaques } from "@/data/mockData";
import type { Saque } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

export default function Saques() {
  const [data, setData] = useState<Saque[]>(initialSaques);
  const [tab, setTab] = useState<"todos" | "pendentes" | "aprovados" | "recusados">("todos");
  const [detailOpen, setDetailOpen] = useState<Saque | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ saque: Saque; action: "approve" | "reject" } | null>(null);

  const pendentes = data.filter(s => s.status === "Pendente");
  const aprovados = data.filter(s => s.status === "Aprovado");
  const recusados = data.filter(s => s.status === "Recusado");
  const filtered = tab === "todos" ? data : tab === "pendentes" ? pendentes : tab === "aprovados" ? aprovados : recusados;

  const stats = [
    { label: "Pendentes", value: pendentes.length, total: `R$ ${pendentes.reduce((a, b) => a + b.valor, 0).toLocaleString()}`, variant: "border-l-warning" },
    { label: "Aprovados", value: aprovados.length, total: `R$ ${aprovados.reduce((a, b) => a + b.valor, 0).toLocaleString()}`, variant: "border-l-success" },
    { label: "Recusados", value: recusados.length, total: `R$ ${recusados.reduce((a, b) => a + b.valor, 0).toLocaleString()}`, variant: "border-l-destructive" },
  ];

  const handleAction = () => {
    if (!confirmAction) return;
    const newStatus = confirmAction.action === "approve" ? "Aprovado" as const : "Recusado" as const;
    setData(prev => prev.map(s => s.id === confirmAction.saque.id ? { ...s, status: newStatus, resp: "Admin" } : s));
    toast({ title: confirmAction.action === "approve" ? "Saque aprovado" : "Saque recusado", description: `${confirmAction.saque.nome} — R$ ${confirmAction.saque.valor.toLocaleString()}` });
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Receita", path: "/financeiro" }, { label: "Saques" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Central de Saques</h1><p className="page-subtitle">Gerencie solicitações de saque de influencers e sócios</p></div>
        <ExportDropdown data={data.map(({ id, nome, tipo, valor, origem, data: d, conta, status, resp }) => ({ id, nome, tipo, valor, origem, data: d, conta, status, resp }))} filename="saques-playbet" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`stat-card border-l-2 ${s.variant}`}>
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
            <div className="text-xl font-bold">{s.value} solicitações</div>
            <span className="text-sm text-muted-foreground">{s.total}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
          {(["todos", "pendentes", "aprovados", "recusados"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? "tab-btn-active" : "tab-btn"}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-x-auto animate-fade-in">
        <table className="data-table">
          <thead><tr><th>ID</th><th>Nome</th><th>Tipo</th><th>Valor</th><th>Origem</th><th>Data</th><th>Conta</th><th>Status</th><th>Resp.</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td className="font-mono text-xs text-muted-foreground">{s.id}</td>
                <td className="font-medium">{s.nome}</td>
                <td><span className={s.tipo === "Influencer" ? "badge-info" : "badge-primary"}>{s.tipo}</span></td>
                <td className="font-semibold">R$ {s.valor.toLocaleString()}</td>
                <td className="text-xs text-muted-foreground">{s.origem}</td>
                <td className="whitespace-nowrap text-xs">{s.data}</td>
                <td className="font-mono text-xs">{s.conta}</td>
                <td><span className={s.status === "Aprovado" ? "badge-success" : s.status === "Pendente" ? "badge-warning" : "badge-danger"}>{s.status}</span></td>
                <td className="text-xs">{s.resp}</td>
                <td>
                  <div className="flex gap-1.5">
                    <button onClick={() => setDetailOpen(s)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Eye size={13} /></button>
                    {s.status === "Pendente" && (
                      <>
                        <button onClick={() => setConfirmAction({ saque: s, action: "approve" })} className="p-1.5 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors"><Check size={13} /></button>
                        <button onClick={() => setConfirmAction({ saque: s, action: "reject" })} className="p-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"><X size={13} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhe do Saque {detailOpen?.id}</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Nome</span><p className="font-medium">{detailOpen.nome}</p></div>
                <div><span className="text-xs text-muted-foreground">Tipo</span><p>{detailOpen.tipo}</p></div>
                <div><span className="text-xs text-muted-foreground">Valor</span><p className="font-bold text-lg">R$ {detailOpen.valor.toLocaleString()}</p></div>
                <div><span className="text-xs text-muted-foreground">Origem</span><p>{detailOpen.origem}</p></div>
                <div><span className="text-xs text-muted-foreground">Data</span><p>{detailOpen.data}</p></div>
                <div><span className="text-xs text-muted-foreground">Conta</span><p className="font-mono">{detailOpen.conta}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p><span className={detailOpen.status === "Aprovado" ? "badge-success" : detailOpen.status === "Pendente" ? "badge-warning" : "badge-danger"}>{detailOpen.status}</span></p></div>
                <div><span className="text-xs text-muted-foreground">Responsável</span><p>{detailOpen.resp}</p></div>
              </div>
              <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                <p>🔗 Integração Asaas: preparada para conexão futura</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {detailOpen?.status === "Pendente" && (
              <>
                <button className="btn-primary bg-success hover:bg-success/90" onClick={() => { setConfirmAction({ saque: detailOpen, action: "approve" }); setDetailOpen(null); }}>Aprovar</button>
                <button className="btn-primary bg-destructive hover:bg-destructive/90" onClick={() => { setConfirmAction({ saque: detailOpen, action: "reject" }); setDetailOpen(null); }}>Recusar</button>
              </>
            )}
            <button className="btn-ghost" onClick={() => setDetailOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{confirmAction?.action === "approve" ? "Aprovar Saque" : "Recusar Saque"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction?.action === "approve"
              ? `Confirmar aprovação do saque de R$ ${confirmAction?.saque.valor.toLocaleString()} para ${confirmAction?.saque.nome}?`
              : `Confirmar recusa do saque de R$ ${confirmAction?.saque.valor.toLocaleString()} para ${confirmAction?.saque.nome}?`
            }
          </p>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setConfirmAction(null)}>Cancelar</button>
            <button className={`btn-primary ${confirmAction?.action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}`} onClick={handleAction}>
              {confirmAction?.action === "approve" ? "Aprovar" : "Recusar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
