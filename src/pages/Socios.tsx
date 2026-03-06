import { useState } from "react";
import { Plus, Edit, ArrowRight, DollarSign, Wallet, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialSocios } from "@/data/mockData";
import type { Socio } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

const historicoGeral = [
  { data: "05/03/2026", ref: "FIN-001", baseSocietaria: 3240, status: "Confirmado" },
  { data: "04/03/2026", ref: "FIN-002", baseSocietaria: 2448, status: "Confirmado" },
  { data: "03/03/2026", ref: "FIN-003", baseSocietaria: 2218, status: "Pendente" },
  { data: "02/03/2026", ref: "FIN-004", baseSocietaria: 3764, status: "Confirmado" },
  { data: "01/03/2026", ref: "FIN-005", baseSocietaria: 4464, status: "Pendente" },
  { data: "28/02/2026", ref: "FIN-006", baseSocietaria: 1539, status: "Conciliado" },
  { data: "27/02/2026", ref: "FIN-007", baseSocietaria: 2804, status: "Conciliado" },
];

export default function Socios() {
  const navigate = useNavigate();
  const [data, setData] = useState<Socio[]>(initialSocios);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Socio> | null>(null);

  const totalBase = historicoGeral.reduce((a, b) => a + b.baseSocietaria, 0);
  const totalDisponivel = data.reduce((a, b) => a + b.disponivel, 0);
  const totalGanhos = data.reduce((a, b) => a + b.ganhos, 0);
  const totalSacado = totalGanhos - totalDisponivel;

  const openCreate = () => { setEditing({ id: 0, nome: "", part: 0, ganhos: 0, disponivel: 0, ultimoSaque: "—", status: "Ativo" }); setModalOpen(true); };
  const openEdit = (s: Socio) => { setEditing({ ...s }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(s => s.id === editing.id ? { ...s, ...editing } as Socio : s));
      toast({ title: "Sócio atualizado" });
    } else {
      const newId = Math.max(...data.map(s => s.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as Socio]);
      toast({ title: "Sócio adicionado" });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Gestão de Pessoas", path: "/socios" }, { label: "Sócios" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sócios</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão societária — participação, ganhos e distribuição</p>
        </div>
        <div className="flex gap-2">
          <ExportDropdown data={data.map(({ id, nome, part, ganhos, disponivel, ultimoSaque, status }) => ({ id, nome, part, ganhos, disponivel, ultimoSaque, status }))} filename="socios-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Sócio</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-6 border-l-2 border-l-primary cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => navigate("/financeiro")}>
          <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Base Societária Acum.</span><DollarSign size={14} className="text-muted-foreground" /></div>
          <p className="text-2xl font-bold">R$ {totalBase.toLocaleString()}</p>
        </div>
        <div className="glass-card p-6 border-l-2 border-l-accent">
          <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Ganhos</span><TrendingUp size={14} className="text-muted-foreground" /></div>
          <p className="text-2xl font-bold">R$ {totalGanhos.toLocaleString()}</p>
        </div>
        <div className="glass-card p-6 border-l-2 border-l-success">
          <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Disponível</span><Wallet size={14} className="text-muted-foreground" /></div>
          <p className="text-2xl font-bold text-success">R$ {totalDisponivel.toLocaleString()}</p>
        </div>
        <div className="glass-card p-6 border-l-2 border-l-info cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => navigate("/saques")}>
          <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Sacado</span><DollarSign size={14} className="text-muted-foreground" /></div>
          <p className="text-2xl font-bold">R$ {totalSacado.toLocaleString()}</p>
        </div>
      </div>

      {/* Individual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map(s => {
          const sacado = s.ganhos - s.disponivel;
          return (
            <div key={s.id} className="glass-card p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-accent">{s.nome.charAt(0)}</div>
                  <div>
                    <p className="font-semibold">{s.nome}</p>
                    <span className="badge-primary">{s.part}% participação</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Edit size={13} /></button>
                  <button onClick={() => navigate(`/socios/${s.id}`)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><ArrowRight size={13} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-[10px] text-muted-foreground uppercase">Ganhos Acumulados</p><p className="font-bold">R$ {s.ganhos.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Saldo Disponível</p><p className="font-bold text-success">R$ {s.disponivel.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Já Sacado</p><p className="font-bold">R$ {sacado.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Último Saque</p><p className="text-xs">{s.ultimoSaque}</p></div>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="badge-success">{s.status}</span>
                <div className="flex gap-2">
                  <button onClick={() => navigate("/saques")} className="btn-ghost text-xs py-1 px-2">Saques</button>
                  <button onClick={() => navigate("/comissoes")} className="btn-ghost text-xs py-1 px-2">Comissões</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Table */}
      <div className="glass-card p-5">
        <h3 className="section-title">Histórico de Distribuição Societária</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Data</th><th>Referência</th><th>Base Societária</th>{data.map(s => <th key={s.id}>{s.nome.split(" ")[0]} ({s.part}%)</th>)}<th>Status</th></tr></thead>
            <tbody>
              {historicoGeral.map((h, i) => (
                <tr key={i}>
                  <td className="text-xs">{h.data}</td>
                  <td className="font-mono text-xs text-muted-foreground">{h.ref}</td>
                  <td className="font-medium">R$ {h.baseSocietaria.toLocaleString()}</td>
                  {data.map(s => {
                    const val = Math.round(h.baseSocietaria / data.length);
                    return <td key={s.id} className="text-success">R$ {val.toLocaleString()}</td>;
                  })}
                  <td><span className={h.status === "Confirmado" ? "badge-success" : h.status === "Conciliado" ? "badge-primary" : "badge-warning"}>{h.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Sócio" : "Adicionar Sócio"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Participação %</label><input type="number" className="input-field mt-1" value={editing?.part || 0} onChange={e => setEditing(p => ({ ...p, part: Number(e.target.value) }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="select-field mt-1 w-full" value={editing?.status || "Ativo"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as Socio["status"] }))}>
                <option>Ativo</option><option>Inativo</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
