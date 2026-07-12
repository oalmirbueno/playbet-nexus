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
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from "@dnd-kit/core";
import { Plus, GripVertical, Users, Calendar as CalendarIcon, Sparkles, KeyRound, Copy, Check, Loader2, ShieldCheck, FileDown } from "lucide-react";
import { exportCandidateDossierPdf, type DossierCard, type DossierContext } from "@/lib/exportCandidatePdf";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Stage =
  | "em_contato" | "respondeu" | "checklist" | "cadastro"
  | "analise" | "aprovado" | "concluido" | "standby" | "desqualificado";

const STAGES: { id: Stage; label: string; accent: string; tone?: "danger" | "muted" }[] = [
  { id: "em_contato", label: "Em contato", accent: "from-slate-500/20 to-slate-500/0" },
  { id: "respondeu", label: "Respondeu", accent: "from-sky-500/20 to-sky-500/0" },
  { id: "checklist", label: "Checklist", accent: "from-violet-500/20 to-violet-500/0" },
  { id: "cadastro", label: "Cadastro", accent: "from-indigo-500/20 to-indigo-500/0" },
  { id: "analise", label: "Análise", accent: "from-amber-500/20 to-amber-500/0" },
  { id: "aprovado", label: "Aprovado", accent: "from-emerald-500/20 to-emerald-500/0" },
  { id: "concluido", label: "Concluído", accent: "from-primary/30 to-primary/0" },
  { id: "standby", label: "Standby (futuro)", accent: "from-zinc-500/25 to-zinc-500/0", tone: "muted" },
  { id: "desqualificado", label: "Desqualificado", accent: "from-red-500/25 to-red-500/0", tone: "danger" },
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
  squad_ids: string[] | null;
  manager_id: string | null;
  checklist_progress: number;
  stage_moved_at: string;
  notes: string | null;
  role_type: "influencer" | "gerente" | null;
  generated_email: string | null;
  generated_password: string | null;
  generated_user_id: string | null;
  credentials_generated_at: string | null;
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
  const [exportingAnalise, setExportingAnalise] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

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

  async function exportAnaliseDossies(targetCards?: Card[]) {
    const target = targetCards ?? cards.filter(c => c.stage === "analise");
    if (target.length === 0) {
      toast({ title: "Nada para exportar", description: "Nenhum card em Análise." });
      return;
    }
    setExportingAnalise(true);
    try {
      const ids = target.map(c => c.id);
      const { data: fullRows } = await supabase
        .from("commercial_pipeline_cards").select("*").in("id", ids);
      const rowsById = new Map<string, any>();
      (fullRows ?? []).forEach(r => rowsById.set(r.id, r));

      // active checklist template (single fetch)
      const { data: tpl } = await supabase
        .from("commercial_checklist_templates")
        .select("id").eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle();
      let items: any[] = [];
      if (tpl?.id) {
        const { data } = await supabase
          .from("commercial_checklist_items").select("id,group_label,label,required").eq("template_id", tpl.id).order("position");
        items = data ?? [];
      }

      const ctxByCard: Record<string, DossierContext> = {};
      for (const c of target) {
        const { data: ans } = await supabase
          .from("commercial_card_checklist").select("item_id,checked,value_text").eq("card_id", c.id);
        const answers: Record<string, { checked: boolean; value_text?: string | null }> = {};
        (ans ?? []).forEach(a => { answers[a.item_id] = { checked: a.checked, value_text: a.value_text }; });
        ctxByCard[c.id] = {
          squads: squads.map(s => ({ id: s.id, name: s.name })),
          managers: managers.map(m => ({ id: m.id, name: m.name })),
          checklist: { items, answers },
        };
      }

      const dossierCards: DossierCard[] = target.map(c => {
        const full = rowsById.get(c.id) ?? {};
        return {
          id: c.id,
          name: full.name ?? c.name,
          handle: full.handle ?? c.handle,
          primary_channel: full.primary_channel ?? c.primary_channel,
          source: full.source ?? c.source,
          niche: full.niche ?? c.niche,
          tags: full.tags ?? c.tags ?? [],
          email: full.email ?? c.email,
          phone: full.phone ?? c.phone,
          city: full.city ?? c.city,
          uf: full.uf ?? c.uf,
          document: full.document ?? null,
          stage: full.stage ?? c.stage,
          stage_moved_at: full.stage_moved_at ?? c.stage_moved_at,
          responded_at: full.responded_at ?? null,
          created_at: full.created_at ?? null,
          notes: full.notes ?? c.notes,
          checklist_progress: full.checklist_progress ?? c.checklist_progress ?? 0,
          social_profiles: full.social_profiles ?? [],
          content_info: full.content_info ?? {},
          financial_info: full.financial_info ?? {},
          squad_id: full.squad_id ?? c.squad_id,
          squad_ids: full.squad_ids ?? c.squad_ids ?? [],
          manager_id: full.manager_id ?? c.manager_id,
        };
      });

      await exportCandidateDossierPdf(dossierCards, ctxByCard, {
        subtitle: target.length === 1 ? "Analise comercial" : `Analise comercial - ${target.length} candidatos`,
      });
      toast({
        title: "Dossie exportado",
        description: `${target.length} candidato${target.length > 1 ? "s" : ""} pronto${target.length > 1 ? "s" : ""} para envio.`,
      });
    } catch (e: any) {
      toast({ title: "Erro ao exportar PDF", description: e?.message ?? "Falha inesperada", variant: "destructive" });
    } finally {
      setExportingAnalise(false);
    }
  }

  const analiseCount = useMemo(() => cards.filter(c => c.stage === "analise").length, [cards]);
  const stageCount = STAGES.length;
  const totalCards = filtered.length;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 px-3 sm:px-4 md:px-5 xl:px-6 py-3 xl:py-4 border-b border-border/60 bg-background/70 backdrop-blur-xl sticky top-0 z-10 shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-display font-semibold tracking-tight">Pipeline comercial</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 hidden sm:block max-w-[48rem]">
            Captação, qualificação e ativação de afiliados · {stageCount} estágios · {totalCards} cards
          </p>
        </div>
        <div className="flex items-center gap-2 w-full xl:w-auto">
          <Input
            placeholder="Buscar candidato, handle ou nicho..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="min-w-0 flex-1 xl:w-72 h-9"
          />
          <NewCardDialog open={newOpen} onOpenChange={setNewOpen} onCreated={load} />
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div
          className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-3 sm:px-4 md:px-5 xl:px-6 py-4 xl:py-5 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch] snap-x snap-mandatory xl:snap-none"
          style={{ scrollbarColor: "hsl(var(--border)) transparent" }}
        >
          <div className="flex gap-3 md:gap-4 h-full pb-2 w-max">
            {STAGES.map(stage => (
              <div key={stage.id} className="snap-start xl:snap-align-none">
                <Column
                  stage={stage}
                  cards={byStage[stage.id] ?? []}
                  squads={squads}
                  managers={managers}
                  loading={loading}
                  onOpen={setOpenCard}
                />
              </div>
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
  stage: { id: Stage; label: string; accent: string; tone?: "danger" | "muted" };
  cards: Card[];
  squads: Squad[];
  managers: Manager[];
  loading: boolean;
  onOpen: (c: Card) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const borderTone =
    stage.tone === "danger" ? "border-red-500/40" :
    stage.tone === "muted" ? "border-zinc-500/40" :
    "border-border/60";
  const labelTone =
    stage.tone === "danger" ? "text-red-500" :
    stage.tone === "muted" ? "text-zinc-400" :
    "text-foreground/90";
  return (
    <div
      ref={setNodeRef}
      data-pipeline-column="true"
      className={`w-[82vw] sm:w-[300px] xl:w-[280px] 2xl:w-[300px] flex-shrink-0 flex flex-col rounded-xl border ${borderTone} bg-card/40 backdrop-blur transition-colors h-full ${
        isOver ? "ring-2 ring-primary/40 bg-card/70" : ""
      }`}
    >
      <div className={`px-3 py-2.5 rounded-t-xl bg-gradient-to-b ${stage.accent} border-b ${borderTone} sticky top-0`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] md:text-xs font-display font-semibold uppercase tracking-wider truncate ${labelTone}`}>
            {stage.label}
          </span>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0 ml-2">{cards.length}</Badge>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[140px] overflow-y-auto [scrollbar-width:thin] overscroll-contain">
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
      {...attributes}
      {...listeners}
      className={`group relative rounded-lg border border-border/60 bg-card p-3 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing touch-none select-none ${
        isDragging || dragging ? "opacity-50" : ""
      }`}
      onClick={onOpen}
    >
      <div className="flex items-start gap-2">
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

          {card.generated_password && (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
              <CopyCredentialsButton card={card} compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildCredentialsMessage(card: Card): string {
  return [
    `Olá ${card.name}! Seu acesso ao Painel Playbet foi liberado 🎉`,
    ``,
    `🔗 https://painelcentral.playbet.app.br`,
    `👤 Login: ${card.generated_email}`,
    `🔑 Senha: ${card.generated_password}`,
    ``,
    card.role_type === "gerente"
      ? `Perfil: Gerente`
      : `Perfil: Influenciador`,
    ``,
    `Você pode trocar sua senha a qualquer momento em Perfil → Segurança.`,
  ].join("\n");
}

function CopyCredentialsButton({ card, compact }: { card: Card; compact?: boolean }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(buildCredentialsMessage(card));
      setCopied(true);
      toast({ title: "Credenciais copiadas", description: "Cole no WhatsApp do usuário." });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  }
  if (compact) {
    return (
      <button
        onClick={copy}
        className="w-full flex items-center justify-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-medium py-1.5 px-2 transition-colors"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copiado" : "Copiar credenciais"}
      </button>
    );
  }
  return (
    <Button size="sm" variant="secondary" onClick={copy} className="gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : "Copiar mensagem para WhatsApp"}
    </Button>
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
  const [squadIds, setSquadIds] = useState<string[]>([]);
  const isManagerCard = card?.role_type === "gerente";

  useEffect(() => {
    if (!card) return;
    setNotes(card.notes ?? "");
    setSquadId(card.squad_id ?? "none");
    setSquadIds(card.squad_ids ?? (card.squad_id ? [card.squad_id] : []));
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
    if (isManagerCard) {
      payload.squad_ids = squadIds;
      payload.squad_id = squadIds[0] ?? null;
    } else {
      payload.squad_id = squadId === "none" ? null : squadId;
      payload.squad_ids = [];
    }
    const { error } = await supabase.from("commercial_pipeline_cards").update(payload).eq("id", card.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Salvo" });
    onUpdated();
  }

  function toggleSquad(id: string) {
    setSquadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const hierarchyFromCount = (n: number) =>
    n >= 5 ? { label: "Diretor de Squads", tone: "text-fuchsia-500" }
    : n >= 3 ? { label: "Gerente Diretor", tone: "text-indigo-500" }
    : { label: "Gerente", tone: "text-emerald-500" };


  return (
    <Sheet open={!!card} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">{card.name}</SheetTitle>
          <SheetDescription>{card.handle ?? "—"} · {card.niche ?? "sem nicho"} · etapa atual: <span className="text-foreground">{card.stage}</span></SheetDescription>
        </SheetHeader>

        {(card.stage === "aprovado" || card.stage === "concluido") && (
          <AccessProvisioningPanel card={card} onUpdated={onUpdated} />
        )}



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

            {isManagerCard ? (
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Squads sob responsabilidade
                  </Label>
                  {(() => {
                    const h = hierarchyFromCount(squadIds.length);
                    return (
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${h.tone}`}>
                        {squadIds.length} squad{squadIds.length === 1 ? "" : "s"} · {h.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {squads.map(s => {
                    const checked = squadIds.includes(s.id);
                    return (
                      <label key={s.id} className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs cursor-pointer transition-colors ${checked ? "border-indigo-500/60 bg-indigo-500/10" : "border-border/60 hover:bg-secondary/40"}`}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleSquad(s.id)} />
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                  {squads.length === 0 && (
                    <p className="col-span-2 text-[11px] text-muted-foreground">Nenhum squad criado ainda.</p>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Hierarquia automática: <span className="text-emerald-500">1–2 gerente</span> · <span className="text-indigo-500">3–4 gerente diretor</span> · <span className="text-fuchsia-500">5+ diretor de squads</span>.
                </p>
              </div>
            ) : (
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
            )}

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

function AccessProvisioningPanel({ card, onUpdated }: { card: Card; onUpdated: () => void }) {
  const { toast } = useToast();
  const [roleType, setRoleType] = useState<"influencer" | "gerente">(card.role_type ?? "influencer");
  const [provisioning, setProvisioning] = useState(false);
  const hasCreds = !!card.generated_password && !!card.generated_email;

  async function provision(chosen: "influencer" | "gerente") {
    if (!card.email) {
      toast({
        title: "E-mail obrigatório",
        description: "Preencha o e-mail no cadastro completo antes de gerar o acesso.",
        variant: "destructive",
      });
      return;
    }
    setProvisioning(true);
    const { data, error } = await supabase.functions.invoke("admin-user-manage", {
      body: { action: "provision_access_from_card", card_id: card.id, role_type: chosen },
    });
    setProvisioning(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Não foi possível gerar o acesso",
        description: (data as any)?.error ?? error?.message ?? "erro desconhecido",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Acesso criado",
      description: `Login e senha prontos para enviar ao ${chosen === "gerente" ? "gerente" : "influenciador"}.`,
    });
    onUpdated();
  }

  return (
    <div className="mt-5 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-display font-semibold">Acesso ao painel</h3>
            {hasCreds && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Ativo
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasCreds
              ? "Credenciais geradas — copie e envie no WhatsApp do usuário."
              : "Escolha o perfil e gere login e senha automaticamente."}
          </p>
        </div>
      </div>

      {!hasCreds && (
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">É gerente?</Label>
            <RadioGroup
              value={roleType}
              onValueChange={(v) => setRoleType(v as "influencer" | "gerente")}
              className="mt-2 grid grid-cols-2 gap-2"
            >
              <label
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                  roleType === "influencer" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/40"
                }`}
              >
                <RadioGroupItem value="influencer" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">Não · Influenciador</div>
                  <div className="text-[10.5px] text-muted-foreground">Portal do influenciador</div>
                </div>
              </label>
              <label
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                  roleType === "gerente" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/40"
                }`}
              >
                <RadioGroupItem value="gerente" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">Sim · Gerente</div>
                  <div className="text-[10.5px] text-muted-foreground">Portal do gerente + squad</div>
                </div>
              </label>
            </RadioGroup>
          </div>
          <Button
            onClick={() => provision(roleType)}
            disabled={provisioning}
            className="w-full gap-2"
          >
            {provisioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {provisioning ? "Gerando acesso..." : "Gerar login e senha"}
          </Button>
        </div>
      )}

      {hasCreds && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CredField label="Login" value={card.generated_email!} />
            <CredField label="Senha" value={card.generated_password!} mono />
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10.5px] text-muted-foreground">
              Perfil: <span className="text-foreground font-medium">
                {card.role_type === "gerente" ? "Gerente" : "Influenciador"}
              </span>
              {card.credentials_generated_at && (
                <> · gerado {formatDistanceToNow(new Date(card.credentials_generated_at), { addSuffix: true, locale: ptBR })}</>
              )}
            </span>
            <CopyCredentialsButton card={card} />
          </div>
        </div>
      )}
    </div>
  );
}

function CredField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: `${label} copiado` });
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className={`flex-1 text-sm truncate ${mono ? "font-mono" : ""}`}>{value}</span>
        <button
          onClick={copy}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Copiar ${label}`}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

