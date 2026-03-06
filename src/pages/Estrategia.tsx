import { useState } from "react";
import { Target, Lightbulb, AlertTriangle, ArrowRight, CheckCircle, TrendingUp, Plus, Trash2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

interface StrategicItem {
  id: number; text: string; done: boolean; responsavel?: string; prazo?: string;
}

const blockIcons: Record<string, any> = {
  "Objetivos da Semana": Target, "Objetivos do Mês": Target,
  "Gargalos": AlertTriangle, "Próximas Ações": ArrowRight, "Oportunidades": TrendingUp,
};
const blockBorders: Record<string, string> = {
  "Objetivos da Semana": "border-l-primary", "Objetivos do Mês": "border-l-primary/60",
  "Gargalos": "border-l-destructive/60", "Próximas Ações": "border-l-info/60", "Oportunidades": "border-l-success/60",
};

const emptyBlocks: Record<string, StrategicItem[]> = {
  "Objetivos da Semana": [], "Objetivos do Mês": [],
  "Gargalos": [], "Próximas Ações": [], "Oportunidades": [],
};

export default function Estrategia() {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState(emptyBlocks);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");

  const totalItems = Object.values(blocks).flat().length;

  const toggleItem = (block: string, id: number) => {
    setBlocks(prev => ({ ...prev, [block]: prev[block].map(i => i.id === id ? { ...i, done: !i.done } : i) }));
  };

  const addItem = (block: string) => {
    if (!newItemText) return;
    const maxId = Math.max(...Object.values(blocks).flat().map(i => i.id), 0) + 1;
    setBlocks(prev => ({ ...prev, [block]: [...prev[block], { id: maxId, text: newItemText, done: false }] }));
    setNewItemText("");
    setAddingTo(null);
    toast({ title: "Item adicionado" });
  };

  const removeItem = (block: string, id: number) => {
    setBlocks(prev => ({ ...prev, [block]: prev[block].filter(i => i.id !== id) }));
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/conteudo" }, { label: "Estratégia" }]} />

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Estratégia</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro tático da operação — objetivos, testes, aprendizados e execução</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost text-sm" onClick={() => navigate("/conteudo")}>Conteúdos</button>
          <button className="btn-ghost text-sm" onClick={() => navigate("/campanhas")}>Campanhas</button>
        </div>
      </div>

      {totalItems === 0 && (
        <div className="glass-card mb-6">
          <EmptyState
            icon={Target}
            title="Comece a planejar sua estratégia"
            description="Adicione objetivos, gargalos e oportunidades em cada bloco abaixo para organizar a operação tática."
            compact
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Object.entries(blocks).map(([title, items]) => {
          const Icon = blockIcons[title] || Lightbulb;
          const border = blockBorders[title] || "border-l-muted";
          return (
            <div key={title} className={`glass-card p-6 border-l-2 ${border}`}>
              <div className="flex items-center gap-2.5 mb-4">
                <Icon size={16} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold flex-1">{title}</h3>
                <span className="text-xs text-muted-foreground">{items.filter(i => i.done).length}/{items.length}</span>
              </div>
              <ul className="space-y-3">
                {items.map(item => (
                  <li key={item.id} className="flex items-start gap-3 text-sm group">
                    <button onClick={() => toggleItem(title, item.id)} className={`w-[18px] h-[18px] rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${item.done ? "bg-success/80 border-success" : "border-border hover:border-primary/50"}`}>
                      {item.done && <Check size={11} className="text-success-foreground" />}
                    </button>
                    <span className={`flex-1 ${item.done ? "line-through text-muted-foreground" : "text-foreground/90"}`}>{item.text}</span>
                    <button onClick={() => removeItem(title, item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"><Trash2 size={12} /></button>
                  </li>
                ))}
              </ul>
              {items.length === 0 && !addingTo && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum item adicionado</p>
              )}
              {addingTo === title ? (
                <div className="flex gap-2 mt-4 pt-3 border-t border-border-subtle">
                  <input className="input-field text-sm flex-1" value={newItemText} onChange={e => setNewItemText(e.target.value)} placeholder="Novo item..." onKeyDown={e => e.key === "Enter" && addItem(title)} autoFocus />
                  <button className="btn-primary text-sm px-3 py-1.5" onClick={() => addItem(title)}>+</button>
                </div>
              ) : (
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-4 pt-3 border-t border-border-subtle transition-colors" onClick={() => { setAddingTo(title); setNewItemText(""); }}><Plus size={12} /> Adicionar</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
