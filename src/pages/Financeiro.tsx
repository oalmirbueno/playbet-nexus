import { useNavigate } from "react-router-dom";
import { DollarSign, ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

export default function Financeiro() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Financeiro" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle financeiro completo — receitas, comissões, fluxo de caixa e alertas</p>
        </div>
      </div>

      <div className="glass-card">
        <EmptyState
          icon={DollarSign}
          title="Sem registros financeiros"
          description="O controle financeiro será preenchido automaticamente quando houver receitas, comissões e pagamentos registrados na operação."
          actionLabel="Ver Comissões"
          onAction={() => navigate("/comissoes")}
          secondaryLabel="Ver Regras Financeiras"
          onSecondary={() => navigate("/regras")}
        />
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Módulos relacionados</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            { label: "Comissões", path: "/comissoes" },
            { label: "Saques", path: "/saques" },
            { label: "Sócios", path: "/socios" },
            { label: "Regras Financeiras", path: "/regras" },
            { label: "Pagamentos Asaas", path: "/asaas-pagamentos" },
          ].map((item) => (
            <div
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <span className="text-sm flex-1">{item.label}</span>
              <ArrowRight size={14} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
