import { useState, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, Download, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialConteudos } from "@/data/mockData";
import type { ConteudoItem } from "@/types";
import { toast } from "@/hooks/use-toast";
import ExportDropdown from "@/components/ExportDropdown";
import Breadcrumbs from "@/components/Breadcrumbs";

const statusCols: ConteudoItem["status"][] = ["Ideia", "Roteiro", "Produção", "Revisão", "Agendado", "Publicado", "Pausado"];
const colBadge: Record<string, string> = { Ideia: "badge-neutral", Roteiro: "badge-accent", Produção: "badge-info", Revisão: "badge-warning", Agendado: "badge-primary", Publicado: "badge-success", Pausado: "badge-danger" };
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type ViewType = "mensal" | "semanal" | "agenda";

export default function CalendarioEditorial() {
  const navigate = useNavigate();
  const [data, setData] = useState<ConteudoItem[]>(initialConteudos);
  const [viewType, setViewType] = useState<ViewType>("mensal");
  const [selectedWeek, setSelectedWeek] = useState(1); // week index 0-4
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ConteudoItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDay, setCreateDay] = useState(1);
  const [newTema, setNewTema] = useState("");
  const [newTipo, setNewTipo] = useState("Reels");
  const [newCanal, setNewCanal] = useState("Instagram");
  const [newInfluencer, setNewInfluencer] = useState("");

  // Filters
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

  const dias = Array.from({ length: 31 }, (_, i) => i + 1);
  const getItemsByDay = (day: number) => filtered.filter(c => parseInt(c.data.split("/")[0]) === day);

  const weeks = [
    [1, 2, 3, 4, 5, 6, 7],
    [8, 9, 10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19, 20, 21],
    [22, 23, 24, 25, 26, 27, 28],
    [29, 30, 31],
  ];

  const openDetail = (item: ConteudoItem) => { setSelectedItem(item); setDetailOpen(true); };

  const changeStatus = (item: ConteudoItem, newStatus: ConteudoItem["status"]) => {
    setData(prev => prev.map(c => c.id === item.id ? { ...c, status: newStatus } : c));
    if (selectedItem?.id === item.id) setSelectedItem({ ...item, status: newStatus });
    toast({ title: `Status alterado para ${newStatus}` });
  };

  const handleCreateFromCalendar = () => {
    if (!newTema) { toast({ title: "Erro", description: "Tema é obrigatório", variant: "destructive" }); return; }
    const newId = Math.max(...data.map(c => c.id), 0) + 1;
    const dayStr = createDay < 10 ? `0${createDay}/03` : `${createDay}/03`;
    setData(prev => [...prev, { id: newId, tema: newTema, tipo: newTipo, canal: newCanal, jogo: "", influencer: newInfluencer, campanha: "—", status: "Ideia" as const, prioridade: "Média" as const, data: dayStr, responsavel: newInfluencer } as ConteudoItem]);
    toast({ title: "Conteúdo criado no calendário" });
    setCreateOpen(false);
    setNewTema("");
  };

  const openCreateForDay = (day: number) => { setCreateDay(day); setNewTema(""); setNewTipo("Reels"); setNewCanal("Instagram"); setNewInfluencer(""); setCreateOpen(true); };

  const exportableData = data.map(({ id, tema, tipo, canal, jogo, influencer, campanha, status, data: d }) => ({ id, tema, tipo, canal, jogo, influencer, campanha, status, data: d }));

  // KPIs
  const totalAgendados = data.filter(c => c.status === "Agendado").length;
  const totalPublicados = data.filter(c => c.status === "Publicado").length;
  const diasComConteudo = new Set(data.map(c => parseInt(c.data.split("/")[0]))).size;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/conteudo" }, { label: "Calendário Editorial" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Calendário Editorial</h1><p className="page-subtitle">Planejamento visual de conteúdo — Março 2026</p></div>
        <div className="flex gap-2">
          <ExportDropdown data={exportableData} filename="calendario-playbet" />
          <button className="btn-ghost text-xs" onClick={() => navigate("/conteudo")}>→ Central de Conteúdo</button>
          <button className="btn-ghost text-xs" onClick={() => navigate("/estrategia")}>→ Estratégia</button>
        </div>
      </div>

      {/* KPI mini */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">Total itens</span><span className="text-xl font-bold">{data.length}</span></div>
        <div className="stat-card-primary"><span className="text-[10px] text-muted-foreground uppercase">Agendados</span><span className="text-xl font-bold">{totalAgendados}</span></div>
        <div className="stat-card-success"><span className="text-[10px] text-muted-foreground uppercase">Publicados</span><span className="text-xl font-bold">{totalPublicados}</span></div>
        <div className="stat-card-info"><span className="text-[10px] text-muted-foreground uppercase">Dias c/ conteúdo</span><span className="text-xl font-bold">{diasComConteudo}/31</span></div>
        <div className="stat-card-warning"><span className="text-[10px] text-muted-foreground uppercase">Buracos</span><span className="text-xl font-bold">{31 - diasComConteudo}</span></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
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
          <button className="btn-ghost text-xs" onClick={() => { setFilterInfluencer(""); setFilterCanal(""); setFilterJogo(""); setFilterStatus(""); }}>Limpar</button>
        )}
        <div className="flex-1" />
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          {(["mensal", "semanal", "agenda"] as ViewType[]).map(v => (
            <button key={v} onClick={() => setViewType(v)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewType === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* MONTHLY VIEW */}
      {viewType === "mensal" && (
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(d => <div key={d} className="text-center text-[10px] text-muted-foreground font-semibold uppercase tracking-wider py-2">{d}</div>)}
          {dias.map(dia => {
            const dayItems = getItemsByDay(dia);
            return (
              <div key={dia} className={`glass-card min-h-[90px] p-2 rounded-lg ${dayItems.length > 0 ? "border-primary/20" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium">{dia}</span>
                  <button onClick={() => openCreateForDay(dia)} className="text-muted-foreground hover:text-foreground opacity-0 hover:opacity-100 transition-opacity"><Plus size={10} /></button>
                </div>
                {dayItems.map(item => (
                  <div key={item.id} className="mt-1 p-1 rounded bg-secondary/60 text-[10px] cursor-pointer hover:bg-secondary transition-colors" onClick={() => openDetail(item)}>
                    <p className="font-medium truncate">{item.tema}</p>
                    <p className="text-muted-foreground truncate">{item.tipo} · {item.canal}</p>
                    <span className={colBadge[item.status]}>{item.status}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* WEEKLY VIEW */}
      {viewType === "semanal" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))} className="btn-ghost p-1"><ChevronLeft size={14} /></button>
            <span className="text-sm font-medium">Semana {selectedWeek + 1} de Março</span>
            <button onClick={() => setSelectedWeek(Math.min(4, selectedWeek + 1))} className="btn-ghost p-1"><ChevronRight size={14} /></button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(d => <div key={d} className="text-center text-[10px] text-muted-foreground font-semibold uppercase py-1">{d}</div>)}
            {(weeks[selectedWeek] || []).map(day => {
              const dayItems = getItemsByDay(day);
              return (
                <div key={day} className="glass-card min-h-[140px] p-2 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{day} Mar</span>
                    <button onClick={() => openCreateForDay(day)} className="text-muted-foreground hover:text-foreground"><Plus size={10} /></button>
                  </div>
                  {dayItems.map(item => (
                    <div key={item.id} className="mt-1 p-1.5 rounded bg-secondary/60 text-[10px] cursor-pointer hover:bg-secondary" onClick={() => openDetail(item)}>
                      <p className="font-medium truncate">{item.tema}</p>
                      <p className="text-muted-foreground">{item.influencer} · {item.canal}</p>
                      <div className="flex gap-1 mt-0.5">
                        <span className={colBadge[item.status]}>{item.status}</span>
                        {item.prioridade && <span className={`badge ${item.prioridade === "Alta" ? "badge-danger" : "badge-neutral"}`}>{item.prioridade}</span>}
                      </div>
                    </div>
                  ))}
                  {dayItems.length === 0 && <p className="text-[10px] text-muted-foreground text-center mt-8">—</p>}
                </div>
              );
            })}
            {/* Fill empty slots */}
            {Array.from({ length: Math.max(0, 7 - (weeks[selectedWeek]?.length || 0)) }).map((_, i) => <div key={`e-${i}`} />)}
          </div>
        </div>
      )}

      {/* AGENDA VIEW */}
      {viewType === "agenda" && (
        <div className="space-y-2">
          {dias.map(dia => {
            const dayItems = getItemsByDay(dia);
            if (dayItems.length === 0) return null;
            return (
              <div key={dia} className="glass-card p-3 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-bold text-primary w-8">{dia}</span>
                  <span className="text-xs text-muted-foreground">Março 2026</span>
                  <div className="flex-1" />
                  <button onClick={() => openCreateForDay(dia)} className="btn-ghost text-xs"><Plus size={10} /> Criar</button>
                </div>
                <div className="space-y-1 ml-11">
                  {dayItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/40 hover:bg-secondary/60 cursor-pointer transition-colors" onClick={() => openDetail(item)}>
                      <span className={colBadge[item.status]}>{item.status}</span>
                      <span className="text-xs font-medium flex-1">{item.tema}</span>
                      <span className="text-[10px] text-muted-foreground">{item.tipo}</span>
                      <span className="text-[10px] text-muted-foreground">{item.canal}</span>
                      <span className="text-[10px] text-muted-foreground">{item.influencer}</span>
                      {item.campanha && item.campanha !== "—" && <span className="text-[10px] text-primary">📢 {item.campanha}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selectedItem?.tema}</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p><span className="text-muted-foreground">Tipo:</span> {selectedItem.tipo}</p>
                <p><span className="text-muted-foreground">Canal:</span> {selectedItem.canal}</p>
                <p><span className="text-muted-foreground">Influencer:</span> {selectedItem.influencer}</p>
                <p><span className="text-muted-foreground">Jogo:</span> {selectedItem.jogo}</p>
                <p><span className="text-muted-foreground">Campanha:</span> {selectedItem.campanha}</p>
                <p><span className="text-muted-foreground">LP:</span> {selectedItem.lp || "—"}</p>
                <p><span className="text-muted-foreground">Data:</span> {selectedItem.data}</p>
                <p><span className="text-muted-foreground">Prioridade:</span> {selectedItem.prioridade || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Alterar status:</p>
                <div className="flex flex-wrap gap-1">
                  {statusCols.map(s => (
                    <button key={s} onClick={() => changeStatus(selectedItem, s)} className={`text-[10px] px-2 py-1 rounded-full transition-colors ${selectedItem.status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <button className="btn-ghost text-xs" onClick={() => { setDetailOpen(false); navigate("/conteudo"); }}>Abrir na Central</button>
                <button className="btn-ghost text-xs" onClick={() => setDetailOpen(false)}>Fechar</button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create from calendar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Criar conteúdo — Dia {createDay}/03</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Tema *</label><input className="input-field mt-1" value={newTema} onChange={e => setNewTema(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={newTipo} onChange={e => setNewTipo(e.target.value)}>
                  <option>Reels</option><option>Story</option><option>Post</option><option>Vídeo</option><option>Live</option><option>Carrossel</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Canal</label>
                <select className="select-field mt-1 w-full" value={newCanal} onChange={e => setNewCanal(e.target.value)}>
                  <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Telegram</option><option>WhatsApp</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Influencer</label><input className="input-field mt-1" value={newInfluencer} onChange={e => setNewInfluencer(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCreateFromCalendar}>Criar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
