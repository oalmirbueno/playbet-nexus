import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Briefcase } from "lucide-react";

interface Squad { id: string; name: string; color: string; is_active: boolean }
interface Manager { id: string; name: string; squad_id: string | null; is_active: boolean }

export default function ComercialSquads() {
  const { toast } = useToast();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [openSquad, setOpenSquad] = useState(false);
  const [openMgr, setOpenMgr] = useState(false);

  async function load() {
    const [s, m, infl] = await Promise.all([
      supabase.from("squads").select("*").eq("is_active", true).order("name"),
      supabase.from("managers").select("*").eq("is_active", true).order("name"),
      supabase.from("influencers").select("manager_id").eq("is_active", true),
    ]);
    if (s.data) setSquads(s.data as Squad[]);
    if (m.data) setManagers(m.data as Manager[]);
    const c: Record<string, number> = {};
    (infl.data ?? []).forEach((i: { manager_id: string | null }) => {
      if (i.manager_id) c[i.manager_id] = (c[i.manager_id] ?? 0) + 1;
    });
    setCounts(c);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Squads & Gerentes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Estrutura de distribuição automática do pipeline.</p>
        </div>
        <div className="flex gap-2">
          <NewSquadDialog open={openSquad} onOpenChange={setOpenSquad} onCreated={load} />
          <NewManagerDialog open={openMgr} onOpenChange={setOpenMgr} squads={squads} onCreated={load} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {squads.map(squad => {
          const sqMgrs = managers.filter(m => m.squad_id === squad.id);
          return (
            <Card key={squad.id} className="p-4 space-y-3 border-border/60 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ background: squad.color }} />
                <h3 className="font-display font-semibold flex-1">{squad.name}</h3>
                <Badge variant="secondary" className="text-[10px]">{sqMgrs.length} gerentes</Badge>
              </div>
              <div className="space-y-1.5">
                {sqMgrs.length === 0 && (
                  <div className="text-xs text-muted-foreground py-2">Sem gerentes vinculados</div>
                )}
                {sqMgrs.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-secondary/40">
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {m.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {counts[m.id] ?? 0} influencers
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
    </div>
  );
}

function NewSquadDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  async function save() {
    if (!name.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    const { error } = await supabase.from("squads").insert({ name: name.trim(), color });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setName(""); onOpenChange(false); onCreated();
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
          <div className="space-y-1.5"><Label>Cor</Label><Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-20" /></div>
        </div>
        <DialogFooter><Button onClick={save}>Criar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewManagerDialog({ open, onOpenChange, squads, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; squads: Squad[]; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [squadId, setSquadId] = useState("none");
  async function save() {
    if (!name.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    const slug = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from("managers").insert({
      name: name.trim(),
      slug,
      team_name: name.trim(),
      squad_id: squadId === "none" ? null : squadId,
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setName(""); setSquadId("none"); onOpenChange(false); onCreated();
    toast({ title: "Gerente criado" });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Gerente</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Novo gerente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
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
        <DialogFooter><Button onClick={save}>Criar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
