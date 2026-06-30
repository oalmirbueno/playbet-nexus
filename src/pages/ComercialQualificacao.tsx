import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, ListChecks } from "lucide-react";

interface Template { id: string; name: string; version: number; is_active: boolean; min_required_pct: number; notes: string | null }
interface Item { id: string; group_label: string; label: string; required: boolean; field_type: string; position: number }

export default function ComercialQualificacao() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeTpl, setActiveTpl] = useState<Template | null>(null);

  useEffect(() => {
    (async () => {
      const { data: tpls } = await supabase
        .from("commercial_checklist_templates")
        .select("*").order("version", { ascending: false });
      setTemplates((tpls ?? []) as Template[]);
      const active = (tpls ?? []).find(t => t.is_active) ?? tpls?.[0] ?? null;
      setActiveTpl((active as Template) ?? null);
      if (active) {
        const { data: its } = await supabase
          .from("commercial_checklist_items")
          .select("*").eq("template_id", active.id).order("position");
        setItems((its ?? []) as Item[]);
      }
    })();
  }, []);

  const groups = items.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.group_label] ??= []).push(it); return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Qualificação de afiliados</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Modelo de checklist aplicado automaticamente quando o card chega ao estágio Checklist.
        </p>
      </div>

      {activeTpl && (
        <Card className="p-4 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <ListChecks className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-display font-semibold">{activeTpl.name}</div>
              <div className="text-xs text-muted-foreground">
                Versão {activeTpl.version} · mínimo {activeTpl.min_required_pct}% dos obrigatórios para avançar
              </div>
            </div>
            <Badge variant="secondary">ativo</Badge>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(groups).map(([group, list]) => (
          <Card key={group} className="p-4 border-border/60">
            <h3 className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {group}
            </h3>
            <ul className="space-y-1.5">
              {list.map(item => (
                <li key={item.id} className="flex items-center gap-2 text-sm py-1">
                  <CheckSquare className="h-3.5 w-3.5 text-primary/70" />
                  <span className="flex-1">{item.label}</span>
                  {item.required && <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">obrig.</Badge>}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {templates.length > 1 && (
        <div className="text-xs text-muted-foreground">
          {templates.length} versões disponíveis no histórico
        </div>
      )}
    </div>
  );
}
