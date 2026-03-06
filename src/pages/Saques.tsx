import { useState } from "react";
import { Check, X, Eye, Search, Send, DollarSign, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialSaques } from "@/data/mockData";
import type { Saque } from "@/types";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

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

const initialData: SaqueExtended[] = [
  { id: "SAQ-001", nome: "Rafael Mendes", tipo: "Influencer", valor: 8500, origem: "Comissão afiliado", data: "05/03/2026", conta: "PIX •••4521", status: "Pendente", resp: "—", saldoDisponivel: 8500, dataAprovacao: "", dataPagamento: "", aprovador: "", composicao: "Comissão 20% sobre R$ 42.500", origemSaldo: "Bet365 + Betano", observacoes: "" },
  { id: "SAQ-002", nome: "Ricardo Almeida", tipo: "Sócio", valor: 12000, origem: "Divisão societária", data: "04/03/2026", conta: "PIX •••8832", status: "Pendente", resp: "—", saldoDisponivel: 16200, dataAprovacao: "", dataPagamento: "", aprovador: "", composicao: "1/3 base societária Mar/2026", origemSaldo: "Base societária geral", observacoes: "" },
  { id: "SAQ-003", nome: "Ana Souza", tipo: "Influencer", valor: 2800, origem: "Comissão afiliado", data: "03/03/2026", conta: "PIX •••1199", status: "Aprovado", resp: "Admin", saldoDisponivel: 2800, dataAprovacao: "03/03/2026", dataPagamento: "", aprovador: "Admin", composicao: "Comissão 12% sobre R$ 23.333", origemSaldo: "Bet365", observacoes: "" },
  { id: "SAQ-004", nome: "Fernanda Rocha", tipo: "Sócio", valor: 10500, origem: "Divisão societária", data: "02/03/2026", conta: "PIX •••7744", status: "Processando", resp: "Admin", saldoDisponivel: 14175, dataAprovacao: "02/03/2026", dataPagamento: "", aprovador: "Admin", composicao: "1/3 base societária Fev/2026", origemSaldo: "Base societária geral", observacoes: "Enviado para Asaas" },
  { id: "SAQ-005", nome: "Pedro Lima", tipo: "Influencer", valor: 6100, origem: "Comissão afiliado", data: "01/03/2026", conta: "PIX •••2266", status: "Recusado", resp: "Admin", saldoDisponivel: 6100, dataAprovacao: "", dataPagamento: "", aprovador: "Admin", composicao: "Comissão 18% sobre R$ 33.888", origemSaldo: "Pixbet + Bet365", observacoes: "Saldo insuficiente na data" },
  { id: "SAQ-006", nome: "Carlos Silva", tipo: "Influencer", valor: 3500, origem: "Comissão afiliado", data: "28/02/2026", conta: "PIX •••3388", status: "Pago via Asaas", resp: "Admin", saldoDisponivel: 4200, dataAprovacao: "28/02/2026", dataPagamento: "01/03/2026", aprovador: "Admin", composicao: "Comissão 15% sobre R$ 23.333", origemSaldo: "Betano", observacoes: "Pago com sucesso via PIX" },
  { id: "SAQ-007", nome: "Lucas Martins", tipo: "Sócio", valor: 10125, origem: "Divisão societária", data: "27/02/2026", conta: "PIX •••5511", status: "Pago via Asaas", resp: "Admin", saldoDisponivel: 10125, dataAprovacao: "27/02/2026", dataPagamento: "28/02/2026", aprovador: "Admin", composicao: "1/3 base societária Fev/2026", origemSaldo: "Base societária geral", observacoes: "Transferência concluída" },
];

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
  const [data, setData] = useState(initialData);
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

  // Alerts
  const alertSaques = data.filter(s => s.status === "Pendente" && s.valor > s.saldoDisponivel);

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
        <ExportDropdown data={data.map(({ composicao, origemSaldo, observacoes, ...rest }) => rest)} filename="saques-playbet" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`glass-card p-5 border-l-2 ${s.variant} cursor-pointer hover:bg-secondary/30 transition-colors`} onClick={() => setTab(s.label === "Pagos via Asaas" ? "Pago via Asaas" : s.label === "Pendentes" ? "Pendente" : s.label === "Aprovados" ? "Aprovado" : s.label === "Processando" ? "Processando" : "Recusado")}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</span>
              <s.icon size={14} className="text-muted-foreground" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <span className="text-xs text-muted-foreground">R$ {s.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {alertSaques.length > 0 && (
        <div className="glass-card p-4 border-destructive/30">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className="text-destructive" /><span className="text-sm font-medium text-destructive">Alertas de Saque</span></div>
          {alertSaques.map(s => (
            <div key={s.id} className="text-xs text-muted-foreground">⚠ {s.nome}: saque de R$ {s.valor.toLocaleString()} acima do saldo disponível (R$ {s.saldoDisponivel.toLocaleString()})</div>
          ))}
        </div>
      )}

      {/* Filters */}
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

      {/* Table */}
      <div className="glass-card overflow-x-auto animate-fade-in">
        <table className="data-table">
          <thead><tr><th>ID</th><th>Nome</th><th>Tipo</th><th>Valor</th><th>Saldo Disp.</th><th>Conta</th><th>Solicitação</th><th>Aprovação</th><th>Pagamento</th><th>Status</th><th>Aprovador</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={12} className="text-center text-muted-foreground py-8">Nenhum saque encontrado</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className={s.valor > s.saldoDisponivel && s.status === "Pendente" ? "bg-destructive/5" : ""}>
                <td className="font-mono text-xs text-muted-foreground">{s.id}</td>
                <td className="font-medium cursor-pointer hover:text-accent transition-colors" onClick={() => navigate(s.tipo === "Influencer" ? "/influencers" : "/socios")}>{s.nome}</td>
                <td><span className={s.tipo === "Influencer" ? "badge-info" : "badge-primary"}>{s.tipo}</span></td>
                <td className="font-semibold">R$ {s.valor.toLocaleString()}</td>
                <td className="text-xs">R$ {s.saldoDisponivel.toLocaleString()}</td>
                <td className="font-mono text-xs">{s.conta}</td>
                <td className="whitespace-nowrap text-xs">{s.data}</td>
                <td className="whitespace-nowrap text-xs">{s.dataAprovacao || "—"}</td>
                <td className="whitespace-nowrap text-xs">{s.dataPagamento || "—"}</td>
                <td><span className={statusBadge(s.status)}>{s.status}</span></td>
                <td className="text-xs">{s.aprovador || "—"}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => setDetailOpen(s)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Eye size={13} /></button>
                    {s.status === "Pendente" && (
                      <>
                        <button onClick={() => setConfirmAction({ saque: s, action: "approve" })} className="p-1.5 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors" title="Aprovar"><Check size={13} /></button>
                        <button onClick={() => setConfirmAction({ saque: s, action: "reject" })} className="p-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors" title="Recusar"><X size={13} /></button>
                      </>
                    )}
                    {s.status === "Aprovado" && (
                      <button onClick={() => setConfirmAction({ saque: s, action: "process" })} className="p-1.5 rounded-lg bg-info/15 text-info hover:bg-info/25 transition-colors" title="Enviar para Asaas"><Send size={13} /></button>
                    )}
                    {s.status === "Processando" && (
                      <button onClick={() => setConfirmAction({ saque: s, action: "pay" })} className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors" title="Marcar como pago"><DollarSign size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhe — {detailOpen?.id}</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Nome</span><p className="font-medium">{detailOpen.nome}</p></div>
                <div><span className="text-xs text-muted-foreground">Tipo</span><p><span className={detailOpen.tipo === "Influencer" ? "badge-info" : "badge-primary"}>{detailOpen.tipo}</span></p></div>
                <div><span className="text-xs text-muted-foreground">Valor Solicitado</span><p className="font-bold text-lg">R$ {detailOpen.valor.toLocaleString()}</p></div>
                <div><span className="text-xs text-muted-foreground">Saldo Disponível</span><p className="font-bold">R$ {detailOpen.saldoDisponivel.toLocaleString()}</p></div>
                <div><span className="text-xs text-muted-foreground">Conta Destino</span><p className="font-mono">{detailOpen.conta}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p><span className={statusBadge(detailOpen.status)}>{detailOpen.status}</span></p></div>
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase">Composição do Valor</h4>
                <p className="text-sm">{detailOpen.composicao}</p>
                <h4 className="text-xs font-medium text-muted-foreground uppercase">Origem do Saldo</h4>
                <p className="text-sm">{detailOpen.origemSaldo}</p>
                {detailOpen.observacoes && (
                  <>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">Observações</h4>
                    <p className="text-sm">{detailOpen.observacoes}</p>
                  </>
                )}
              </div>
              <div className="border-t border-border pt-3 grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-muted-foreground">Solicitação</span><p>{detailOpen.data}</p></div>
                <div><span className="text-muted-foreground">Aprovação</span><p>{detailOpen.dataAprovacao || "—"}</p></div>
                <div><span className="text-muted-foreground">Pagamento</span><p>{detailOpen.dataPagamento || "—"}</p></div>
              </div>
              <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                <p>🔗 Integração Asaas: preparada para conexão futura</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {detailOpen?.status === "Pendente" && (
              <>
                <button className="btn-primary bg-success hover:bg-success/90" onClick={() => { setConfirmAction({ saque: detailOpen, action: "approve" }); setDetailOpen(null); }}>Aprovar</button>
                <button className="btn-primary bg-destructive hover:bg-destructive/90" onClick={() => { setConfirmAction({ saque: detailOpen, action: "reject" }); setDetailOpen(null); }}>Recusar</button>
              </>
            )}
            {detailOpen?.status === "Aprovado" && (
              <button className="btn-primary" onClick={() => { setConfirmAction({ saque: detailOpen, action: "process" }); setDetailOpen(null); }}>Enviar para Asaas</button>
            )}
            {detailOpen?.status === "Processando" && (
              <button className="btn-primary" onClick={() => { setConfirmAction({ saque: detailOpen, action: "pay" }); setDetailOpen(null); }}>Marcar como Pago</button>
            )}
            <button className="btn-ghost" onClick={() => setDetailOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>
            {confirmAction?.action === "approve" ? "Aprovar Saque" : confirmAction?.action === "reject" ? "Recusar Saque" : confirmAction?.action === "process" ? "Enviar para Asaas" : "Marcar como Pago"}
          </DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirmar ação para <strong>{confirmAction?.saque.nome}</strong> — R$ {confirmAction?.saque.valor.toLocaleString()}?
          </p>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setConfirmAction(null)}>Cancelar</button>
            <button className={`btn-primary ${confirmAction?.action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}`} onClick={handleAction}>Confirmar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
