import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Edit, Eye, AlertTriangle, ExternalLink, Clock, User, Plus } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Regra {
  id: number; nome: string; categoria: string; valor: string; escopo: string;
  status: "Ativa" | "Inativa" | "Em revisão"; ultimaAlteracao: string; alteradoPor: string;
  descricao: string; impacto: string; historico: { data: string; acao: string; por: string }[];
}

const initialRegras: Regra[] = [
  { id: 1, nome: "Taxa Operacional Padrão", categoria: "Operacional", valor: "10%", escopo: "Global", status: "Ativa", ultimaAlteracao: "03/03/2026", alteradoPor: "Admin", descricao: "Percentual fixo retido sobre a receita bruta antes da divisão societária.", impacto: "Aplicado a toda receita bruta. Afeta cálculo de comissão e divisão societária.", historico: [{ data: "03/03/2026", acao: "Alterado de 8% para 10%", por: "Admin" }, { data: "01/01/2026", acao: "Criado com valor 8%", por: "Admin" }] },
  { id: 2, nome: "Divisão Societária", categoria: "Societária", valor: "Proporcional (40/35/25)", escopo: "Sócios", status: "Ativa", ultimaAlteracao: "01/01/2026", alteradoPor: "Admin", descricao: "Base societária dividida proporcionalmente entre os sócios.", impacto: "Ricardo: 40%, Fernanda: 35%, Lucas: 25%.", historico: [{ data: "01/01/2026", acao: "Criado com divisão 40/35/25", por: "Admin" }] },
  { id: 3, nome: "Comissão Starter", categoria: "Comissão", valor: "10%", escopo: "Influencers até 100K seg", status: "Ativa", ultimaAlteracao: "15/01/2026", alteradoPor: "Admin", descricao: "Comissão sobre receita bruta para influencers no tier Starter.", impacto: "Aplicado a Julia C. e novos influencers.", historico: [{ data: "15/01/2026", acao: "Criado com valor 10%", por: "Admin" }] },
  { id: 4, nome: "Comissão Standard", categoria: "Comissão", valor: "12-15%", escopo: "Influencers 100K-300K seg", status: "Ativa", ultimaAlteracao: "15/01/2026", alteradoPor: "Admin", descricao: "Faixa de comissão para influencers no tier Standard.", impacto: "Aplicado a Carlos S. (15%) e Ana S. (12%).", historico: [{ data: "15/01/2026", acao: "Criado com faixa 12-15%", por: "Admin" }] },
  { id: 5, nome: "Comissão Premium", categoria: "Comissão", valor: "18-22%", escopo: "Influencers 300K+ seg", status: "Ativa", ultimaAlteracao: "04/03/2026", alteradoPor: "Admin", descricao: "Faixa de comissão para influencers no tier Premium.", impacto: "Aplicado a Rafael M. (20%), Pedro L. (18%), Marcos O. (22%).", historico: [{ data: "04/03/2026", acao: "Pedro L. alterado de 15% para 18%", por: "Admin" }, { data: "15/01/2026", acao: "Criado com faixa 18-22%", por: "Admin" }] },
  { id: 6, nome: "Saque Mínimo", categoria: "Saque", valor: "R$ 100,00", escopo: "Todos", status: "Ativa", ultimaAlteracao: "01/01/2026", alteradoPor: "Admin", descricao: "Valor mínimo permitido para solicitação de saque.", impacto: "Bloqueia saques abaixo de R$ 100.", historico: [{ data: "01/01/2026", acao: "Criado com valor R$ 100", por: "Admin" }] },
  { id: 7, nome: "Aprovação Manual de Saques", categoria: "Saque", valor: "Obrigatória", escopo: "Todos", status: "Ativa", ultimaAlteracao: "01/01/2026", alteradoPor: "Admin", descricao: "Todo saque requer aprovação manual.", impacto: "Adiciona etapa de revisão (até 3 dias úteis).", historico: [{ data: "01/01/2026", acao: "Criado como obrigatória", por: "Admin" }] },
  { id: 8, nome: "Prazo de Processamento", categoria: "Saque", valor: "Até 3 dias úteis", escopo: "Todos", status: "Ativa", ultimaAlteracao: "01/01/2026", alteradoPor: "Admin", descricao: "Prazo máximo para processamento de saques.", impacto: "Define SLA para pagamentos.", historico: [{ data: "01/01/2026", acao: "Criado com prazo de 3 dias úteis", por: "Admin" }] },
  { id: 9, nome: "Métodos de Pagamento", categoria: "Saque", valor: "PIX e TED", escopo: "Todos", status: "Ativa", ultimaAlteracao: "01/01/2026", alteradoPor: "Admin", descricao: "Métodos de pagamento aceitos para saques.", impacto: "PIX processado em minutos. TED até 1 dia útil.", historico: [{ data: "01/01/2026", acao: "Criado com PIX e TED", por: "Admin" }] },
  { id: 10, nome: "Bloqueio por Divergência", categoria: "Conciliação", valor: "Automático", escopo: "Financeiro", status: "Em revisão", ultimaAlteracao: "02/03/2026", alteradoPor: "Admin", descricao: "Bloqueia saque automaticamente se há divergência.", impacto: "Requer revisão manual para liberação.", historico: [{ data: "02/03/2026", acao: "Status alterado para 'Em revisão'", por: "Admin" }, { data: "01/02/2026", acao: "Criado como Automático", por: "Admin" }] },
];

const alerts = [
  { msg: "Regra 'Bloqueio por Divergência' em revisão — sem responsável definido", type: "warning" },
  { msg: "Taxa operacional alterada recentemente (8% → 10%) — verificar impacto", type: "warning" },
  { msg: "Comissão de Pedro L. alterada fora do fluxo padrão de aprovação", type: "danger" },
];

export default function RegrasFinanceiras() {
  const navigate = useNavigate();
  const [data, setData] = useState(initialRegras);
  const [detail, setDetail] = useState<Regra | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Regra> | null>(null);
  const [filterCat, setFilterCat] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");

  const categorias = [...new Set(data.map(r => r.categoria))];
  const filtered = data.filter(r => {
    if (filterCat !== "Todas" && r.categoria !== filterCat) return false;
    if (filterStatus !== "Todos" && r.status !== filterStatus) return false;
    return true;
  });

  const openCreate = () => {
    setEditing({ id: 0, nome: "", categoria: "Operacional", valor: "", escopo: "", status: "Ativa", descricao: "", impacto: "", ultimaAlteracao: "", alteradoPor: "Admin", historico: [] });
    setModalOpen(true);
  };

  const openEdit = (r: Regra) => {
    setEditing({ ...r });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!editing?.nome || !editing?.valor) {
      toast.error("Nome e valor são obrigatórios.");
      return;
    }
    const now = new Date().toLocaleDateString("pt-BR");
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(r => r.id === editing.id ? {
        ...r, ...editing,
        ultimaAlteracao: now,
        historico: [{ data: now, acao: `Editado — valor: ${editing.valor}`, por: "Admin" }, ...r.historico],
      } as Regra : r));
      toast.success(`Regra "${editing.nome}" atualizada`);
    } else {
      const newRegra: Regra = {
        ...editing as Regra,
        id: Date.now(),
        ultimaAlteracao: now,
        alteradoPor: "Admin",
        historico: [{ data: now, acao: `Criado com valor ${editing.valor}`, por: "Admin" }],
      };
      setData(prev => [...prev, newRegra]);
      toast.success(`Regra "${editing.nome}" criada`);
    }
    setModalOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Regras Financeiras" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Regras Financeiras</h1>
          <p className="text-sm text-muted-foreground mt-1">Motor de regras — comissões, saques, conciliação e parâmetros operacionais</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary text-xs" onClick={openCreate}><Plus size={13} />Criar Regra</button>
          <button className="btn-ghost text-xs" onClick={() => navigate("/financeiro")}>Ver Financeiro</button>
          <button className="btn-ghost text-xs" onClick={() => navigate("/comissoes")}>Ver Comissões</button>
        </div>
      </div>

      {/* Fluxo de Cálculo */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-5">Fluxo de Cálculo Padrão</h3>
        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: "Receita Bruta", desc: "100%" },
            { label: "- % Influencer", desc: "Variável (10-22%)" },
            { label: "- 10% Operacional", desc: "Fixo" },
            { label: "= Base Societária", desc: "Divisão proporcional" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {i > 0 && <span className="text-muted-foreground text-xs">→</span>}
              <div className="glass-card-elevated px-5 py-4 rounded-lg text-center min-w-[160px]">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                <p className="font-semibold text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`glass-card p-4 flex items-center gap-3 border-l-2 ${a.type === "danger" ? "border-l-destructive" : "border-l-warning"}`}>
              <AlertTriangle size={14} className={a.type === "danger" ? "text-destructive" : "text-warning"} />
              <span className="text-sm">{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="select-field text-xs w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="Todas">Categoria: Todas</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="Todos">Status: Todos</option>
          <option value="Ativa">Ativa</option><option value="Inativa">Inativa</option><option value="Em revisão">Em revisão</option>
        </select>
      </div>

      {/* Rules Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead>
            <tr><th>Regra</th><th>Categoria</th><th>Valor</th><th>Escopo</th><th>Status</th><th>Última Alteração</th><th>Alterado por</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td className="font-medium">{r.nome}</td>
                <td><span className="badge-neutral">{r.categoria}</span></td>
                <td className="font-semibold text-sm">{r.valor}</td>
                <td className="text-xs text-muted-foreground">{r.escopo}</td>
                <td><span className={r.status === "Ativa" ? "badge-success" : r.status === "Inativa" ? "badge-danger" : "badge-warning"}>{r.status}</span></td>
                <td className="text-xs text-muted-foreground whitespace-nowrap"><span className="inline-flex items-center gap-1"><Clock size={11} />{r.ultimaAlteracao}</span></td>
                <td className="text-xs"><span className="inline-flex items-center gap-1"><User size={11} className="text-muted-foreground" />{r.alteradoPor}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDetail(r)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Ver detalhe"><Eye size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Editar"><Edit size={13} className="text-muted-foreground" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Regra" : "Criar Regra"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto invisible-scroll">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <select className="select-field mt-1 w-full" value={editing?.categoria || ""} onChange={e => setEditing(p => ({ ...p, categoria: e.target.value }))}>
                  <option>Operacional</option><option>Societária</option><option>Comissão</option><option>Saque</option><option>Conciliação</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.status || "Ativa"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as Regra["status"] }))}>
                  <option>Ativa</option><option>Inativa</option><option>Em revisão</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Valor *</label><input className="input-field mt-1" value={editing?.valor || ""} onChange={e => setEditing(p => ({ ...p, valor: e.target.value }))} placeholder="ex: 10%" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Escopo</label><input className="input-field mt-1" value={editing?.escopo || ""} onChange={e => setEditing(p => ({ ...p, escopo: e.target.value }))} placeholder="ex: Global" /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Descrição</label><textarea className="input-field mt-1 min-h-[60px]" value={editing?.descricao || ""} onChange={e => setEditing(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Impacto</label><textarea className="input-field mt-1 min-h-[60px]" value={editing?.impacto || ""} onChange={e => setEditing(p => ({ ...p, impacto: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Scale size={16} /> {detail?.nome}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto invisible-scroll">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { l: "Categoria", v: detail.categoria }, { l: "Valor", v: detail.valor }, { l: "Escopo", v: detail.escopo },
                  { l: "Status", v: detail.status }, { l: "Última Alteração", v: detail.ultimaAlteracao }, { l: "Alterado por", v: detail.alteradoPor },
                ].map(f => (
                  <div key={f.l}>
                    <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">{f.l}</p>
                    <p className="text-sm font-medium">{f.v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm">{detail.descricao}</p>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Impacto</p>
                <div className="bg-warning/5 border border-border rounded-md p-3 text-sm">{detail.impacto}</div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3">Histórico</h4>
                <div className="space-y-2">
                  {detail.historico.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 glass-card-elevated px-4 py-3 rounded-md">
                      <span className="text-[11px] text-muted-foreground font-mono w-24 shrink-0">{h.data}</span>
                      <span className="text-xs flex-1">{h.acao}</span>
                      <span className="text-xs text-muted-foreground">{h.por}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <button className="btn-ghost text-xs" onClick={() => { setDetail(null); openEdit(detail); }}>Editar <Edit size={11} /></button>
                <button className="btn-ghost text-xs" onClick={() => { setDetail(null); navigate("/financeiro"); }}>Ver Financeiro <ExternalLink size={11} /></button>
                <button className="btn-ghost text-xs" onClick={() => { setDetail(null); navigate("/comissoes"); }}>Ver Comissões <ExternalLink size={11} /></button>
                <button className="btn-ghost text-xs" onClick={() => { setDetail(null); navigate("/saques"); }}>Ver Saques <ExternalLink size={11} /></button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
