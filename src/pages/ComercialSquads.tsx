import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Briefcase, Crown, Shield, Sparkles } from "lucide-react";

interface Squad { id: string; name: string; color: string; is_active: boolean; director_id: string | null }
interface Manager {
  id: string; name: string; squad_id: string | null; is_active: boolean;
  origin_type: "influencer" | "socio" | "standalone";
  influencer_id: string | null;
  socio_id: string | null;
  compensation_mode: "manager" | "socio_only" | "influencer_only";
}
interface Director { id: string; name: string; color: string; title: string; is_active: boolean }
interface Influencer { id: string; name: string; slug: string; manager_id: string | null }
interface Socio { id: string; nome: string }

export default function ComercialSquads() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [directors, setDirectors] = useState<Director[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [openSquad, setOpenSquad] = useState(false);
  const [openMgr, setOpenMgr] = useState(false);
  const [openDir, setOpenDir] = useState(false);

  async function load() {
    const [s, m, d, infl, so] = await Promise.all([
      supabase.from("squads").select("*").eq("is_active", true).order("name"),
      supabase.from("managers").select("*").eq("is_active", true).order("name"),
      supabase.from("directors").select("*").eq("is_active", true).order("name"),
      supabase.from("influencers").select("id,name,slug,manager_id").eq("is_active", true).order("name"),
      supabase.from("socios").select("id,nome").order("nome"),
    ]);
    if (s.data) setSquads(s.data as Squad[]);
    if (m.data) setManagers(m.data as Manager[]);
    if (d.data) setDirectors(d.data as Director[]);
    if (infl.data) setInfluencers(infl.data as Influencer[]);
    if (so.data) setSocios(so.data as Socio[]);
    const c: Record<string, number> = {};
    (infl.data ?? []).forEach((i: Influencer) => {
      if (i.manager_id) c[i.manager_id] = (c[i.manager_id] ?? 0) + 1;
    });
    setCounts(c);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Diretores · Squads · Gerentes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Hierarquia oficial · <span className="text-foreground/80">Diretor de Squads → Gerente → Squad → Influenciador</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NewDirectorDialog open={openDir} onOpenChange={setOpenDir} onCreated={load} />
          <NewSquadDialog open={openSquad} onOpenChange={setOpenSquad} directors={directors} onCreated={load} />
          <NewManagerDialog
            open={openMgr}
            onOpenChange={setOpenMgr}
            squads={squads}
            influencers={influencers}
            socios={socios}
            existingManagers={managers}
            onCreated={load}
          />
        </div>
      </div>

      {/* Diretores */}
      {directors.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Shield className="h-3.5 w-3.5" /> Diretores de Squads
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {directors.map(d => {
              const dSquads = squads.filter(sq => sq.director_id === d.id);
              const dMgrCount = managers.filter(m => dSquads.some(sq => sq.id === m.squad_id)).length;
              return (
                <Card key={d.id} className="p-3 border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${d.color}22`, color: d.color }}>
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{d.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{d.title}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 text-[11px] text-muted-foreground">
                    <span>{dSquads.length} squads</span>
                    <span>·</span>
                    <span>{dMgrCount} gerentes</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Squads */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <Briefcase className="h-3.5 w-3.5" /> Squads
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {squads.map(squad => {
            const sqMgrs = managers.filter(m => m.squad_id === squad.id);
            const director = directors.find(d => d.id === squad.director_id) || null;
            return (
              <Card key={squad.id} className="p-4 space-y-3 border-border/60 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ background: squad.color }} />
                  <h3 className="font-display font-semibold flex-1 truncate">{squad.name}</h3>
                  <Badge variant="secondary" className="text-[10px]">{sqMgrs.length} gerentes</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  {director ? <span className="truncate">{director.name}</span> : <SquadDirectorPicker squad={squad} directors={directors} onChanged={load} />}
                </div>
                <div className="space-y-1.5">
                  {sqMgrs.length === 0 && (
                    <div className="text-xs text-muted-foreground py-2">Sem gerentes vinculados</div>
                  )}
                  {sqMgrs.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-secondary/40">
                      <span className="flex items-center gap-2 min-w-0">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{m.name}</span>
                        {m.origin_type === "socio" && (
                          <Badge className="h-4 px-1.5 text-[9px] gap-0.5 bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
                            <Crown className="h-2.5 w-2.5" /> Sócio
                          </Badge>
                        )}
                        {m.origin_type === "influencer" && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" /> Influencer
                          </Badge>
                        )}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                        {counts[m.id] ?? 0} infl.
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
          {squads.length === 0 && (
            <Card className="p-8 col-span-full text-center border-dashed">
              <Briefcase className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum squad criado ainda.</p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

function SquadDirectorPicker({ squad, directors, onChanged }: { squad: Squad; directors: Director[]; onChanged: () => void }) {
  const { toast } = useToast();
  async function assign(id: string) {
    const { error } = await supabase.from("squads").update({ director_id: id === "none" ? null : id }).eq("id", squad.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    onChanged();
  }
  return (
    <Select value={squad.director_id || "none"} onValueChange={assign}>
      <SelectTrigger className="h-6 text-[11px] border-dashed w-auto gap-1 px-2 bg-transparent"><SelectValue placeholder="Definir diretor" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sem diretor</SelectItem>
        {directors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function NewDirectorDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [title, setTitle] = useState("Diretor de Squads");
  async function save() {
    if (!name.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    const slug = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from("directors").insert({ name: name.trim(), slug, title, color });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setName(""); onOpenChange(false); onCreated();
    toast({ title: "Diretor criado" });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5"><Shield className="h-4 w-4" />Diretor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Novo diretor</DialogTitle>
          <DialogDescription>Cargo acima de gerente. Cuida de vários squads.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Cargo</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Cor</Label><Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-20" /></div>
        </div>
        <DialogFooter><Button onClick={save}>Criar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewSquadDialog({ open, onOpenChange, directors, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; directors: Director[]; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [directorId, setDirectorId] = useState("none");
  async function save() {
    if (!name.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    const { error } = await supabase.from("squads").insert({ name: name.trim(), color, director_id: directorId === "none" ? null : directorId });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setName(""); setDirectorId("none"); onOpenChange(false); onCreated();
    toast({ title: "Squad criado" });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-4 w-4" />Squad</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Novo squad</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Diretor responsável</Label>
            <Select value={directorId} onValueChange={setDirectorId}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem diretor</SelectItem>
                {directors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Cor</Label><Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-20" /></div>
        </div>
        <DialogFooter><Button onClick={save}>Criar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewManagerDialog({
  open, onOpenChange, squads, influencers, socios, existingManagers, onCreated,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  squads: Squad[]; influencers: Influencer[]; socios: Socio[]; existingManagers: Manager[];
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [personKey, setPersonKey] = useState<string>("");
  const [squadId, setSquadId] = useState("none");

  const usedInfluencerIds = useMemo(() => new Set(existingManagers.map(m => m.influencer_id).filter(Boolean) as string[]), [existingManagers]);
  const usedSocioIds = useMemo(() => new Set(existingManagers.map(m => m.socio_id).filter(Boolean) as string[]), [existingManagers]);

  const selected = useMemo(() => {
    if (!personKey) return null;
    const [type, id] = personKey.split(":");
    if (type === "socio") return { type: "socio" as const, id, name: socios.find(s => s.id === id)?.nome ?? "" };
    if (type === "influencer") return { type: "influencer" as const, id, name: influencers.find(i => i.id === id)?.name ?? "" };
    return null;
  }, [personKey, socios, influencers]);

  async function save() {
    if (!selected) return toast({ title: "Selecione uma pessoa", variant: "destructive" });
    const baseName = selected.name.trim();
    const slug = baseName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from("managers").insert({
      name: baseName,
      slug,
      team_name: baseName,
      squad_id: squadId === "none" ? null : squadId,
      influencer_id: selected.type === "influencer" ? selected.id : null,
      socio_id: selected.type === "socio" ? selected.id : null,
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setPersonKey(""); setSquadId("none"); onOpenChange(false); onCreated();
    toast({
      title: "Gerente criado",
      description: selected.type === "socio"
        ? "Sócio vinculado como gerente — remuneração apenas via sócio (não recebe comissão de gerente)."
        : "Influenciador promovido a gerente.",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Gerente</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Novo gerente</DialogTitle>
          <DialogDescription>
            Gerentes vêm de pessoas já cadastradas — sócios ou influenciadores. Nunca criados do zero.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Pessoa</Label>
            <Select value={personKey} onValueChange={setPersonKey}>
              <SelectTrigger><SelectValue placeholder="Escolher sócio ou influenciador" /></SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Sócios</div>
                {socios.filter(s => !usedSocioIds.has(s.id)).map(s => (
                  <SelectItem key={s.id} value={`socio:${s.id}`}>
                    👑 {s.nome} <span className="text-muted-foreground">· sócio</span>
                  </SelectItem>
                ))}
                {socios.filter(s => !usedSocioIds.has(s.id)).length === 0 && (
                  <div className="px-2 py-1 text-[11px] text-muted-foreground">Todos sócios já são gerentes</div>
                )}
                <div className="px-2 py-1 mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Influenciadores</div>
                {influencers.filter(i => !usedInfluencerIds.has(i.id)).map(i => (
                  <SelectItem key={i.id} value={`influencer:${i.id}`}>{i.name}</SelectItem>
                ))}
                {influencers.filter(i => !usedInfluencerIds.has(i.id)).length === 0 && (
                  <div className="px-2 py-1 text-[11px] text-muted-foreground">Nenhum influenciador disponível</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selected?.type === "socio" && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300 flex gap-2">
              <Crown className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Sócio identificado. Este gerente <strong>não</strong> recebe comissão de gerente nem de influenciador — só a distribuição de sócio.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Squad</Label>
            <Select value={squadId} onValueChange={setSquadId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem squad</SelectItem>
                {squads.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!selected}>Criar gerente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
