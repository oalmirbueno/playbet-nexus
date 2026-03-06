import { useNavigate } from "react-router-dom";
import { DollarSign, ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

export default function Comissoes() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Gestão de Receita", path: "/financeiro" }, { label: "Comissões" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comissões</h1>
          <p className="text-sm text-muted-foreground mt-1">Regras de cálculo e distribuição de comissões entre influencers e sócios</p>
        </div>
      </div>

      {/* Formula - keep as reference */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Fórmula de Comissão</h3>
        <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm space-y-1 mb-4">
          <p><span className="text-accent">Receita Bruta</span></p>
          <p>  <span className="text-muted-foreground">−</span> <span className="text-success">Comissão do Influencer (%)</span></p>
          <p>  <span className="text-muted-foreground">−</span> <span className="text-info">10% Retenção Operacional</span></p>
          <p>  <span className="text-muted-foreground">=</span> <span className="text-primary">Base Societária</span></p>
          <p>  <span className="text-muted-foreground">÷</span> <span className="text-accent">Sócios</span> (divisão conforme participação)</p>
        </div>
      </div>

      <div className="glass-card">
        <EmptyState
          icon={DollarSign}
          title="Sem dados de comissão"
          description="Os cálculos de comissão serão exibidos quando houver receita registrada e influencers com percentuais configurados."
          actionLabel="Cadastrar Influencer"
          onAction={() => navigate("/influencers")}
          secondaryLabel="Ver Regras Financeiras"
          onSecondary={() => navigate("/regras")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/socios")}>→ Sócios</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/saques")}>→ Saques</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/regras")}>→ Regras Financeiras</button>
      </div>
    </div>
  );
}
