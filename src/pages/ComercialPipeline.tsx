import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CandidateRegistrationForm } from "@/components/comercial/CandidateRegistrationForm";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from "@dnd-kit/core";
import { Plus, GripVertical, Users, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Stage =
  | "em_contato" | "respondeu" | "checklist" | "cadastro"
  | "analise" | "aprovado" | "concluido";

const STAGES: { id: Stage; label: string; accent: string }[] = [
  { id: "em_contato", label: "Em contato", accent: "from-slate-500/20 to-slate-500/0" },
  { id: "respondeu", label: "Respondeu", accent: "from-sky-500/20 to-sky-500/0" },
  { id: "checklist", label: "Checklist", accent: "from-violet-500/20 to-violet-500/0" },
  { id: "cadastro", label: "Cadastro", accent: "from-indigo-500/20 to-indigo-500/0" },
  { id: "analise", label: "Análise", accent: "from-amber-500/20 to-amber-500/0" },
  { id: "aprovado", label: "Aprovado", accent: "from-emerald-500/20 to-emerald-500/0" },
  { id: "concluido", label: "Concluído", accent: "from-primary/30 to-primary/0" },
];

interface Card {
  id: string;
  stage: Stage;
  name: string;
  handle: string | null;
  primary_channel: string | null;
  source: string | null;
  niche: string | null;
  tags: string[] | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  uf: string | null;
  squad_id: string | null;
  manager_id: string | null;
  checklist_progress: number;
  stage_moved_at: string;
  notes: string | null;
}

interface Squad { id: string; name: string; color: string }
interface Manager { id: string; name: string; squad_id: string | null }

export default function ComercialPipeline() {
  const { toast } = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [openCard, setOpenCard] = useState<Card | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    setLoading(true);
    const [c, s, m] = await Promise.all([
      supabase.from("commercial_pipeline_cards").select("*").eq("is_active", true).order("position"),
      supabase.from("squads").select("id,name,color").eq("is_active", true),
      supabase.from("managers").select("id,name,squad_id").eq("is_active", true),
    ]);
    if (c.data) setCards(c.data as Card[]);
    if (s.data) setSquads(s.data as Squad[]);
    if (m.data) setManagers(m.data as Manager[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.handle ?? "").toLowerCase().includes(q) ||
      (c.niche ?? "").toLowerCase().includes(q)
    );
  }, [cards, search]);

  const byStage = useMemo(() => {
    const m: Record<Stage, Card[]> = {} as Record<Stage, Card[]>;
    STAGES.forEach(s => m[s.id] = []);
    filtered.forEach(c => { (m[c.stage] ??= []).push(c); });
    return m;
  }, [filtered]);

  async function moveCard(cardId: string, newStage: Stage) {
    const card = cards.find(c => c.id === cardId);
    if (!card || card.stage === newStage) return;
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, stage: newStage } : c));
    const { error } = await supabase
      .from("commercial_pipeline_cards")
      .update({ stage: newStage })
      .eq("id", cardId);
    if (error) {
      toast({ title: "Erro ao mover card", description: error.message, variant: "destructive" });
      load();
    } else {
      load();
    }
  }

  function handleDragStart(e: DragStartEvent) {
    const id = e.active.id as string;
    setActiveCard(cards.find(c => c.id === id) ?? null);
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    const overId = e.over?.id as string | undefined;
    if (!overId) return;
    const stage = overId as Stage;
    if (STAGES.find(s => s.id === stage)) moveCard(e.active.id as string, stage);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border/60 bg-background/70 backdrop-blur-xl sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Pipeline comercial</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Captação, qualificação e ativação de afiliados.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar candidato, handle ou nicho..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-72"
          />
          <NewCardDialog open={newOpen} onOpenChange={setNewOpen} onCreated={load} />
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto px-6 py-5">
          <div className="flex gap-4 min-w-max h-full">
            {STAGES.map(stage => (
              <Column
                key={stage.id}
                stage={stage}
                cards={byStage[stage.id] ?? []}
                squads={squads}
                managers={managers}
                loading={loading}
                onOpen={setOpenCard}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeCard ? <CardItem card={activeCard} squads={squads} managers={managers} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <CardDetailSheet
        card={openCard}
        squads={squads}
        managers={managers}
        onClose={() => setOpenCard(null)}
        onUpdated={load}
      />
    </div>
  );
}

function Column({ stage, cards, squads, managers, loading, onOpen }: {
  stage: { id: Stage; label: string; accent: string };
  cards: Card[];
  squads: Squad[];
  managers: Manager[];
  loading: boolean;
  onOpen: (c: Card) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={`w-[300px] flex-shrink-0 flex flex-col rounded-xl border border-border/60 bg-card/40 backdrop-blur transition-colors ${
        isOver ? "ring-2 ring-primary/40 bg-card/70" : ""
      }`}
    >
      <div className={`px-3 py-2.5 rounded-t-xl bg-gradient-to-b ${stage.accent} border-b border-border/40`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-display font-semibold uppercase tracking-wider text-foreground/90">
            {stage.label}
          </span>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{cards.length}</Badge>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[120px] overflow-y-auto">
        {loading && <div className="text-xs text-muted-foreground p-3">Carregando...</div>}
        {!loading && cards.length === 0 && (
          <div className="text-xs text-muted-foreground/70 p-4 text-center border border-dashed border-border/40 rounded-lg">
            Solte um card aqui
          </div>
        )}
        {cards.map(card => (
          <CardItem key={card.id} card={card} squads={squads} managers={managers} onOpen={() => onOpen(card)} />
        ))}
      </div>
    </div>
  );
}

function CardItem({ card, squads, managers, onOpen, dragging }: {
  card: Card; squads: Squad[]; managers: Manager[]; onOpen?: () => void; dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  const squad = squads.find(s => s.id === card.squad_id);
  const manager = managers.find(m => m.id === card.manager_id);
  const since = formatDistanceToNow(new Date(card.stage_moved_at), { addSuffix: false, locale: ptBR });
  return (
    <div
      ref={setNodeRef}
      className={`group relative rounded-lg border border-border/60 bg-card p-3 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer ${
        isDragging || dragging ? "opacity-50" : ""
      }`}
      onClick={onOpen}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          className="text-muted-foreground/50 hover:text-foreground mt-0.5 cursor-grab active:cursor-grabbing"
          aria-label="Arrastar"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[11px] font-semibold flex items-center justify-center shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.5)]">
              {card.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{card.name}</div>
              {card.handle && <div className="text-[11px] text-muted-foreground truncate">{card.handle}</div>}
            </div>
          </div>

          {card.niche && (
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">{card.niche}</Badge>
            </div>
          )}

          <div className="mt-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Checklist</span>
              <span>{card.checklist_progress}%</span>
            </div>
            <Progress value={card.checklist_progress} className="h-1" />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarIcon className="h-2.5 w-2.5" />{since}</span>
            {(squad || manager) && (
              <span className="flex items-center gap-1 truncate max-w-[140px]">
                <Users className="h-2.5 w-2.5" />
                {manager?.name ?? squad?.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewCardDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [channel, setChannel] = useState("instagram");
  const [niche, setNiche] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("commercial_pipeline_cards").insert({
      name: name.trim(),
      handle: handle.trim() || null,
      primary_channel: channel,
      niche: niche.trim() || null,
      source: source.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao criar card", description: error.message, variant: "destructive" });
      return;
    }
    setName(""); setHandle(""); setNiche(""); setSource("");
    onOpenChange(false);
    onCreated();
    toast({ title: "Card criado", description: "Adicionado em Em contato." });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Novo candidato</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Novo candidato
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do candidato" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Handle principal</Label>
              <Input value={handle} onChange={e => setHandle(e.target.value)} placeholder="@usuario" />
            </div>
            <div className="space-y-1.5">
              <Label>Canal principal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="kwai">Kwai</SelectItem>
                  <SelectItem value="x">X (Twitter)</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nicho</Label>
              <Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="esportes, cassino..." />
            </div>
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Input value={source} onChange={e => setSource(e.target.value)} placeholder="indicação, prospecção..." />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar card"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ChecklistItem {
  id: string; group_label: string; label: string; required: boolean; field_type: string; position: number;
}
interface ChecklistAnswer { item_id: string; checked: boolean; value_text: string | null }

function CardDetailSheet({ card, squads, managers, onClose, onUpdated }: {
  card: Card | null; squads: Squad[]; managers: Manager[]; onClose: () => void; onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, ChecklistAnswer>>({});
  const [notes, setNotes] = useState("");
  const [squadId, setSquadId] = useState<string>("none");

  useEffect(() => {
    if (!card) return;
    setNotes(card.notes ?? "");
    setSquadId(card.squad_id ?? "none");
    (async () => {
      if (!card.id) return;
      // load template items via card's template_id, or active
      let tplId: string | null = null;
      const { data: cardRow } = await supabase
        .from("commercial_pipeline_cards").select("template_id").eq("id", card.id).single();
      tplId = cardRow?.template_id ?? null;
      if (!tplId) {
        const { data: tpl } = await supabase
          .from("commercial_checklist_templates")
          .select("id").eq("is_active", true).order("version", { ascending: false }).limit(1).single();
        tplId = tpl?.id ?? null;
      }
      if (!tplId) { setItems([]); return; }
      const { data: its } = await supabase
        .from("commercial_checklist_items").select("*").eq("template_id", tplId).order("position");
      setItems((its ?? []) as ChecklistItem[]);
      const { data: ans } = await supabase
        .from("commercial_card_checklist").select("item_id,checked,value_text").eq("card_id", card.id);
      const map: Record<string, ChecklistAnswer> = {};
      (ans ?? []).forEach(a => { map[a.item_id] = a as ChecklistAnswer; });
      setAnswers(map);
    })();
  }, [card?.id]);

  if (!card) return null;

  const groups = items.reduce<Record<string, ChecklistItem[]>>((acc, it) => {
    (acc[it.group_label] ??= []).push(it); return acc;
  }, {});

  const totalRequired = items.filter(i => i.required).length;
  const checkedRequired = items.filter(i => i.required && answers[i.id]?.checked).length;
  const pct = totalRequired === 0 ? 0 : Math.round((checkedRequired / totalRequired) * 100);

  async function toggleItem(item: ChecklistItem, checked: boolean) {
    setAnswers(prev => ({ ...prev, [item.id]: { ...(prev[item.id] ?? { item_id: item.id, value_text: null }), checked } }));
    await supabase.from("commercial_card_checklist").upsert({
      card_id: card.id, item_id: item.id, checked, checked_at: checked ? new Date().toISOString() : null,
    }, { onConflict: "card_id,item_id" });
    await supabase.from("commercial_pipeline_cards").update({ checklist_progress: pct }).eq("id", card.id);
    onUpdated();
  }

  async function saveMeta() {
    const payload: Record<string, unknown> = { notes };
    payload.squad_id = squadId === "none" ? null : squadId;
    const { error } = await supabase.from("commercial_pipeline_cards").update(payload).eq("id", card.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Salvo" });
    onUpdated();
  }

  return (
    <Sheet open={!!card} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">{card.name}</SheetTitle>
          <SheetDescription>{card.handle ?? "—"} · {card.niche ?? "sem nicho"} · etapa atual: <span className="text-foreground">{card.stage}</span></SheetDescription>
        </SheetHeader>

        <Tabs defaultValue={card.stage === "cadastro" || card.stage === "analise" ? "cadastro" : "checklist"} className="mt-6">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="checklist">Checklist & squad</TabsTrigger>
            <TabsTrigger value="cadastro">Cadastro completo</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-6 mt-6">
            <div className="rounded-lg border border-border/60 bg-card/40 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Progresso do checklist (obrigatórios)</span>
                <span className="font-medium text-foreground">{checkedRequired} / {totalRequired} · {pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Squad</Label>
                <Select value={squadId} onValueChange={setSquadId}>
                  <SelectTrigger><SelectValue placeholder="Sem squad" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem squad</SelectItem>
                    {squads.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gerente atribuído</Label>
                <Input
                  disabled
                  value={managers.find(m => m.id === card.manager_id)?.name ?? "Atribuído ao mover para Aprovado"}
                />
              </div>
            </div>

            {Object.entries(groups).map(([group, list]) => (
              <div key={group} className="space-y-2">
                <h3 className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </h3>
                <div className="space-y-1.5 rounded-lg border border-border/60 bg-card/40 p-3">
                  {list.map(item => (
                    <label key={item.id} className="flex items-start gap-2.5 py-1 cursor-pointer hover:bg-secondary/40 rounded px-1.5 -mx-1.5">
                      <Checkbox
                        checked={!!answers[item.id]?.checked}
                        onCheckedChange={v => toggleItem(item, !!v)}
                        className="mt-0.5"
                      />
                      <span className="text-sm flex-1">
                        {item.label}
                        {item.required && <span className="text-destructive ml-1">*</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} />
            </div>

            <SheetFooter>
              <Button variant="ghost" onClick={onClose}>Fechar</Button>
              <Button onClick={saveMeta}>Salvar</Button>
            </SheetFooter>
          </TabsContent>

          <TabsContent value="cadastro" className="mt-6">
            <CandidateRegistrationForm
              cardId={card.id}
              initial={card as any}
              onSaved={() => { onUpdated(); }}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
