import { useState } from "react";
import { Check, X, Eye, Search, Send, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Saque } from "@/types";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import EmptyState from "@/components/EmptyState";

type SaqueStatus = "Pendente" | "Aprovado" | "Recusado" | "Processando" | "Pago via Asaas";

interface SaqueExtended extends Omit<Saque, "status"> {
  status: SaqueStatus;
  saldoDisponivel: number;
  dataAprovacao: string;
  dataPagamento: string;
  aprovador: string;
  composicao: string;
  origemSaldo: string;
  observacoes: string;
}

const tabs: { key: SaqueStatus | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "Pendente", label: "Pendentes" },
  { key: "Aprovado", label: "Aprovados" },
  { key: "Processando", label: "Processando" },
  { key: "Pago via Asaas", label: "Pagos" },
  { key: "Recusado", label: "Recusados" },
];

export default function Saques() {
  const navigate = useNavigate();
  const [data, setData] = useState<SaqueExtended[]>([]);
  const [tab, setTab] = useState<SaqueStatus | "todos">("todos");
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [detailOpen, setDetailOpen] = useState<SaqueExtended | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ saque: SaqueExtended; action: "approve" | "reject" | "process" | "pay" } | null>(null);

  const filtered = data.filter(s => {
    if (tab !== "todos" && s.status !== tab) return false;
    if (filterTipo !== "Todos" && s.tipo !== filterTipo) return false;
    if (search && !Object.values(s).some(v => String(v).toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const byStatus = (st: SaqueStatus) => data.filter(s => s.status === st);
  const sumBy = (arr: SaqueExtended[]) => arr.reduce((a, b) => a + b.valor, 0);

  const stats = [
    { label: "Pendentes", value: byStatus("Pendente").length, total: sumBy(byStatus("Pendente")), icon: Clock, variant: "border-l-warning" },
    { label: "Aprovados", value: byStatus("Aprovado").length, total: sumBy(byStatus("Aprovado")), icon: CheckCircle, variant: "border-l-success" },
    { label: "Processando", value: byStatus("Processando").length, total: sumBy(byStatus("Processando")), icon: Send, variant: "border-l-info" },
    { label: "Pagos via Asaas", value: byStatus("Pago via Asaas").length, total: sumBy(byStatus("Pago via Asaas")), icon: DollarSign, variant: "border-l-accent" },
    { label: "Recusados", value: byStatus("Recusado").length, total: sumBy(byStatus("Recusado")), icon: XCircle, variant: "border-l-destructive" },
  ];

  const handleAction = () => {
    if (!confirmAction) return;
    const { saque, action } = confirmAction;
    const now = new Date().toLocaleDateString("pt-BR");
    let updated: Partial<SaqueExtended> = {};
    let msg = "";
    if (action === "approve") { updated = { status: "Aprovado", dataAprovacao: now, aprovador: "Admin" }; msg = "Saque aprovado"; }
    if (action === "reject") { updated = { status: "Recusado", aprovador: "Admin" }; msg = "Saque recusado"; }
    if (action === "process") { updated = { status: "Processando" }; msg = "Enviado para processamento"; }
    if (action === "pay") { updated = { status: "Pago via Asaas", dataPagamento: now }; msg = "Marcado como pago"; }
    setData(prev => prev.map(s => s.id === saque.id ? { ...s, ...updated } as SaqueExtended : s));
    toast({ title: msg, description: `${saque.nome} — R$ ${saque.valor.toLocaleString()}` });
    setConfirmAction(null);
  };

  const statusBadge = (s: SaqueStatus) => {
    const map: Record<SaqueStatus, string> = { "Pendente": "badge-warning", "Aprovado": "badge-success", "Recusado": "badge-danger", "Processando": "badge-info", "Pago via Asaas": "badge-primary" };
    return map[s];
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Gestão de Receita", path: "/financeiro" }, { label: "Saques" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central de Saques</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie solicitações de saque de influencers e sócios</p>
        </div>
        {data.length > 0 && <ExportDropdown data={data.map(({ composicao, origemSaldo, observacoes, ...rest }) => rest)} filename="saques-playbet" />}
      </div>

      {data.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={DollarSign}
            title="Nenhum saque registrado"
            description="As solicitações de saque de influencers e sócios serão exibidas aqui quando forem criadas."
            secondaryLabel="Ver Comissões"
            onSecondary={() => navigate("/comissoes")}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {stats.map(s => (
              <div key={s.label} className={`glass-card p-5 border-l-2 ${s.variant}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</span>
                  <s.icon size={14} className="text-muted-foreground" />
                </div>
                <div className="text-xl font-bold">{s.value}</div>
                <span className="text-xs text-muted-foreground">R$ {s.total.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl flex-wrap">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? "tab-btn-active" : "tab-btn"}>{t.label}</button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="input-field pl-9 w-full" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select-field" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
              <option value="Todos">Todos os tipos</option><option>Influencer</option><option>Sócio</option>
            </select>
          </div>

          <div className="glass-card overflow-x-auto invisible-scroll">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Nome</th><th>Tipo</th><th>Valor</th><th>Conta</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Nenhum saque encontrado</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs text-muted-foreground">{s.id}</td>
                    <td className="font-medium">{s.nome}</td>
                    <td><span className={s.tipo === "Influencer" ? "badge-info" : "badge-primary"}>{s.tipo}</span></td>
                    <td className="font-semibold">R$ {s.valor.toLocaleString()}</td>
                    <td className="font-mono text-xs">{s.conta}</td>
                    <td className="whitespace-nowrap text-xs">{s.data}</td>
                    <td><span className={statusBadge(s.status)}>{s.status}</span></td>
                    <td>
                      <div className="flex gap-1">
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
        </>
      )}

      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhe — {detailOpen?.id}</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Nome</span><p className="font-medium">{detailOpen.nome}</p></div>
                <div><span className="text-xs text-muted-foreground">Tipo</span><p><span className={detailOpen.tipo === "Influencer" ? "badge-info" : "badge-primary"}>{detailOpen.tipo}</span></p></div>
                <div><span className="text-xs text-muted-foreground">Valor</span><p className="font-bold text-lg">R$ {detailOpen.valor.toLocaleString()}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p><span className={statusBadge(detailOpen.status)}>{detailOpen.status}</span></p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setDetailOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>
            {confirmAction?.action === "approve" ? "Aprovar Saque" : "Recusar Saque"}
          </DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Confirmar ação para <strong>{confirmAction?.saque.nome}</strong> — R$ {confirmAction?.saque.valor.toLocaleString()}?</p>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setConfirmAction(null)}>Cancelar</button>
            <button className={`btn-primary ${confirmAction?.action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}`} onClick={handleAction}>Confirmar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
