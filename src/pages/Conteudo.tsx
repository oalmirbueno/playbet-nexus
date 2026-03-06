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

  const total = data.length;
  const byStatus = (s: string) => data.filter(c => c.status === s).length;
  const byCanal = useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach(c => { if (c.canal) m[c.canal] = (m[c.canal] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [data]);

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
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/conteudo" }, { label: "Conteúdos" }]} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conteúdos</h1>
          <p className="text-sm text-muted-foreground mt-1">Central editorial — produção, gestão e execução de marketing</p>
        </div>
        <div className="flex gap-2 items-center">
          <ExportDropdown data={exportableData} filename="conteudos-playbet" />
          <button className="btn-primary" onClick={() => openCreate()}><Plus size={15} /> Criar Conteúdo</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: "Total", value: total, variant: "" },
          { label: "Ideias", value: byStatus("Ideia"), variant: "border-l-2 border-l-muted-foreground" },
          { label: "Produção", value: byStatus("Produção"), variant: "border-l-2 border-l-info" },
          { label: "Revisão", value: byStatus("Revisão"), variant: "border-l-2 border-l-warning" },
          { label: "Agendados", value: byStatus("Agendado"), variant: "border-l-2 border-l-primary" },
          { label: "Publicados", value: byStatus("Publicado"), variant: "border-l-2 border-l-success" },
          ...byCanal.slice(0, 2).map(([canal, count]) => ({ label: canal, value: count, variant: "" })),
        ].map((s, i) => (
          <div key={i} className={`glass-card p-5 ${s.variant}`}>
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
            <p className="text-2xl font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="glass-card p-5 border-l-2 border-l-warning">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><AlertTriangle size={13} /> Alertas Operacionais</h3>
          <div className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <span key={i} className={`text-xs px-3 py-1.5 rounded-md ${a.type === "danger" ? "bg-destructive/10 text-destructive" : a.type === "warning" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}>{a.msg}</span>
            ))}
          </div>
        </div>
      )}

      {/* Nav shortcuts + View toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-ghost text-sm" onClick={() => navigate("/campanhas")}>Campanhas</button>
        <button className="btn-ghost text-sm" onClick={() => navigate("/calendario")}>Calendário Editorial</button>
        <button className="btn-ghost text-sm" onClick={() => navigate("/estrategia")}>Estratégia</button>
        <div className="flex-1" />
        <div className="flex gap-0.5 bg-secondary/60 rounded-lg p-1 border border-border">
          {([["kanban", LayoutGrid, "Kanban"], ["tabela", Table2, "Tabela"], ["calendario", CalendarDays, "Calendário"]] as [ViewMode, any, string][]).map(([v, Icon, label]) => (
            <button key={v} onClick={() => setView(v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="select-field text-sm" value={filterInfluencer} onChange={e => setFilterInfluencer(e.target.value)}>
          <option value="">Todos influencers</option>
          {influencers.map(i => <option key={i}>{i}</option>)}
        </select>
        <select className="select-field text-sm" value={filterCanal} onChange={e => setFilterCanal(e.target.value)}>
          <option value="">Todos canais</option>
          {canais.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="select-field text-sm" value={filterJogo} onChange={e => setFilterJogo(e.target.value)}>
          <option value="">Todos jogos</option>
          {jogos.map(j => <option key={j}>{j}</option>)}
        </select>
        <select className="select-field text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos status</option>
          {statusCols.map(s => <option key={s}>{s}</option>)}
        </select>
        {(filterInfluencer || filterCanal || filterJogo || filterStatus) && (
          <button className="btn-ghost text-sm" onClick={() => { setFilterInfluencer(""); setFilterCanal(""); setFilterJogo(""); setFilterStatus(""); }}>Limpar filtros</button>
        )}
      </div>

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {statusCols.map(col => {
            const items = filtered.filter(c => c.status === col);
            return (
              <div key={col} className={`flex-1 min-w-[280px] glass-card p-0 rounded-lg border-t-2 ${colColors[col]}`}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{col}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{items.length}</span>
                    <button onClick={() => openCreate(col)} className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Plus size={14} /></button>
                  </div>
                </div>
                <div className="p-3 space-y-2.5 min-h-[200px]">
                  {items.map(item => (
                    <div key={item.id} className="glass-card-elevated p-4 rounded-lg cursor-pointer hover:border-primary/20 transition-colors group" onClick={() => openDetail(item)}>
                      <p className="text-sm font-medium mb-2 leading-snug">{item.tema}</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="badge-neutral">{item.tipo}</span>
                        {item.canal && <span className="text-[11px] text-muted-foreground">{item.canal}</span>}
                      </div>
                      {item.prioridade && <span className={`${prioColors[item.prioridade]} mr-1`}>{item.prioridade}</span>}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{item.influencer}</span>
                        <span className="text-border">·</span>
                        <span>{item.data}</span>
                      </div>
                      {item.jogo && <p className="text-[11px] text-muted-foreground mt-1.5">{item.jogo}</p>}
                      {item.campanha && item.campanha !== "—" && <p className="text-[11px] text-primary/70 mt-1">{item.campanha}</p>}
                      <div className="flex gap-1 mt-3 pt-2 border-t border-border-subtle opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => moveItem(item, "prev")} className="text-[11px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground">←</button>
                        <button onClick={() => moveItem(item, "next")} className="text-[11px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground">→</button>
                        <button onClick={() => { setEditing({ ...item }); setModalOpen(true); }} className="text-[11px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground">Editar</button>
                        <button onClick={() => duplicateItem(item)} className="text-[11px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground">Copiar</button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Nenhum item</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {view === "tabela" && (
        <div className="glass-card overflow-x-auto rounded-lg">
          <table className="data-table">
            <thead><tr>
              <th>Título</th><th>Tipo</th><th>Canal</th><th>Influencer</th><th>Jogo</th><th>Campanha</th><th>LP</th><th>Prioridade</th><th>Status</th><th>Data</th><th>Responsável</th><th>Ações</th>
            </tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td className="font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => openDetail(item)}>{item.tema}</td>
                  <td><span className="badge-neutral">{item.tipo}</span></td>
                  <td className="text-muted-foreground">{item.canal || "—"}</td>
                  <td>{item.influencer}</td>
                  <td className="text-muted-foreground">{item.jogo}</td>
                  <td className="text-muted-foreground">{item.campanha}</td>
                  <td className="text-muted-foreground">{item.lp || "—"}</td>
                  <td>{item.prioridade ? <span className={prioColors[item.prioridade]}>{item.prioridade}</span> : "—"}</td>
                  <td><span className={colColors[item.status]?.replace("border-t-", "badge-") || "badge-neutral"}>{item.status}</span></td>
                  <td className="whitespace-nowrap text-muted-foreground">{item.data}</td>
                  <td className="text-muted-foreground">{item.responsavel || "—"}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openDetail(item)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground" title="Ver"><Eye size={14} /></button>
                      <button onClick={() => { setEditing({ ...item }); setModalOpen(true); }} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground" title="Editar">✏️</button>
                      <button onClick={() => duplicateItem(item)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground" title="Duplicar"><Copy size={14} /></button>
                      <button onClick={() => archiveItem(item)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground" title="Arquivar"><Archive size={14} /></button>
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
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{selectedItem?.tema}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <>
              <div className="flex flex-wrap gap-1.5 mb-6 border-b border-border pb-4">
                {detailTabs.map(t => (
                  <button key={t} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${detailTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`} onClick={() => setDetailTab(t)}>{t}</button>
                ))}
              </div>
              {detailTab === "Resumo" && (
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-4">
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</span><p className="font-medium mt-0.5">{selectedItem.tipo}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Formato</span><p className="font-medium mt-0.5">{selectedItem.formato || "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Canal</span><p className="font-medium mt-0.5">{selectedItem.canal || "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Influencer</span><p className="font-medium mt-0.5">{selectedItem.influencer}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Jogo</span><p className="font-medium mt-0.5"><button className="text-primary hover:underline" onClick={() => { setDetailOpen(false); navigate("/jogos"); }}>{selectedItem.jogo}</button></p></div>
                  </div>
                  <div className="space-y-4">
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Campanha</span><p className="font-medium mt-0.5">{selectedItem.campanha !== "—" ? <button className="text-primary hover:underline" onClick={() => { setDetailOpen(false); navigate("/campanhas"); }}>{selectedItem.campanha}</button> : "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">LP</span><p className="font-medium mt-0.5">{selectedItem.lp && selectedItem.lp !== "—" ? <button className="text-primary hover:underline" onClick={() => { setDetailOpen(false); navigate("/landing-pages"); }}>{selectedItem.lp}</button> : "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Prioridade</span><p className="mt-0.5">{selectedItem.prioridade ? <span className={prioColors[selectedItem.prioridade]}>{selectedItem.prioridade}</span> : "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Status</span><p className="mt-0.5"><span className="badge-primary">{selectedItem.status}</span></p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Data prevista</span><p className="font-medium mt-0.5">{selectedItem.data}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Objetivo</span><p className="font-medium mt-0.5">{selectedItem.objetivo || "—"}</p></div>
                  </div>
                </div>
              )}
              {detailTab === "Estrutura" && (
                <div className="space-y-5 text-sm">
                  <div className="grid grid-cols-2 gap-5">
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">CTA principal</span><p className="font-medium mt-0.5">{selectedItem.cta || "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">LP de destino</span><p className="font-medium mt-0.5">{selectedItem.lp || "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Jogo vinculado</span><p className="font-medium mt-0.5">{selectedItem.jogo}</p></div>
                    <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Campanha</span><p className="font-medium mt-0.5">{selectedItem.campanha}</p></div>
                  </div>
                  <div className="glass-card-elevated p-5 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Observações operacionais</p>
                    <p className="text-sm leading-relaxed">{selectedItem.observacoes || "Nenhuma observação registrada."}</p>
                  </div>
                </div>
              )}
              {detailTab === "Roteiro" && (
                <div className="space-y-5">
                  <div className="glass-card-elevated p-6 rounded-lg min-h-[220px]">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Roteiro / Script</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedItem.roteiro || "Nenhum roteiro cadastrado. Edite o conteúdo para adicionar."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card-elevated p-4 rounded-lg"><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CTA</p><p className="text-sm font-medium">{selectedItem.cta || "—"}</p></div>
                    <div className="glass-card-elevated p-4 rounded-lg"><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Responsável</p><p className="text-sm font-medium">{selectedItem.responsavel || "—"}</p></div>
                  </div>
                </div>
              )}
              {detailTab === "Assets" && (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-sm">Nenhum asset vinculado</p>
                  <p className="text-xs mt-2">Imagens, vídeos, prints e referências serão exibidos aqui</p>
                </div>
              )}
              {detailTab === "Campanha" && (
                <div className="space-y-4">
                  {selectedItem.campanha && selectedItem.campanha !== "—" ? (
                    <div className="glass-card-elevated p-6 rounded-lg">
                      <h4 className="text-base font-semibold mb-4">{selectedItem.campanha}</h4>
                      {(() => { const c = initialCampanhas.find(ca => ca.nome === selectedItem.campanha); return c ? (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Objetivo</span><p className="font-medium mt-0.5">{c.objetivo}</p></div>
                          <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Status</span><p className="mt-0.5"><span className="badge-primary">{c.status}</span></p></div>
                          <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Período</span><p className="font-medium mt-0.5">{c.inicio} — {c.fim}</p></div>
                          <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Resultado</span><p className="font-medium mt-0.5">{c.resultado}</p></div>
                          <button className="btn-ghost text-sm col-span-2 justify-center mt-2" onClick={() => { setDetailOpen(false); navigate("/campanhas"); }}>Abrir campanha →</button>
                        </div>
                      ) : <p className="text-sm text-muted-foreground">Campanha não encontrada nos registros</p>; })()}
                    </div>
                  ) : <p className="text-sm text-muted-foreground text-center py-12">Nenhuma campanha vinculada</p>}
                </div>
              )}
              {detailTab === "Analytics" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-card p-5"><span className="text-[11px] text-muted-foreground uppercase tracking-wide">Cliques est.</span><p className="text-xl font-semibold mt-1">{Math.floor(Math.random() * 2000 + 500)}</p></div>
                  <div className="glass-card p-5"><span className="text-[11px] text-muted-foreground uppercase tracking-wide">CTR est.</span><p className="text-xl font-semibold mt-1">{(Math.random() * 15 + 3).toFixed(1)}%</p></div>
                  <div className="glass-card p-5"><span className="text-[11px] text-muted-foreground uppercase tracking-wide">Conversões est.</span><p className="text-xl font-semibold mt-1">{Math.floor(Math.random() * 200 + 20)}</p></div>
                  <div className="glass-card p-5"><span className="text-[11px] text-muted-foreground uppercase tracking-wide">Receita est.</span><p className="text-xl font-semibold mt-1">R$ {(Math.random() * 5000 + 500).toFixed(0)}</p></div>
                </div>
              )}
              {detailTab === "Observações" && (
                <div className="glass-card-elevated p-6 rounded-lg min-h-[180px]">
                  <p className="text-sm leading-relaxed">{selectedItem.observacoes || "Nenhuma observação registrada."}</p>
                </div>
              )}
              <DialogFooter className="mt-6 pt-4 border-t border-border">
                <button className="btn-ghost" onClick={() => { setEditing({ ...selectedItem }); setDetailOpen(false); setModalOpen(true); }}>Editar</button>
                <button className="btn-ghost" onClick={() => { duplicateItem(selectedItem); setDetailOpen(false); }}>Duplicar</button>
                {selectedItem.campanha && selectedItem.campanha !== "—" && <button className="btn-ghost" onClick={() => { setDetailOpen(false); navigate("/campanhas"); }}><ExternalLink size={13} /> Campanha</button>}
                {selectedItem.lp && selectedItem.lp !== "—" && <button className="btn-ghost" onClick={() => { setDetailOpen(false); navigate("/landing-pages"); }}><Link2 size={13} /> LP</button>}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE/EDIT MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg font-semibold">{editing?.id ? "Editar Conteúdo" : "Criar Conteúdo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tema *</label><input className="input-field mt-1.5" value={editing?.tema || ""} onChange={e => setEditing(p => ({ ...p, tema: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</label>
                <select className="select-field mt-1.5 w-full" value={editing?.tipo || "Reels"} onChange={e => setEditing(p => ({ ...p, tipo: e.target.value }))}>
                  {tipoOptions.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Canal</label>
                <select className="select-field mt-1.5 w-full" value={editing?.canal || "Instagram"} onChange={e => setEditing(p => ({ ...p, canal: e.target.value }))}>
                  {canalOptions.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Jogo</label><input className="input-field mt-1.5" value={editing?.jogo || ""} onChange={e => setEditing(p => ({ ...p, jogo: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Influencer</label><input className="input-field mt-1.5" value={editing?.influencer || ""} onChange={e => setEditing(p => ({ ...p, influencer: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campanha</label><input className="input-field mt-1.5" value={editing?.campanha || ""} onChange={e => setEditing(p => ({ ...p, campanha: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">LP vinculada</label><input className="input-field mt-1.5" value={editing?.lp || ""} onChange={e => setEditing(p => ({ ...p, lp: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data prevista</label><input className="input-field mt-1.5" value={editing?.data || ""} onChange={e => setEditing(p => ({ ...p, data: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prioridade</label>
                <select className="select-field mt-1.5 w-full" value={editing?.prioridade || "Média"} onChange={e => setEditing(p => ({ ...p, prioridade: e.target.value as any }))}>
                  {prioOptions.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Responsável</label><input className="input-field mt-1.5" value={editing?.responsavel || ""} onChange={e => setEditing(p => ({ ...p, responsavel: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CTA</label><input className="input-field mt-1.5" value={editing?.cta || ""} onChange={e => setEditing(p => ({ ...p, cta: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Objetivo</label><input className="input-field mt-1.5" value={editing?.objetivo || ""} onChange={e => setEditing(p => ({ ...p, objetivo: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Roteiro</label><textarea className="input-field mt-1.5 min-h-[100px]" value={editing?.roteiro || ""} onChange={e => setEditing(p => ({ ...p, roteiro: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</label><textarea className="input-field mt-1.5" value={editing?.observacoes || ""} onChange={e => setEditing(p => ({ ...p, observacoes: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
              <select className="select-field mt-1.5 w-full" value={editing?.status || "Ideia"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as ConteudoItem["status"] }))}>
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
  const startOffset = 0;

  const getItemsByDay = (day: number) => items.filter(c => {
    const d = c.data.split("/")[0];
    return parseInt(d) === day;
  });

  if (viewType === "semanal") {
    const currentWeekDays = [9, 10, 11, 12, 13, 14, 15];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button className="tab-btn" onClick={() => setViewType("mensal")}>Mensal</button>
          <button className="tab-btn-active" onClick={() => setViewType("semanal")}>Semanal</button>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map(d => <div key={d} className="text-center text-xs text-muted-foreground font-semibold uppercase tracking-wider py-2">{d}</div>)}
          {currentWeekDays.map(day => {
            const dayItems = getItemsByDay(day);
            return (
              <div key={day} className="glass-card min-h-[160px] p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{day} Mar</span>
                  <button onClick={() => onCreateAt("Ideia")} className="text-muted-foreground hover:text-foreground"><Plus size={12} /></button>
                </div>
                {dayItems.map(item => (
                  <div key={item.id} className="mt-1.5 p-2 rounded-md bg-secondary/50 text-xs cursor-pointer hover:bg-secondary transition-colors" onClick={() => onClickItem(item)}>
                    <p className="font-medium truncate">{item.tema}</p>
                    <p className="text-muted-foreground mt-0.5">{item.tipo} · {item.canal} · {item.influencer}</p>
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="tab-btn-active" onClick={() => setViewType("mensal")}>Mensal</button>
        <button className="tab-btn" onClick={() => setViewType("semanal")}>Semanal</button>
        <span className="text-sm font-medium ml-3 text-muted-foreground">Março 2026</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(d => <div key={d} className="text-center text-xs text-muted-foreground font-semibold uppercase tracking-wider py-2">{d}</div>)}
        {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
        {dias.map(dia => {
          const dayItems = getItemsByDay(dia);
          return (
            <div key={dia} className={`glass-card min-h-[100px] p-2.5 rounded-lg ${dayItems.length > 0 ? "border-primary/15" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{dia}</span>
                {dayItems.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />}
              </div>
              {dayItems.map(item => (
                <div key={item.id} className="mt-1.5 p-1.5 rounded-md bg-secondary/50 text-[11px] cursor-pointer hover:bg-secondary transition-colors" onClick={() => onClickItem(item)}>
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
