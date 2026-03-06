import { useState } from "react";
import { Target, Lightbulb, AlertTriangle, ArrowRight, CheckCircle, TrendingUp, Gamepad2, Monitor, Users, Plus, Trash2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialCampanhas, initialJogos, initialPlataformas, initialConteudos, initialInfluencers } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";

interface StrategicItem {
  id: number;
  text: string;
  done: boolean;
  responsavel?: string;
  prazo?: string;
}

interface Hypothesis {
  id: number;
  hipotese: string;
  objetivo: string;
  responsavel: string;
  status: "Testando" | "Validada" | "Invalidada" | "Pendente";
  resultado: string;
}

interface Learning {
  id: number;
  tipo: "Funcionou" | "Não funcionou";
  descricao: string;
  ajuste: string;
}

interface WeeklyPlanItem {
  id: number;
  meta: string;
  conteudo: string;
  campanha: string;
  jogo: string;
  influencer: string;
  responsavel: string;
  prazo: string;
  done: boolean;
}

const initialBlocks: Record<string, StrategicItem[]> = {
  "Objetivos da Semana": [
    { id: 1, text: "Atingir 5.000 cliques/dia", done: false, responsavel: "Equipe", prazo: "07/03" },
    { id: 2, text: "Aprovar 3 saques pendentes", done: true, responsavel: "Admin", prazo: "06/03" },
    { id: 3, text: "Publicar 4 conteúdos", done: false, responsavel: "Equipe", prazo: "08/03" },
    { id: 4, text: "Ativar novo influencer Marcos", done: false, responsavel: "Admin", prazo: "09/03" },
  ],
  "Objetivos do Mês": [
    { id: 5, text: "R$ 100K receita bruta", done: false, responsavel: "Direção" },
    { id: 6, text: "20 novos influencers", done: false, responsavel: "Comercial" },
    { id: 7, text: "Lançar 3 novas LPs", done: false, responsavel: "Dev" },
    { id: 8, text: "Integrar API Asaas", done: false, responsavel: "Dev" },
  ],
  "Gargalos": [
    { id: 9, text: "Aprovação de saques lenta (2+ dias)", done: false },
    { id: 10, text: "Falta de conteúdo para Sportingbet", done: false },
    { id: 11, text: "API Asaas ainda não integrada", done: false },
  ],
  "Próximas Ações": [
    { id: 12, text: "Contratar editor de vídeo", done: false, responsavel: "RH", prazo: "15/03" },
    { id: 13, text: "Criar LP para KTO", done: false, responsavel: "Dev", prazo: "12/03" },
    { id: 14, text: "Negociar RevShare com Pixbet", done: false, responsavel: "Comercial", prazo: "20/03" },
    { id: 15, text: "Automatizar relatórios semanais", done: false, responsavel: "Dev", prazo: "25/03" },
  ],
  "Oportunidades": [
    { id: 16, text: "Influencer com 800K entrando em contato", done: false },
    { id: 17, text: "Novo jogo Spaceman 2 em pré-lançamento", done: false },
    { id: 18, text: "Black Friday antecipada de plataformas", done: false },
  ],
};

const initialHypotheses: Hypothesis[] = [
  { id: 1, hipotese: "Influencers com +300K convertem 2x mais", objetivo: "Validar ROI por faixa de seguidores", responsavel: "Analytics", status: "Testando", resultado: "Dados parciais confirmam" },
  { id: 2, hipotese: "Links no Telegram geram CTR 3x maior que Instagram", objetivo: "Comparar canais", responsavel: "Marketing", status: "Validada", resultado: "Confirmado: Telegram 18% vs Insta 6%" },
  { id: 3, hipotese: "LPs com vídeo têm 40% menos bounce", objetivo: "Reduzir taxa de saída", responsavel: "Dev", status: "Pendente", resultado: "—" },
];

const initialLearnings: Learning[] = [
  { id: 1, tipo: "Funcionou", descricao: "Fortune Tiger é o jogo com melhor ROI", ajuste: "Priorizar em todas campanhas" },
  { id: 2, tipo: "Funcionou", descricao: "Horário 20h-23h tem maior conversão", ajuste: "Agendar posts nesse horário" },
  { id: 3, tipo: "Não funcionou", descricao: "CPA puro não compensa em plataformas menores", ajuste: "Migrar para RevShare nessas plataformas" },
  { id: 4, tipo: "Não funcionou", descricao: "Conteúdo longo no WhatsApp", ajuste: "Testar mensagens curtas com link direto" },
];

const initialWeeklyPlan: WeeklyPlanItem[] = [
  { id: 1, meta: "5K cliques Fortune Tiger", conteudo: "2 Reels + 1 Story", campanha: "Março Turbo", jogo: "Fortune Tiger", influencer: "Rafael M.", responsavel: "Equipe", prazo: "08/03", done: false },
  { id: 2, meta: "Lançar campanha Aviator", conteudo: "3 Posts Telegram", campanha: "Aviator Week", jogo: "Aviator", influencer: "Pedro L.", responsavel: "Marketing", prazo: "10/03", done: false },
  { id: 3, meta: "Teste A/B LP Mines", conteudo: "Nova LP versão B", campanha: "VIP Mines", jogo: "Mines", influencer: "Ana S.", responsavel: "Dev", prazo: "09/03", done: false },
];

const blockIcons: Record<string, any> = {
  "Objetivos da Semana": Target,
  "Objetivos do Mês": Target,
  "Gargalos": AlertTriangle,
  "Próximas Ações": ArrowRight,
  "Oportunidades": TrendingUp,
};
const blockBorders: Record<string, string> = {
  "Objetivos da Semana": "border-l-primary",
  "Objetivos do Mês": "border-l-primary/60",
  "Gargalos": "border-l-destructive/60",
  "Próximas Ações": "border-l-info/60",
  "Oportunidades": "border-l-success/60",
};
const hypoStatusColors: Record<string, string> = { Testando: "badge-info", Validada: "badge-success", Invalidada: "badge-danger", Pendente: "badge-neutral" };

export default function Estrategia() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Visão Geral");
  const [blocks, setBlocks] = useState(initialBlocks);
  const [hypotheses, setHypotheses] = useState(initialHypotheses);
  const [learnings] = useState(initialLearnings);
  const [weeklyPlan, setWeeklyPlan] = useState(initialWeeklyPlan);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");

  const tabs = ["Visão Geral", "Hipóteses", "Aprendizados", "Plano Semanal", "Prioridades", "Alertas"];

  const campsPrioritarias = initialCampanhas.filter(c => c.status === "Ativa").slice(0, 3);
  const jogosPrioritarios = initialJogos.sort((a, b) => b.receita - a.receita).slice(0, 3);
  const platsPrioritarias = initialPlataformas.filter(p => p.status === "Ativo").slice(0, 3);

  const alerts: { msg: string; path: string; type: string }[] = [];
  const campsAtivas = initialCampanhas.filter(c => c.status === "Ativa");
  campsAtivas.forEach(c => {
    if (!initialConteudos.some(ct => ct.campanha === c.nome)) alerts.push({ msg: `Campanha "${c.nome}" sem conteúdo`, path: "/campanhas", type: "danger" });
  });
  initialJogos.filter(j => j.status === "Ativo" && j.receita > 15000).forEach(j => {
    if (!initialConteudos.some(ct => ct.jogo === j.nome)) alerts.push({ msg: `Jogo prioritário "${j.nome}" sem conteúdo`, path: "/jogos", type: "warning" });
  });
  initialInfluencers.filter(i => i.is_active).forEach(inf => {
    if (!initialConteudos.some(ct => ct.influencer.includes(inf.nome.split(" ")[0]))) alerts.push({ msg: `${inf.nome} sem conteúdo planejado`, path: `/influencers/${inf.id}`, type: "info" });
  });

  const toggleItem = (block: string, id: number) => {
    setBlocks(prev => ({
      ...prev,
      [block]: prev[block].map(i => i.id === id ? { ...i, done: !i.done } : i),
    }));
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

  const toggleWeeklyItem = (id: number) => {
    setWeeklyPlan(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
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
          <button className="btn-ghost text-sm" onClick={() => navigate("/calendario")}>Calendário</button>
          <button className="btn-ghost text-sm" onClick={() => navigate("/campanhas")}>Campanhas</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
        {tabs.map(t => (
          <button key={t} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* VISÃO GERAL */}
      {activeTab === "Visão Geral" && (
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
                      <div className="flex-1 min-w-0">
                        <span className={`${item.done ? "line-through text-muted-foreground" : "text-foreground/90"}`}>{item.text}</span>
                        {(item.responsavel || item.prazo) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.responsavel && <span>{item.responsavel}</span>}
                            {item.responsavel && item.prazo && <span> · </span>}
                            {item.prazo && <span>{item.prazo}</span>}
                          </p>
                        )}
                      </div>
                      <button onClick={() => removeItem(title, item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"><Trash2 size={12} /></button>
                    </li>
                  ))}
                </ul>
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
      )}

      {/* HIPÓTESES */}
      {activeTab === "Hipóteses" && (
        <div className="space-y-6">
          <div className="glass-card overflow-x-auto invisible-scroll rounded-lg">
            <table className="data-table">
              <thead><tr><th>Hipótese</th><th>Objetivo</th><th>Responsável</th><th>Status</th><th>Resultado</th></tr></thead>
              <tbody>
                {hypotheses.map(h => (
                  <tr key={h.id}>
                    <td className="font-medium">{h.hipotese}</td>
                    <td className="text-muted-foreground">{h.objetivo}</td>
                    <td>{h.responsavel}</td>
                    <td><span className={hypoStatusColors[h.status]}>{h.status}</span></td>
                    <td className="text-muted-foreground">{h.resultado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="text-[15px] font-semibold tracking-tight">Testes Ativos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "A/B teste LP Fortune Tiger (CTA azul vs amarelo)", status: "Em andamento" },
              { name: "Teste de copy Telegram (curto vs longo)", status: "Em andamento" },
              { name: "Novo modelo de comissão escalonada", status: "Planejado" },
            ].map((t, i) => (
              <div key={i} className="glass-card p-5 border-l-2 border-l-info/50">
                <p className="text-sm font-medium leading-snug">{t.name}</p>
                <span className="badge-info mt-3 inline-block">{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* APRENDIZADOS */}
      {activeTab === "Aprendizados" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2"><CheckCircle size={15} className="text-success" /> O que funcionou</h3>
            <div className="space-y-3">
              {learnings.filter(l => l.tipo === "Funcionou").map(l => (
                <div key={l.id} className="glass-card p-5 border-l-2 border-l-success/50">
                  <p className="text-sm font-medium mb-2">{l.descricao}</p>
                  <p className="text-xs text-muted-foreground">Ajuste: {l.ajuste}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2"><AlertTriangle size={15} className="text-destructive" /> O que não funcionou</h3>
            <div className="space-y-3">
              {learnings.filter(l => l.tipo === "Não funcionou").map(l => (
                <div key={l.id} className="glass-card p-5 border-l-2 border-l-destructive/40">
                  <p className="text-sm font-medium mb-2">{l.descricao}</p>
                  <p className="text-xs text-muted-foreground">Ajuste: {l.ajuste}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PLANO SEMANAL */}
      {activeTab === "Plano Semanal" && (
        <div className="glass-card overflow-x-auto invisible-scroll rounded-lg">
          <table className="data-table">
            <thead><tr><th className="w-10"></th><th>Meta</th><th>Conteúdo</th><th>Campanha</th><th>Jogo</th><th>Influencer</th><th>Responsável</th><th>Prazo</th></tr></thead>
            <tbody>
              {weeklyPlan.map(item => (
                <tr key={item.id} className={item.done ? "opacity-50" : ""}>
                  <td>
                    <button onClick={() => toggleWeeklyItem(item.id)} className={`w-[18px] h-[18px] rounded border flex items-center justify-center ${item.done ? "bg-success/80 border-success" : "border-border hover:border-primary/50"}`}>
                      {item.done && <Check size={11} className="text-success-foreground" />}
                    </button>
                  </td>
                  <td className={`font-medium ${item.done ? "line-through" : ""}`}>{item.meta}</td>
                  <td className="text-muted-foreground">{item.conteudo}</td>
                  <td><button className="text-primary hover:underline text-sm" onClick={() => navigate("/campanhas")}>{item.campanha}</button></td>
                  <td><button className="text-primary hover:underline text-sm" onClick={() => navigate("/jogos")}>{item.jogo}</button></td>
                  <td>{item.influencer}</td>
                  <td className="text-muted-foreground">{item.responsavel}</td>
                  <td className="whitespace-nowrap text-muted-foreground">{item.prazo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PRIORIDADES */}
      {activeTab === "Prioridades" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2"><Target size={15} className="text-muted-foreground" /> Campanhas Prioritárias</h3>
            <div className="space-y-3">
              {campsPrioritarias.map(c => (
                <div key={c.id} className="glass-card p-5 cursor-pointer hover:border-primary/20 transition-colors" onClick={() => navigate(`/campanhas/${c.id}`)}>
                  <p className="text-sm font-medium">{c.nome}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.objetivo}</p>
                  <span className="badge-success mt-2 inline-block">{c.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2"><Gamepad2 size={15} className="text-muted-foreground" /> Jogos Prioritários</h3>
            <div className="space-y-3">
              {jogosPrioritarios.map(j => (
                <div key={j.id} className="glass-card p-5 cursor-pointer hover:border-primary/20 transition-colors" onClick={() => navigate(`/jogos/${j.id}`)}>
                  <p className="text-sm font-medium">{j.nome}</p>
                  <p className="text-xs text-muted-foreground mt-1">Receita: R$ {j.receita.toLocaleString()} · CTR: {j.ctr}</p>
                  <span className="badge-neutral mt-2 inline-block">{j.cat}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight mb-4 flex items-center gap-2"><Monitor size={15} className="text-muted-foreground" /> Plataformas Prioritárias</h3>
            <div className="space-y-3">
              {platsPrioritarias.map(p => (
                <div key={p.id} className="glass-card p-5 cursor-pointer hover:border-primary/20 transition-colors" onClick={() => navigate(`/plataformas/${p.id}`)}>
                  <p className="text-sm font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.tipo} · {p.jogos} jogos · {p.links} links</p>
                  <span className="badge-success mt-2 inline-block">{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ALERTAS */}
      {activeTab === "Alertas" && (
        <div className="space-y-3">
          {alerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">Nenhum alerta operacional no momento</p>}
          {alerts.map((a, i) => (
            <div key={i} className={`glass-card p-5 flex items-start gap-4 border-l-2 cursor-pointer hover:border-primary/20 transition-colors ${a.type === "danger" ? "border-l-destructive/60" : a.type === "warning" ? "border-l-warning/60" : "border-l-info/60"}`} onClick={() => navigate(a.path)}>
              <AlertTriangle size={15} className={`shrink-0 mt-0.5 ${a.type === "danger" ? "text-destructive" : a.type === "warning" ? "text-warning" : "text-info"}`} />
              <div>
                <p className="text-sm font-medium">{a.msg}</p>
                <p className="text-xs text-muted-foreground mt-1">Clique para resolver →</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
