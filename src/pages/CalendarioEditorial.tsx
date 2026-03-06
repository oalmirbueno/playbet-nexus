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
const colBadge: Record<string, string> = { Ideia: "badge-neutral", Roteiro: "badge-neutral", Produção: "badge-info", Revisão: "badge-warning", Agendado: "badge-primary", Publicado: "badge-success", Pausado: "badge-danger" };
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type ViewType = "mensal" | "semanal" | "agenda";

export default function CalendarioEditorial() {
  const navigate = useNavigate();
  const [data, setData] = useState<ConteudoItem[]>(initialConteudos);
  const [viewType, setViewType] = useState<ViewType>("mensal");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ConteudoItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDay, setCreateDay] = useState(1);
  const [newTema, setNewTema] = useState("");
  const [newTipo, setNewTipo] = useState("Reels");
  const [newCanal, setNewCanal] = useState("Instagram");
  const [newInfluencer, setNewInfluencer] = useState("");

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

  const totalAgendados = data.filter(c => c.status === "Agendado").length;
  const totalPublicados = data.filter(c => c.status === "Publicado").length;
  const diasComConteudo = new Set(data.map(c => parseInt(c.data.split("/")[0]))).size;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/conteudo" }, { label: "Calendário Editorial" }]} />

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário Editorial</h1>
          <p className="text-sm text-muted-foreground mt-1">Planejamento visual de conteúdo — Março 2026</p>
        </div>
        <div className="flex gap-2 items-center">
          <ExportDropdown data={exportableData} filename="calendario-playbet" />
          <button className="btn-ghost text-sm" onClick={() => navigate("/conteudo")}>Central de Conteúdo</button>
          <button className="btn-ghost text-sm" onClick={() => navigate("/estrategia")}>Estratégia</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total itens", value: data.length, variant: "" },
          { label: "Agendados", value: totalAgendados, variant: "border-l-2 border-l-primary" },
          { label: "Publicados", value: totalPublicados, variant: "border-l-2 border-l-success" },
          { label: "Dias c/ conteúdo", value: `${diasComConteudo}/31`, variant: "border-l-2 border-l-info" },
          { label: "Buracos", value: 31 - diasComConteudo, variant: "border-l-2 border-l-warning" },
        ].map((s, i) => (
          <div key={i} className={`glass-card p-5 ${s.variant}`}>
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
            <p className="text-2xl font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + View toggle */}
      <div className="flex flex-wrap items-center gap-3">
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
          <button className="btn-ghost text-sm" onClick={() => { setFilterInfluencer(""); setFilterCanal(""); setFilterJogo(""); setFilterStatus(""); }}>Limpar</button>
        )}
        <div className="flex-1" />
        <div className="flex gap-0.5 bg-secondary/60 rounded-lg p-1 border border-border">
          {(["mensal", "semanal", "agenda"] as ViewType[]).map(v => (
            <button key={v} onClick={() => setViewType(v)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewType === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* MONTHLY VIEW */}
      {viewType === "mensal" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(d => <div key={d} className="text-center text-xs text-muted-foreground font-semibold uppercase tracking-wider py-2.5">{d}</div>)}
          {dias.map(dia => {
            const dayItems = getItemsByDay(dia);
            return (
              <div key={dia} className={`glass-card min-h-[110px] p-3 rounded-lg ${dayItems.length > 0 ? "border-primary/15" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">{dia}</span>
                  <button onClick={() => openCreateForDay(dia)} className="text-muted-foreground hover:text-foreground opacity-30 hover:opacity-100 transition-opacity"><Plus size={12} /></button>
                </div>
                {dayItems.map(item => (
                  <div key={item.id} className="mt-1.5 p-2 rounded-md bg-secondary/40 text-xs cursor-pointer hover:bg-secondary/60 transition-colors" onClick={() => openDetail(item)}>
                    <p className="font-medium truncate">{item.tema}</p>
                    <p className="text-muted-foreground truncate mt-0.5">{item.tipo} · {item.canal}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* WEEKLY VIEW */}
      {viewType === "semanal" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))} className="btn-ghost p-2"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold">Semana {selectedWeek + 1} de Março</span>
            <button onClick={() => setSelectedWeek(Math.min(4, selectedWeek + 1))} className="btn-ghost p-2"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map(d => <div key={d} className="text-center text-xs text-muted-foreground font-semibold uppercase py-2">{d}</div>)}
            {(weeks[selectedWeek] || []).map(day => {
              const dayItems = getItemsByDay(day);
              return (
                <div key={day} className="glass-card min-h-[180px] p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{day} Mar</span>
                    <button onClick={() => openCreateForDay(day)} className="text-muted-foreground hover:text-foreground"><Plus size={13} /></button>
                  </div>
                  {dayItems.map(item => (
                    <div key={item.id} className="mt-2 p-2.5 rounded-md bg-secondary/40 text-xs cursor-pointer hover:bg-secondary/60 transition-colors" onClick={() => openDetail(item)}>
                      <p className="font-medium truncate">{item.tema}</p>
                      <p className="text-muted-foreground mt-0.5">{item.influencer} · {item.canal}</p>
                      <div className="flex gap-1.5 mt-1.5">
                        <span className={colBadge[item.status]}>{item.status}</span>
                      </div>
                    </div>
                  ))}
                  {dayItems.length === 0 && <p className="text-xs text-muted-foreground text-center mt-12">—</p>}
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, 7 - (weeks[selectedWeek]?.length || 0)) }).map((_, i) => <div key={`e-${i}`} />)}
          </div>
        </div>
      )}

      {/* AGENDA VIEW */}
      {viewType === "agenda" && (
        <div className="space-y-3">
          {dias.map(dia => {
            const dayItems = getItemsByDay(dia);
            if (dayItems.length === 0) return null;
            return (
              <div key={dia} className="glass-card p-5 rounded-lg">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-xl font-semibold text-primary w-10">{dia}</span>
                  <span className="text-sm text-muted-foreground">Março 2026</span>
                  <div className="flex-1" />
                  <button onClick={() => openCreateForDay(dia)} className="btn-ghost text-sm"><Plus size={13} /> Criar</button>
                </div>
                <div className="space-y-2 ml-14">
                  {dayItems.map(item => (
                    <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors" onClick={() => openDetail(item)}>
                      <span className={colBadge[item.status]}>{item.status}</span>
                      <span className="text-sm font-medium flex-1">{item.tema}</span>
                      <span className="text-xs text-muted-foreground">{item.tipo}</span>
                      <span className="text-xs text-muted-foreground">{item.canal}</span>
                      <span className="text-xs text-muted-foreground">{item.influencer}</span>
                      {item.campanha && item.campanha !== "—" && <span className="text-xs text-primary/70">{item.campanha}</span>}
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-lg font-semibold">{selectedItem?.tema}</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</span><p className="font-medium mt-0.5">{selectedItem.tipo}</p></div>
                <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Canal</span><p className="font-medium mt-0.5">{selectedItem.canal}</p></div>
                <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Influencer</span><p className="font-medium mt-0.5">{selectedItem.influencer}</p></div>
                <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Jogo</span><p className="font-medium mt-0.5">{selectedItem.jogo}</p></div>
                <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Campanha</span><p className="font-medium mt-0.5">{selectedItem.campanha}</p></div>
                <div><span className="text-xs text-muted-foreground uppercase tracking-wide">LP</span><p className="font-medium mt-0.5">{selectedItem.lp || "—"}</p></div>
                <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Data</span><p className="font-medium mt-0.5">{selectedItem.data}</p></div>
                <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Prioridade</span><p className="font-medium mt-0.5">{selectedItem.prioridade || "—"}</p></div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Alterar status</p>
                <div className="flex flex-wrap gap-1.5">
                  {statusCols.map(s => (
                    <button key={s} onClick={() => changeStatus(selectedItem, s)} className={`text-xs px-3 py-1.5 rounded-md transition-colors ${selectedItem.status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <DialogFooter className="pt-2">
                <button className="btn-ghost text-sm" onClick={() => { setDetailOpen(false); navigate("/conteudo"); }}>Abrir na Central</button>
                <button className="btn-ghost text-sm" onClick={() => setDetailOpen(false)}>Fechar</button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create from calendar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-lg font-semibold">Criar conteúdo — Dia {createDay}/03</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tema *</label><input className="input-field mt-1.5" value={newTema} onChange={e => setNewTema(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</label>
                <select className="select-field mt-1.5 w-full" value={newTipo} onChange={e => setNewTipo(e.target.value)}>
                  <option>Reels</option><option>Story</option><option>Post</option><option>Vídeo</option><option>Live</option><option>Carrossel</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Canal</label>
                <select className="select-field mt-1.5 w-full" value={newCanal} onChange={e => setNewCanal(e.target.value)}>
                  <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Telegram</option><option>WhatsApp</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Influencer</label><input className="input-field mt-1.5" value={newInfluencer} onChange={e => setNewInfluencer(e.target.value)} /></div>
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
