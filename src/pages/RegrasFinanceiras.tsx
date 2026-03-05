import { Scale } from "lucide-react";

export default function RegrasFinanceiras() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Regras Financeiras</h1><p className="page-subtitle">Regras de cálculo, comissão e distribuição de receitas</p></div>
      <div className="glass-card p-6">
        <h3 className="section-title">Fluxo de Cálculo Padrão</h3>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {[
            { label: "Receita Bruta", desc: "100%", color: "text-accent" },
            { label: "- % Influencer", desc: "Variável (10-22%)", color: "text-success" },
            { label: "- 10% Operacional", desc: "Fixo", color: "text-info" },
            { label: "= Base Societária", desc: "Divisão entre sócios", color: "text-primary" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {i > 0 && <span className="text-muted-foreground">→</span>}
              <div className="glass-card-elevated px-4 py-3 rounded-lg text-center min-w-[160px]">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                <p className={`font-bold ${item.color}`}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="section-title">Regras de Saque</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />Saque mínimo: R$ 100,00</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />Prazo de processamento: até 3 dias úteis</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />Aprovação manual obrigatória</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />Método: PIX ou TED</li>
          </ul>
        </div>
        <div className="glass-card p-5">
          <h3 className="section-title">Regras de Comissão</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />Starter: 10% (até 100K seguidores)</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />Standard: 12-15% (100K-300K)</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />Premium: 18-22% (300K+)</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />Negociável para casos especiais</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
