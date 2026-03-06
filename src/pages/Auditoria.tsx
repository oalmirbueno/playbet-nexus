import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Search } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const logs = [
  { id: 1, data: "05/03/2026 14:32", usuario: "Admin", perfil: "Super Admin", modulo: "Saques", acao: "Saque solicitado", item: "SAQ-001", antes: "—", depois: "Pendente — R$ 8.500", status: "Pendente", origem: "Painel" },
  { id: 2, data: "05/03/2026 13:18", usuario: "Admin", perfil: "Super Admin", modulo: "Links", acao: "Link criado", item: "FT-Bet365-Marcos", antes: "—", depois: "Ativo — Fortune Tiger / Bet365", status: "Sucesso", origem: "Painel" },
  { id: 3, data: "05/03/2026 12:45", usuario: "Admin", perfil: "Super Admin", modulo: "Landing Pages", acao: "LP publicada", item: "Aviator Promo Março", antes: "Rascunho", depois: "Publicada", status: "Sucesso", origem: "Painel" },
  { id: 4, data: "05/03/2026 11:20", usuario: "Admin", perfil: "Super Admin", modulo: "Influencers", acao: "Influencer adicionado", item: "Marcos Oliveira", antes: "—", depois: "Ativo — @marcos.bet — 520K", status: "Sucesso", origem: "Painel" },
  { id: 5, data: "05/03/2026 10:05", usuario: "Admin", perfil: "Super Admin", modulo: "Campanhas", acao: "Campanha ativada", item: "Março Turbo", antes: "Planejada", depois: "Ativa", status: "Sucesso", origem: "Painel" },
  { id: 6, data: "05/03/2026 09:30", usuario: "Admin", perfil: "Super Admin", modulo: "Saques", acao: "Saque aprovado", item: "SAQ-003", antes: "Pendente", depois: "Aprovado — R$ 2.800", status: "Sucesso", origem: "Painel" },
  { id: 7, data: "04/03/2026 18:45", usuario: "Admin", perfil: "Super Admin", modulo: "Influencers", acao: "Percentual alterado", item: "Pedro Lima", antes: "15%", depois: "18%", status: "Sucesso", origem: "Painel" },
  { id: 8, data: "04/03/2026 16:20", usuario: "Admin", perfil: "Super Admin", modulo: "Jogos", acao: "Jogo cadastrado", item: "Spaceman", antes: "—", depois: "Ativo — Crash — Pixbet", status: "Sucesso", origem: "Painel" },
  { id: 9, data: "04/03/2026 14:10", usuario: "Admin", perfil: "Super Admin", modulo: "Landing Pages", acao: "LP vinculada", item: "Mines Special", antes: "Sem vínculo", depois: "Sportingbet", status: "Sucesso", origem: "Painel" },
  { id: 10, data: "04/03/2026 10:00", usuario: "Maria", perfil: "Financeiro", modulo: "Financeiro", acao: "Relatório exportado", item: "Relatório Fev 2026", antes: "—", depois: "CSV exportado", status: "Sucesso", origem: "Painel" },
  { id: 11, data: "03/03/2026 16:30", usuario: "Admin", perfil: "Super Admin", modulo: "Regras Financeiras", acao: "Regra atualizada", item: "Taxa Operacional", antes: "8%", depois: "10%", status: "Sucesso", origem: "Painel" },
  { id: 12, data: "03/03/2026 14:00", usuario: "Admin", perfil: "Super Admin", modulo: "Plataformas", acao: "Plataforma editada", item: "Pixbet", antes: "Status: Ativo", depois: "Status: Pendente", status: "Sucesso", origem: "API" },
];

const moduleRoutes: Record<string, string> = {
  Saques: "/saques", Links: "/links", "Landing Pages": "/landing-pages", Influencers: "/influencers",
  Campanhas: "/campanhas", Jogos: "/jogos", Financeiro: "/financeiro", "Regras Financeiras": "/regras", Plataformas: "/plataformas",
};

export default function Auditoria() {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<typeof logs[0] | null>(null);
  const [filterModulo, setFilterModulo] = useState("Todos");
  const [filterUsuario, setFilterUsuario] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterPeriodo] = useState("Últimos 7 dias");
  const [search, setSearch] = useState("");

  const filtered = logs.filter(l => {
    if (filterModulo !== "Todos" && l.modulo !== filterModulo) return false;
    if (filterUsuario !== "Todos" && l.usuario !== filterUsuario) return false;
    if (filterStatus !== "Todos" && l.status !== filterStatus) return false;
    if (search && !Object.values(l).some(v => String(v).toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const modulos = [...new Set(logs.map(l => l.modulo))];
  const usuarios = [...new Set(logs.map(l => l.usuario))];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Auditoria" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
          <p className="text-sm text-muted-foreground mt-1">Log operacional completo — rastreio de ações, alterações e responsáveis</p>
        </div>
        <ExportDropdown data={logs} filename="auditoria" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="input-field pl-9 w-64" placeholder="Buscar ação, item, usuário..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select-field text-xs w-auto" value={filterModulo} onChange={e => setFilterModulo(e.target.value)}>
          <option value="Todos">Módulo: Todos</option>
          {modulos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterUsuario} onChange={e => setFilterUsuario(e.target.value)}>
          <option value="Todos">Usuário: Todos</option>
          {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="Todos">Status: Todos</option>
          <option value="Sucesso">Sucesso</option><option value="Pendente">Pendente</option>
        </select>
        <select className="select-field text-xs w-auto"><option>Período: {filterPeriodo}</option></select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Data/Hora</th><th>Usuário</th><th>Perfil</th><th>Módulo</th><th>Ação</th><th>Item Afetado</th><th>Antes</th><th>Depois</th><th>Origem</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="cursor-pointer" onClick={() => setDetail(l)}>
                <td className="whitespace-nowrap text-xs text-muted-foreground font-mono">{l.data}</td>
                <td className="text-xs font-medium">{l.usuario}</td>
                <td><span className="badge-neutral">{l.perfil}</span></td>
                <td><span className="badge-primary">{l.modulo}</span></td>
                <td className="font-medium text-sm">{l.acao}</td>
                <td className="text-xs max-w-[180px] truncate">{l.item}</td>
                <td className="text-xs text-muted-foreground max-w-[150px] truncate">{l.antes}</td>
                <td className="text-xs max-w-[200px] truncate">{l.depois}</td>
                <td className="text-xs text-muted-foreground">{l.origem}</td>
                <td><span className={l.status === "Sucesso" ? "badge-success" : "badge-warning"}>{l.status}</span></td>
                <td><ExternalLink size={12} className="text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalhe do Log</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { l: "Data/Hora", v: detail.data }, { l: "Usuário", v: detail.usuario },
                  { l: "Perfil", v: detail.perfil }, { l: "Módulo", v: detail.modulo },
                  { l: "Ação", v: detail.acao }, { l: "Item Afetado", v: detail.item },
                  { l: "Origem", v: detail.origem }, { l: "Status", v: detail.status },
                ].map(f => (
                  <div key={f.l}>
                    <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">{f.l}</p>
                    <p className="text-sm font-medium">{f.v}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Antes</p>
                  <div className="bg-destructive/5 border border-border rounded-md p-3 text-sm">{detail.antes}</div>
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Depois</p>
                  <div className="bg-success/5 border border-border rounded-md p-3 text-sm">{detail.depois}</div>
                </div>
              </div>
              {moduleRoutes[detail.modulo] && (
                <div className="pt-2 border-t border-border">
                  <button className="btn-ghost text-xs" onClick={() => { setDetail(null); navigate(moduleRoutes[detail.modulo]); }}>
                    Ir para {detail.modulo} <ExternalLink size={11} />
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
