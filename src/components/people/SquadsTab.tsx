import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Trash2, Users, Target, Palette, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSquads, useManagers, useInfluencers } from "@/hooks/useSupabaseQuery";
import { toast } from "@/hooks/use-toast";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

type Edit = {
  id?: string;
  name: string;
  color: string;
  manager_id: string | null;
  monthly_goal: number | null;
  notes: string;
};

const empty: Edit = { name: "", color: COLORS[0], manager_id: null, monthly_goal: null, notes: "" };

export default function SquadsTab() {
  const nav = useNavigate();
  const { data: squads, create, update, remove, isCreating, isUpdating } = useSquads();
  const { data: managers } = useManagers();
  const { data: influencers } = useInfluencers();

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Edit>(empty);

  const grouped = useMemo(() => {
    return squads.map((s: any) => ({
      ...s,
      manager: managers.find((m: any) => m.id === s.manager_id) || null,
      members: influencers.filter((i: any) => i.squad_id === s.id),
    }));
  }, [squads, managers, influencers]);

  const handleSave = async () => {
    if (!edit.name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const payload = {
      name: edit.name.trim(),
      color: edit.color,
      manager_id: edit.manager_id,
      monthly_goal: edit.monthly_goal,
      notes: edit.notes || null,
    };
    if (edit.id) {
      await update({ id: edit.id, updates: payload });
    } else {
      await create(payload);
    }
    setOpen(false);
    setEdit(empty);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Squads</h2>
          <p className="text-xs text-muted-foreground">Times de trabalho · gerente responsável + influencers vinculados</p>
        </div>
        <Button size="sm" onClick={() => { setEdit(empty); setOpen(true); }} className="self-start sm:self-auto">
          <Plus size={14} className="mr-1.5" /> Novo Squad
        </Button>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <Users size={28} className="mx-auto mb-3 text-muted-foreground/60" />
          <p className="text-sm font-medium">Nenhum squad criado</p>
          <p className="text-xs text-muted-foreground mt-1">Organize gerentes e influencers em times de trabalho.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {grouped.map((s: any) => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => nav(`/pessoas/squads/${s.id}`)}
              onKeyDown={(e) => { if (e.key === "Enter") nav(`/pessoas/squads/${s.id}`); }}
              className="group text-left rounded-lg border border-border bg-card p-4 hover:border-primary/60 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2.5 h-10 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold truncate flex items-center gap-1.5">
                      {s.name}
                      <ArrowRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.manager ? `Gerente: ${s.manager.name}` : "Sem gerente"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setEdit({ id: s.id, name: s.name, color: s.color, manager_id: s.manager_id, monthly_goal: s.monthly_goal, notes: s.notes || "" }); setOpen(true); }} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Edit2 size={12} /></button>
                  <button onClick={async () => { if (confirm("Remover squad?")) await remove(s.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-md bg-secondary/40 px-2.5 py-1.5">
                  <p className="text-[9px] uppercase text-muted-foreground tracking-wide">Influencers</p>
                  <p className="text-sm font-semibold">{s.members.length}</p>
                </div>
                <div className="rounded-md bg-secondary/40 px-2.5 py-1.5">
                  <p className="text-[9px] uppercase text-muted-foreground tracking-wide flex items-center gap-1"><Target size={9} /> Meta</p>
                  <p className="text-sm font-semibold">{s.monthly_goal ? `R$ ${Number(s.monthly_goal).toLocaleString("pt-BR")}` : "-"}</p>
                </div>
              </div>

              {s.members.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.members.slice(0, 6).map((m: any) => (
                    <span key={m.id} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/80">{m.name}</span>
                  ))}
                  {s.members.length > 6 && <span className="text-[10px] text-muted-foreground">+{s.members.length - 6}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{edit.id ? "Editar Squad" : "Novo Squad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input className="h-9 text-xs mt-1" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Squad Alpha" />
            </div>
            <div>
              <Label className="text-xs">Gerente responsável</Label>
              <Select value={edit.manager_id || "none"} onValueChange={(v) => setEdit({ ...edit, manager_id: v === "none" ? null : v })}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem gerente</SelectItem>
                  {managers.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5"><Palette size={11} /> Cor</Label>
              <div className="flex gap-1.5 mt-1.5">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setEdit({ ...edit, color: c })} className={`w-6 h-6 rounded ${edit.color === c ? "ring-2 ring-offset-2 ring-offset-background ring-foreground/60" : ""}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Meta mensal (R$)</Label>
              <Input type="number" className="h-9 text-xs mt-1" value={edit.monthly_goal ?? ""} onChange={(e) => setEdit({ ...edit, monthly_goal: e.target.value ? Number(e.target.value) : null })} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isCreating || isUpdating}>{edit.id ? "Salvar" : "Criar squad"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
