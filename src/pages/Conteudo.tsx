import { useState, useMemo } from "react";
import { Plus, LayoutGrid, Table2, CalendarDays, Eye, Copy, Archive, Link2, ChevronLeft, ChevronRight, AlertTriangle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialConteudos, initialCampanhas, initialLandingPages } from "@/data/mockData";
import type { ConteudoItem } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

const statusCols: ConteudoItem["status"][] = ["Ideia", "Roteiro", "Produção", "Revisão", "Agendado", "Publicado", "Pausado"];
const colColors: Record<string, string> = {
  Ideia: "border-t-muted-foreground", Roteiro: "border-t-accent", Produção: "border-t-info",
  Revisão: "border-t-warning", Agendado: "border-t-primary", Publicado: "border-t-success", Pausado: "border-t-destructive",
};
const prioColors: Record<string, string> = { Alta: "badge-danger", Média: "badge-warning", Baixa: "badge-neutral" };
const tipoOptions = ["Story", "Reels", "Post", "Carrossel", "Live", "Vídeo", "Grupo Telegram", "WhatsApp", "Campanha Teaser", "Prova Social", "Lançamento de Jogo"];
const canalOptions = ["Instagram", "TikTok", "YouTube", "Telegram", "WhatsApp", "Twitter/X", "Bio Link"];
const prioOptions: ConteudoItem["prioridade"][] = ["Alta", "Média", "Baixa"];

type ViewMode = "kanban" | "tabela" | "calendario";

export default function Conteudo() {
  const navigate = useNavigate();
  const [data, setData] = useState<ConteudoItem[]>(initialConteudos);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState("Resumo");
  const [selectedItem, setSelectedItem] = useState<ConteudoItem | null>(null);
  const [editing, setEditing] = useState<Partial<ConteudoItem> | null>(null);
  const [view, setView] = useState<ViewMode>("kanban");
  const [filterInfluencer, setFilterInfluencer] = useState("");
  const [filterCanal, setFilterCanal] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJogo, setFilterJogo] = useState("");

  const influencers = useMemo(() => [...new Set(data.map(c => c.influencer))], [data]);
  const canais = useMemo(() => [...new Set(data.map(c => c.canal).filter(Boolean))], [data]);
  const jogos = useMemo(() => [...new Set(data.map(c => c.jogo))], [data]);

  const filtered = useMemo(() => data.filter(c =>
    (!filterInfluencer || c.influencer === filterInfluencer) &&
    (!filterCanal || c.canal === filterCanal) &&
    (!filterStatus || c.status === filterStatus) &&
    (!filterJogo || c.jogo === filterJogo)
  ), [data, filterInfluencer, filterCanal, filterStatus, filterJogo]);

  // KPIs
  const total = data.length;
  const byStatus = (s: string) => data.filter(c => c.status === s).length;
  const byCanal = useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach(c => { if (c.canal) m[c.canal] = (m[c.canal] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [data]);

  // Alerts
  const alerts = useMemo(() => {
    const a: { msg: string; type: string }[] = [];
    data.filter(c => c.status === "Agendado" && !c.cta).forEach(c => a.push({ msg: `"${c.tema}" agendado sem CTA`, type: "warning" }));
    data.filter(c => !c.lp || c.lp === "—").forEach(c => a.push({ msg: `"${c.tema}" sem LP vinculada`, type: "info" }));
    const camps = initialCampanhas.filter(c => c.status === "Ativa");
    camps.forEach(camp => { if (!data.some(c => c.campanha === camp.nome)) a.push({ msg: `Campanha "${camp.nome}" sem conteúdo`, type: "danger" }); });
    return a.slice(0, 5);
  }, [data]);

  const openCreate = (status: ConteudoItem["status"] = "Ideia") => {
    setEditing({ id: 0, tema: "", tipo: "Reels", formato: "Vertical 9:16", canal: "Instagram", jogo: "", influencer: "", campanha: "", lp: "", status, prioridade: "Média", data: "", responsavel: "", cta: "", roteiro: "", objetivo: "", observacoes: "" });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!editing?.tema) { toast({ title: "Erro", description: "Tema é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(c => c.id === editing.id ? { ...c, ...editing } as ConteudoItem : c));
      toast({ title: "Conteúdo atualizado" });
    } else {
      const newId = Math.max(...data.map(c => c.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as ConteudoItem]);
      toast({ title: "Conteúdo criado" });
    }
    setModalOpen(false);
  };

  const moveItem = (item: ConteudoItem, direction: "next" | "prev") => {
    const idx = statusCols.indexOf(item.status);
    const newIdx = direction === "next" ? Math.min(idx + 1, statusCols.length - 1) : Math.max(idx - 1, 0);
    if (idx === newIdx) return;
    setData(prev => prev.map(c => c.id === item.id ? { ...c, status: statusCols[newIdx] } : c));
    toast({ title: `Movido para ${statusCols[newIdx]}` });
  };

  const duplicateItem = (item: ConteudoItem) => {
    const newId = Math.max(...data.map(c => c.id), 0) + 1;
    setData(prev => [...prev, { ...item, id: newId, tema: `${item.tema} (cópia)`, status: "Ideia" as const }]);
    toast({ title: "Conteúdo duplicado" });
  };

  const archiveItem = (item: ConteudoItem) => {
    setData(prev => prev.map(c => c.id === item.id ? { ...c, status: "Pausado" as const } : c));
    toast({ title: "Conteúdo arquivado" });
  };

  const openDetail = (item: ConteudoItem) => { setSelectedItem(item); setDetailTab("Resumo"); setDetailOpen(true); };

  const exportableData = data.map(({ id, tema, tipo, formato, canal, jogo, influencer, campanha, lp, status, prioridade, data: d, responsavel }) => ({ id, tema, tipo, formato, canal, jogo, influencer, campanha, lp, status, prioridade, data: d, responsavel }));

  const detailTabs = ["Resumo", "Estrutura", "Roteiro", "Assets", "Campanha", "Analytics", "Observações"];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/conteudo" }, { label: "Conteúdos" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Conteúdos</h1><p className="page-subtitle">Central editorial — produção, gestão e execução de marketing</p></div>
        <div className="flex gap-2">
          <ExportDropdown data={exportableData} filename="conteudos-playbet" />
          <button className="btn-primary" onClick={() => openCreate()}><Plus size={14} /> Criar Conteúdo</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</span><span className="text-xl font-bold">{total}</span></div>
        <div className="stat-card-accent"><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ideias</span><span className="text-xl font-bold">{byStatus("Ideia")}</span></div>
        <div className="stat-card-info"><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Produção</span><span className="text-xl font-bold">{byStatus("Produção")}</span></div>
        <div className="stat-card-warning"><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Revisão</span><span className="text-xl font-bold">{byStatus("Revisão")}</span></div>
        <div className="stat-card-primary"><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Agendados</span><span className="text-xl font-bold">{byStatus("Agendado")}</span></div>
        <div className="stat-card-success"><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Publicados</span><span className="text-xl font-bold">{byStatus("Publicado")}</span></div>
        {byCanal.slice(0, 2).map(([canal, count]) => (
          <div key={canal} className="stat-card"><span className="text-[10px] text-muted-foreground uppercase tracking-wider">{canal}</span><span className="text-xl font-bold">{count}</span></div>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><AlertTriangle size={12} /> Alertas Operacionais</h3>
          <div className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <span key={i} className={`text-[10px] px-2 py-1 rounded-full ${a.type === "danger" ? "bg-destructive/15 text-destructive" : a.type === "warning" ? "bg-warning/15 text-warning" : "bg-info/15 text-info"}`}>{a.msg}</span>
            ))}
          </div>
        </div>
      )}

      {/* Nav shortcuts + View toggle + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/campanhas")}>→ Campanhas</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/calendario")}>→ Calendário Editorial</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/estrategia")}>→ Estratégia</button>
        <div className="flex-1" />
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          {([["kanban", LayoutGrid], ["tabela", Table2], ["calendario", CalendarDays]] as [ViewMode, any][]).map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)} className={`p-2 rounded-md transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}><Icon size={14} /></button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select className="select-field text-xs w-auto" value={filterInfluencer} onChange={e => setFilterInfluencer(e.target.value)}>
          <option value="">Todos influencers</option>
          {influencers.map(i => <option key={i}>{i}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterCanal} onChange={e => setFilterCanal(e.target.value)}>
          <option value="">Todos canais</option>
          {canais.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterJogo} onChange={e => setFilterJogo(e.target.value)}>
          <option value="">Todos jogos</option>
          {jogos.map(j => <option key={j}>{j}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos status</option>
          {statusCols.map(s => <option key={s}>{s}</option>)}
        </select>
        {(filterInfluencer || filterCanal || filterJogo || filterStatus) && (
          <button className="btn-ghost text-xs" onClick={() => { setFilterInfluencer(""); setFilterCanal(""); setFilterJogo(""); setFilterStatus(""); }}>Limpar filtros</button>
        )}
      </div>

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {statusCols.map(col => {
            const items = filtered.filter(c => c.status === col);
            return (
              <div key={col} className={`kanban-col border-t-2 ${colColors[col]} min-w-[240px]`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">{col}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{items.length}</span>
                    <button onClick={() => openCreate(col)} className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Plus size={12} /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="kanban-item group" onClick={() => openDetail(item)}>
                      <p className="text-xs font-medium mb-1">{item.tema}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="badge-neutral">{item.tipo}</span>
                        {item.canal && <span className="badge-info">{item.canal}</span>}
                        {item.prioridade && <span className={prioColors[item.prioridade] || "badge-neutral"}>{item.prioridade}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="badge-accent">{item.jogo}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{item.influencer} · {item.data}</p>
                      {item.campanha && item.campanha !== "—" && <p className="text-[10px] text-primary mt-0.5">📢 {item.campanha}</p>}
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => moveItem(item, "prev")} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground">←</button>
                        <button onClick={() => moveItem(item, "next")} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground">→</button>
                        <button onClick={() => { setEditing({ ...item }); setModalOpen(true); }} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground">Editar</button>
                        <button onClick={() => duplicateItem(item)} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground">Copiar</button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Vazio</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {view === "tabela" && (
        <div className="glass-card overflow-x-auto">
          <table className="data-table">
            <thead><tr>
              <th>Título</th><th>Tipo</th><th>Canal</th><th>Influencer</th><th>Jogo</th><th>Campanha</th><th>LP</th><th>Prioridade</th><th>Status</th><th>Data</th><th>Responsável</th><th>Ações</th>
            </tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td className="font-medium cursor-pointer hover:text-primary" onClick={() => openDetail(item)}>{item.tema}</td>
                  <td><span className="badge-neutral">{item.tipo}</span></td>
                  <td>{item.canal || "—"}</td>
                  <td>{item.influencer}</td>
                  <td>{item.jogo}</td>
                  <td>{item.campanha}</td>
                  <td>{item.lp || "—"}</td>
                  <td>{item.prioridade ? <span className={prioColors[item.prioridade]}>{item.prioridade}</span> : "—"}</td>
                  <td><span className={colColors[item.status]?.replace("border-t-", "badge-") || "badge-neutral"}>{item.status}</span></td>
                  <td className="whitespace-nowrap">{item.data}</td>
                  <td>{item.responsavel || "—"}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openDetail(item)} className="p-1 rounded hover:bg-secondary text-muted-foreground" title="Ver"><Eye size={12} /></button>
                      <button onClick={() => { setEditing({ ...item }); setModalOpen(true); }} className="p-1 rounded hover:bg-secondary text-muted-foreground" title="Editar">✏️</button>
                      <button onClick={() => duplicateItem(item)} className="p-1 rounded hover:bg-secondary text-muted-foreground" title="Duplicar"><Copy size={12} /></button>
                      <button onClick={() => archiveItem(item)} className="p-1 rounded hover:bg-secondary text-muted-foreground" title="Arquivar"><Archive size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CALENDAR VIEW */}
      {view === "calendario" && <CalendarView items={filtered} onClickItem={openDetail} onCreateAt={openCreate} />}

      {/* DETAIL DRAWER */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2">📝 {selectedItem?.tema}</DialogTitle></DialogHeader>
          {selectedItem && (
            <>
              <div className="flex flex-wrap gap-1 mb-4">
                {detailTabs.map(t => (
                  <button key={t} className={detailTab === t ? "tab-btn-active" : "tab-btn"} onClick={() => setDetailTab(t)}>{t}</button>
                ))}
              </div>
              {detailTab === "Resumo" && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <p><span className="text-muted-foreground">Tipo:</span> {selectedItem.tipo}</p>
                    <p><span className="text-muted-foreground">Formato:</span> {selectedItem.formato || "—"}</p>
                    <p><span className="text-muted-foreground">Canal:</span> {selectedItem.canal || "—"}</p>
                    <p><span className="text-muted-foreground">Influencer:</span> {selectedItem.influencer}</p>
                    <p><span className="text-muted-foreground">Jogo:</span> <button className="text-primary hover:underline" onClick={() => { setDetailOpen(false); navigate("/jogos"); }}>{selectedItem.jogo}</button></p>
                  </div>
                  <div className="space-y-2">
                    <p><span className="text-muted-foreground">Campanha:</span> {selectedItem.campanha !== "—" ? <button className="text-primary hover:underline" onClick={() => { setDetailOpen(false); navigate("/campanhas"); }}>{selectedItem.campanha}</button> : "—"}</p>
                    <p><span className="text-muted-foreground">LP:</span> {selectedItem.lp && selectedItem.lp !== "—" ? <button className="text-primary hover:underline" onClick={() => { setDetailOpen(false); navigate("/landing-pages"); }}>{selectedItem.lp}</button> : "—"}</p>
                    <p><span className="text-muted-foreground">Prioridade:</span> {selectedItem.prioridade ? <span className={prioColors[selectedItem.prioridade]}>{selectedItem.prioridade}</span> : "—"}</p>
                    <p><span className="text-muted-foreground">Status:</span> <span className="badge-primary">{selectedItem.status}</span></p>
                    <p><span className="text-muted-foreground">Data prevista:</span> {selectedItem.data}</p>
                    <p><span className="text-muted-foreground">Objetivo:</span> {selectedItem.objetivo || "—"}</p>
                  </div>
                </div>
              )}
              {detailTab === "Estrutura" && (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <p><span className="text-muted-foreground">CTA principal:</span> {selectedItem.cta || "—"}</p>
                    <p><span className="text-muted-foreground">LP de destino:</span> {selectedItem.lp || "—"}</p>
                    <p><span className="text-muted-foreground">Jogo vinculado:</span> {selectedItem.jogo}</p>
                    <p><span className="text-muted-foreground">Campanha:</span> {selectedItem.campanha}</p>
                  </div>
                  <div className="glass-card-elevated p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Observações operacionais</p>
                    <p className="text-sm">{selectedItem.observacoes || "Nenhuma observação registrada."}</p>
                  </div>
                </div>
              )}
              {detailTab === "Roteiro" && (
                <div className="space-y-3">
                  <div className="glass-card-elevated p-4 rounded-lg min-h-[200px]">
                    <p className="text-xs text-muted-foreground mb-2">Roteiro / Script</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedItem.roteiro || "Nenhum roteiro cadastrado. Edite o conteúdo para adicionar."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass-card-elevated p-3 rounded-lg"><p className="text-xs text-muted-foreground mb-1">CTA</p><p className="text-sm">{selectedItem.cta || "—"}</p></div>
                    <div className="glass-card-elevated p-3 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Responsável</p><p className="text-sm">{selectedItem.responsavel || "—"}</p></div>
                  </div>
                </div>
              )}
              {detailTab === "Assets" && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Nenhum asset vinculado</p>
                  <p className="text-xs mt-1">Imagens, vídeos, prints e referências serão exibidos aqui</p>
                </div>
              )}
              {detailTab === "Campanha" && (
                <div className="space-y-3">
                  {selectedItem.campanha && selectedItem.campanha !== "—" ? (
                    <div className="glass-card-elevated p-4 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">{selectedItem.campanha}</h4>
                      {(() => { const c = initialCampanhas.find(ca => ca.nome === selectedItem.campanha); return c ? (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <p><span className="text-muted-foreground">Objetivo:</span> {c.objetivo}</p>
                          <p><span className="text-muted-foreground">Status:</span> <span className="badge-primary">{c.status}</span></p>
                          <p><span className="text-muted-foreground">Período:</span> {c.inicio} — {c.fim}</p>
                          <p><span className="text-muted-foreground">Resultado:</span> {c.resultado}</p>
                          <button className="btn-ghost text-xs col-span-2" onClick={() => { setDetailOpen(false); navigate("/campanhas"); }}>Abrir campanha →</button>
                        </div>
                      ) : <p className="text-xs text-muted-foreground">Campanha não encontrada nos registros</p>; })()}
                    </div>
                  ) : <p className="text-sm text-muted-foreground text-center py-8">Nenhuma campanha vinculada</p>}
                </div>
              )}
              {detailTab === "Analytics" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">Cliques est.</span><span className="text-lg font-bold">{Math.floor(Math.random() * 2000 + 500)}</span></div>
                  <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">CTR est.</span><span className="text-lg font-bold">{(Math.random() * 15 + 3).toFixed(1)}%</span></div>
                  <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">Conversões est.</span><span className="text-lg font-bold">{Math.floor(Math.random() * 200 + 20)}</span></div>
                  <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">Receita est.</span><span className="text-lg font-bold">R$ {(Math.random() * 5000 + 500).toFixed(0)}</span></div>
                </div>
              )}
              {detailTab === "Observações" && (
                <div className="glass-card-elevated p-4 rounded-lg min-h-[150px]">
                  <p className="text-sm">{selectedItem.observacoes || "Nenhuma observação registrada."}</p>
                </div>
              )}
              <DialogFooter className="mt-4">
                <button className="btn-ghost" onClick={() => { setEditing({ ...selectedItem }); setDetailOpen(false); setModalOpen(true); }}>Editar</button>
                <button className="btn-ghost" onClick={() => { duplicateItem(selectedItem); setDetailOpen(false); }}>Duplicar</button>
                {selectedItem.campanha && selectedItem.campanha !== "—" && <button className="btn-ghost" onClick={() => { setDetailOpen(false); navigate("/campanhas"); }}><ExternalLink size={12} /> Campanha</button>}
                {selectedItem.lp && selectedItem.lp !== "—" && <button className="btn-ghost" onClick={() => { setDetailOpen(false); navigate("/landing-pages"); }}><Link2 size={12} /> LP</button>}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE/EDIT MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Conteúdo" : "Criar Conteúdo"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Tema *</label><input className="input-field mt-1" value={editing?.tema || ""} onChange={e => setEditing(p => ({ ...p, tema: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || "Reels"} onChange={e => setEditing(p => ({ ...p, tipo: e.target.value }))}>
                  {tipoOptions.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Canal</label>
                <select className="select-field mt-1 w-full" value={editing?.canal || "Instagram"} onChange={e => setEditing(p => ({ ...p, canal: e.target.value }))}>
                  {canalOptions.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Jogo</label><input className="input-field mt-1" value={editing?.jogo || ""} onChange={e => setEditing(p => ({ ...p, jogo: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Influencer</label><input className="input-field mt-1" value={editing?.influencer || ""} onChange={e => setEditing(p => ({ ...p, influencer: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Campanha</label><input className="input-field mt-1" value={editing?.campanha || ""} onChange={e => setEditing(p => ({ ...p, campanha: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">LP vinculada</label><input className="input-field mt-1" value={editing?.lp || ""} onChange={e => setEditing(p => ({ ...p, lp: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Data prevista</label><input className="input-field mt-1" value={editing?.data || ""} onChange={e => setEditing(p => ({ ...p, data: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                <select className="select-field mt-1 w-full" value={editing?.prioridade || "Média"} onChange={e => setEditing(p => ({ ...p, prioridade: e.target.value as any }))}>
                  {prioOptions.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Responsável</label><input className="input-field mt-1" value={editing?.responsavel || ""} onChange={e => setEditing(p => ({ ...p, responsavel: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">CTA</label><input className="input-field mt-1" value={editing?.cta || ""} onChange={e => setEditing(p => ({ ...p, cta: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Objetivo</label><input className="input-field mt-1" value={editing?.objetivo || ""} onChange={e => setEditing(p => ({ ...p, objetivo: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Roteiro</label><textarea className="input-field mt-1 min-h-[80px]" value={editing?.roteiro || ""} onChange={e => setEditing(p => ({ ...p, roteiro: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Observações</label><textarea className="input-field mt-1" value={editing?.observacoes || ""} onChange={e => setEditing(p => ({ ...p, observacoes: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="select-field mt-1 w-full" value={editing?.status || "Ideia"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as ConteudoItem["status"] }))}>
                {statusCols.map(s => <option key={s}>{s}</option>)}
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

/* Inline calendar view component */
function CalendarView({ items, onClickItem, onCreateAt }: { items: ConteudoItem[]; onClickItem: (i: ConteudoItem) => void; onCreateAt: (s: ConteudoItem["status"]) => void }) {
  const [viewType, setViewType] = useState<"mensal" | "semanal">("mensal");
  const dias = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  // March 2026 starts on Sunday (day 0)
  const startOffset = 0;

  const getItemsByDay = (day: number) => items.filter(c => {
    const d = c.data.split("/")[0];
    return parseInt(d) === day;
  });

  if (viewType === "semanal") {
    const currentWeekDays = [9, 10, 11, 12, 13, 14, 15]; // Example week
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button className="tab-btn" onClick={() => setViewType("mensal")}>Mensal</button>
          <button className="tab-btn-active" onClick={() => setViewType("semanal")}>Semanal</button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(d => <div key={d} className="text-center text-[10px] text-muted-foreground font-semibold uppercase py-1">{d}</div>)}
          {currentWeekDays.map(day => {
            const dayItems = getItemsByDay(day);
            return (
              <div key={day} className="glass-card min-h-[120px] p-2 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{day} Mar</span>
                  <button onClick={() => onCreateAt("Ideia")} className="text-muted-foreground hover:text-foreground"><Plus size={10} /></button>
                </div>
                {dayItems.map(item => (
                  <div key={item.id} className="mt-1 p-1.5 rounded bg-secondary/60 text-[10px] cursor-pointer hover:bg-secondary" onClick={() => onClickItem(item)}>
                    <p className="font-medium truncate">{item.tema}</p>
                    <p className="text-muted-foreground">{item.tipo} · {item.canal} · {item.influencer}</p>
                    <span className={`${colColors[item.status]?.replace("border-t-", "badge-") || "badge-neutral"} mt-0.5`}>{item.status}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className="tab-btn-active" onClick={() => setViewType("mensal")}>Mensal</button>
        <button className="tab-btn" onClick={() => setViewType("semanal")}>Semanal</button>
        <span className="text-sm font-medium ml-2">Março 2026</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(d => <div key={d} className="text-center text-[10px] text-muted-foreground font-semibold uppercase tracking-wider py-2">{d}</div>)}
        {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
        {dias.map(dia => {
          const dayItems = getItemsByDay(dia);
          return (
            <div key={dia} className={`glass-card min-h-[80px] p-2 rounded-lg ${dayItems.length > 0 ? "border-primary/20" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">{dia}</span>
                {dayItems.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </div>
              {dayItems.map(item => (
                <div key={item.id} className="mt-1 p-1 rounded bg-secondary/60 text-[10px] cursor-pointer hover:bg-secondary" onClick={() => onClickItem(item)}>
                  <p className="font-medium truncate">{item.tema}</p>
                  <p className="text-muted-foreground truncate">{item.tipo} · {item.canal}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
