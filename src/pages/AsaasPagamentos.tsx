import { useState } from "react";
import { CreditCard, CheckCircle, Clock, XCircle, Send, Eye, RefreshCw, DollarSign, AlertTriangle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

type PgtoStatus = "Pronto para envio" | "Processando" | "Realizado" | "Falhado";

interface Pagamento {
  id: string;
  dest: string;
  tipo: "Influencer" | "Sócio";
  valor: number;
  metodo: "PIX" | "TED";
  data: string;
  status: PgtoStatus;
  origem: string;
  referencia: string;
  payload: string;
  ultimaTentativa: string;
  statusIntegracao: "Sucesso" | "Erro" | "Aguardando" | "Não enviado";
}

const initialPagamentos: Pagamento[] = [
  { id: "PGT-001", dest: "Rafael Mendes", tipo: "Influencer", valor: 6200, metodo: "PIX", data: "03/03/2026", status: "Realizado", origem: "SAQ-003", referencia: "asaas_tx_001", payload: '{"amount":6200,"method":"PIX","key":"***4521"}', ultimaTentativa: "03/03/2026 14:32", statusIntegracao: "Sucesso" },
  { id: "PGT-002", dest: "Ricardo Almeida", tipo: "Sócio", valor: 15000, metodo: "TED", data: "01/03/2026", status: "Realizado", origem: "SAQ-002", referencia: "asaas_tx_002", payload: '{"amount":15000,"method":"TED","bank":"341"}', ultimaTentativa: "01/03/2026 10:15", statusIntegracao: "Sucesso" },
  { id: "PGT-003", dest: "Ana Souza", tipo: "Influencer", valor: 1800, metodo: "PIX", data: "28/02/2026", status: "Realizado", origem: "SAQ-006", referencia: "asaas_tx_003", payload: '{"amount":1800,"method":"PIX","key":"***1199"}', ultimaTentativa: "28/02/2026 16:45", statusIntegracao: "Sucesso" },
  { id: "PGT-004", dest: "Carlos Silva", tipo: "Influencer", valor: 3500, metodo: "PIX", data: "25/02/2026", status: "Pronto para envio", origem: "SAQ-006", referencia: "—", payload: '{"amount":3500,"method":"PIX","key":"***3388"}', ultimaTentativa: "—", statusIntegracao: "Não enviado" },
  { id: "PGT-005", dest: "Fernanda Rocha", tipo: "Sócio", valor: 10500, metodo: "TED", data: "20/02/2026", status: "Falhado", origem: "SAQ-004", referencia: "asaas_tx_err_001", payload: '{"amount":10500,"method":"TED","bank":"237"}', ultimaTentativa: "20/02/2026 09:30", statusIntegracao: "Erro" },
  { id: "PGT-006", dest: "Pedro Lima", tipo: "Influencer", valor: 4800, metodo: "PIX", data: "18/02/2026", status: "Processando", origem: "SAQ-005", referencia: "asaas_tx_004", payload: '{"amount":4800,"method":"PIX","key":"***2266"}', ultimaTentativa: "18/02/2026 11:00", statusIntegracao: "Aguardando" },
];

export default function AsaasPagamentos() {
  const navigate = useNavigate();
  const [data, setData] = useState(initialPagamentos);
  const [tab, setTab] = useState<PgtoStatus | "todos">("todos");
  const [detailOpen, setDetailOpen] = useState<Pagamento | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ pgto: Pagamento; action: "send" | "reprocess" | "complete" } | null>(null);

  const filtered = tab === "todos" ? data : data.filter(p => p.status === tab);

  const byStatus = (s: PgtoStatus) => data.filter(p => p.status === s);
  const sumBy = (arr: Pagamento[]) => arr.reduce((a, b) => a + b.valor, 0);

  const stats = [
    { label: "Saldo Asaas", value: "R$ 38.200", icon: CreditCard, variant: "border-l-accent" },
    { label: "Prontos p/ Envio", value: byStatus("Pronto para envio").length, total: sumBy(byStatus("Pronto para envio")), icon: Send, variant: "border-l-warning" },
    { label: "Processando", value: byStatus("Processando").length, total: sumBy(byStatus("Processando")), icon: Clock, variant: "border-l-info" },
    { label: "Realizados", value: byStatus("Realizado").length, total: sumBy(byStatus("Realizado")), icon: CheckCircle, variant: "border-l-success" },
    { label: "Falhados", value: byStatus("Falhado").length, total: sumBy(byStatus("Falhado")), icon: XCircle, variant: "border-l-destructive" },
  ];

  const handleAction = () => {
    if (!confirmAction) return;
    const { pgto, action } = confirmAction;
    const now = new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    let updated: Partial<Pagamento> = {};
    let msg = "";
    if (action === "send") { updated = { status: "Processando", statusIntegracao: "Aguardando", ultimaTentativa: now, referencia: `asaas_tx_${Date.now().toString(36)}` }; msg = "Enviado para Asaas"; }
    if (action === "reprocess") { updated = { status: "Processando", statusIntegracao: "Aguardando", ultimaTentativa: now }; msg = "Reprocessando pagamento"; }
    if (action === "complete") { updated = { status: "Realizado", statusIntegracao: "Sucesso", ultimaTentativa: now }; msg = "Marcado como concluído"; }
    setData(prev => prev.map(p => p.id === pgto.id ? { ...p, ...updated } as Pagamento : p));
    toast({ title: msg, description: `${pgto.dest} — R$ ${pgto.valor.toLocaleString()}` });
    setConfirmAction(null);
  };

  const statusBadge = (s: PgtoStatus) => {
    const map: Record<PgtoStatus, string> = { "Pronto para envio": "badge-warning", "Processando": "badge-info", "Realizado": "badge-success", "Falhado": "badge-danger" };
    return map[s];
  };

  const intBadge = (s: Pagamento["statusIntegracao"]) => {
    const map = { "Sucesso": "badge-success", "Erro": "badge-danger", "Aguardando": "badge-info", "Não enviado": "badge-neutral" };
    return map[s];
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Receita", path: "/financeiro" }, { label: "Asaas / Pagamentos" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Asaas / Pagamentos</h1>
          <p className="page-subtitle">Central de pagamentos — envio, processamento e conciliação via Asaas</p>
        </div>
        <ExportDropdown data={data.map(({ payload, ...rest }) => rest)} filename="asaas-pagamentos-playbet" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <div key={s.label} className={`stat-card border-l-2 ${s.variant}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
              <s.icon size={14} className="text-muted-foreground" />
            </div>
            <div className="text-lg font-bold">{i === 0 ? s.value : s.value}</div>
            {i > 0 && <span className="text-xs text-muted-foreground">R$ {(s.total as number).toLocaleString()}</span>}
          </div>
        ))}
      </div>

      {/* Integration Banner */}
      <div className="glass-card p-5 border border-dashed border-primary/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><CreditCard size={18} className="text-primary" /></div>
          <div className="flex-1">
            <p className="font-medium text-sm">Integração com API Asaas</p>
            <p className="text-xs text-muted-foreground">Estrutura preparada para conexão com a API de pagamentos. Payloads e status de integração já são rastreados.</p>
          </div>
          <button className="btn-ghost text-xs" onClick={() => navigate("/integracoes")}>Configurar</button>
        </div>
      </div>

      {/* Alerts */}
      {byStatus("Falhado").length > 0 && (
        <div className="glass-card p-4 border-destructive/30">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className="text-destructive" /><span className="text-sm font-medium text-destructive">Pagamentos com Falha</span></div>
          {byStatus("Falhado").map(p => (
            <div key={p.id} className="flex items-center justify-between py-1">
              <span className="text-xs">{p.dest} — R$ {p.valor.toLocaleString()} — Última tentativa: {p.ultimaTentativa}</span>
              <button onClick={() => setConfirmAction({ pgto: p, action: "reprocess" })} className="btn-ghost text-xs py-1 px-2">Reprocessar</button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Table */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit flex-wrap">
        {[{ key: "todos", label: "Todos" }, { key: "Pronto para envio", label: "Prontos" }, { key: "Processando", label: "Processando" }, { key: "Realizado", label: "Realizados" }, { key: "Falhado", label: "Falhados" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as PgtoStatus | "todos")} className={tab === t.key ? "tab-btn-active" : "tab-btn"}>{t.label}</button>
        ))}
      </div>

      <div className="glass-card overflow-x-auto invisible-scroll animate-fade-in">
        <table className="data-table">
          <thead><tr><th>ID</th><th>Destinatário</th><th>Tipo</th><th>Valor</th><th>Método</th><th>Data</th><th>Status</th><th>Origem</th><th>Integração</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center text-muted-foreground py-8">Nenhum pagamento encontrado</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td className="font-mono text-xs text-muted-foreground">{p.id}</td>
                <td className="font-medium">{p.dest}</td>
                <td><span className={p.tipo === "Influencer" ? "badge-info" : "badge-primary"}>{p.tipo}</span></td>
                <td className="font-semibold">R$ {p.valor.toLocaleString()}</td>
                <td>{p.metodo}</td>
                <td className="text-xs text-muted-foreground whitespace-nowrap">{p.data}</td>
                <td><span className={statusBadge(p.status)}>{p.status}</span></td>
                <td className="font-mono text-xs text-muted-foreground">{p.origem}</td>
                <td><span className={intBadge(p.statusIntegracao)}>{p.statusIntegracao}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => setDetailOpen(p)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Eye size={13} /></button>
                    {p.status === "Pronto para envio" && (
                      <button onClick={() => setConfirmAction({ pgto: p, action: "send" })} className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors" title="Enviar para Asaas"><Send size={13} /></button>
                    )}
                    {p.status === "Falhado" && (
                      <button onClick={() => setConfirmAction({ pgto: p, action: "reprocess" })} className="p-1.5 rounded-lg bg-warning/15 text-warning hover:bg-warning/25 transition-colors" title="Reprocessar"><RefreshCw size={13} /></button>
                    )}
                    {p.status === "Processando" && (
                      <button onClick={() => setConfirmAction({ pgto: p, action: "complete" })} className="p-1.5 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors" title="Marcar como concluído"><CheckCircle size={13} /></button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhe — {detailOpen?.id}</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Destinatário</span><p className="font-medium">{detailOpen.dest}</p></div>
                <div><span className="text-xs text-muted-foreground">Tipo</span><p><span className={detailOpen.tipo === "Influencer" ? "badge-info" : "badge-primary"}>{detailOpen.tipo}</span></p></div>
                <div><span className="text-xs text-muted-foreground">Valor</span><p className="font-bold text-lg">R$ {detailOpen.valor.toLocaleString()}</p></div>
                <div><span className="text-xs text-muted-foreground">Método</span><p>{detailOpen.metodo}</p></div>
                <div><span className="text-xs text-muted-foreground">Status Pagamento</span><p><span className={statusBadge(detailOpen.status)}>{detailOpen.status}</span></p></div>
                <div><span className="text-xs text-muted-foreground">Status Integração</span><p><span className={intBadge(detailOpen.statusIntegracao)}>{detailOpen.statusIntegracao}</span></p></div>
              </div>
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Detalhe de Integração</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">ID Interno</span><p className="font-mono">{detailOpen.id}</p></div>
                  <div><span className="text-muted-foreground">Referência Asaas</span><p className="font-mono">{detailOpen.referencia}</p></div>
                  <div><span className="text-muted-foreground">Origem (Saque)</span><p className="font-mono">{detailOpen.origem}</p></div>
                  <div><span className="text-muted-foreground">Última Tentativa</span><p>{detailOpen.ultimaTentativa}</p></div>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Payload de Pagamento</h4>
                <pre className="bg-secondary/50 rounded-lg p-3 text-xs font-mono overflow-x-auto">{JSON.stringify(JSON.parse(detailOpen.payload), null, 2)}</pre>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {detailOpen?.status === "Pronto para envio" && <button className="btn-primary" onClick={() => { setConfirmAction({ pgto: detailOpen, action: "send" }); setDetailOpen(null); }}>Enviar para Asaas</button>}
            {detailOpen?.status === "Falhado" && <button className="btn-primary" onClick={() => { setConfirmAction({ pgto: detailOpen, action: "reprocess" }); setDetailOpen(null); }}>Reprocessar</button>}
            {detailOpen?.status === "Processando" && <button className="btn-primary" onClick={() => { setConfirmAction({ pgto: detailOpen, action: "complete" }); setDetailOpen(null); }}>Marcar como Concluído</button>}
            <button className="btn-ghost" onClick={() => setDetailOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>
            {confirmAction?.action === "send" ? "Enviar para Asaas" : confirmAction?.action === "reprocess" ? "Reprocessar Pagamento" : "Marcar como Concluído"}
          </DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Confirmar ação para <strong>{confirmAction?.pgto.dest}</strong> — R$ {confirmAction?.pgto.valor.toLocaleString()}?</p>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setConfirmAction(null)}>Cancelar</button>
            <button className="btn-primary" onClick={handleAction}>Confirmar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
