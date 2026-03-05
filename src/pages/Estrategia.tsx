import { Target, Lightbulb, AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";

const blocos = [
  { titulo: "Objetivos da Semana", icon: Target, color: "border-l-accent", items: ["Atingir 5.000 cliques/dia", "Aprovar 3 saques pendentes", "Publicar 4 conteúdos", "Ativar novo influencer Marcos"] },
  { titulo: "Objetivos do Mês", icon: Target, color: "border-l-primary", items: ["R$ 100K receita bruta", "20 novos influencers", "Lançar 3 novas LPs", "Integrar API Asaas"] },
  { titulo: "Testes Ativos", icon: Lightbulb, color: "border-l-info", items: ["A/B teste LP Fortune Tiger (CTA azul vs amarelo)", "Teste de copy Telegram (curto vs longo)", "Novo modelo de comissão escalonada"] },
  { titulo: "Hipóteses", icon: Lightbulb, color: "border-l-warning", items: ["Influencers com +300K convertem 2x mais", "Links no Telegram geram CTR 3x maior que Instagram", "LPs com vídeo têm 40% menos bounce"] },
  { titulo: "Aprendizados", icon: CheckCircle, color: "border-l-success", items: ["Fortune Tiger é o jogo com melhor ROI", "Horário 20h-23h tem maior conversão", "CPA puro não compensa em plataformas menores"] },
  { titulo: "Gargalos", icon: AlertTriangle, color: "border-l-destructive", items: ["Aprovação de saques lenta (2+ dias)", "Falta de conteúdo para Sportingbet", "API Asaas ainda não integrada"] },
  { titulo: "Próximas Ações", icon: ArrowRight, color: "border-l-accent", items: ["Contratar editor de vídeo", "Criar LP para KTO", "Negociar RevShare com Pixbet", "Automatizar relatórios semanais"] },
];

export default function Estrategia() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Estratégia</h1><p className="page-subtitle">Gestão estratégica da operação — objetivos, testes e aprendizados</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {blocos.map((b) => (
          <div key={b.titulo} className={`glass-card p-5 border-l-2 ${b.color}`}>
            <div className="flex items-center gap-2 mb-3">
              <b.icon size={15} className="text-muted-foreground" />
              <h3 className="text-sm font-semibold">{b.titulo}</h3>
            </div>
            <ul className="space-y-2">
              {b.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
