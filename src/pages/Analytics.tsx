import { useNavigate } from "react-router-dom";
import { BarChart3, ArrowRightLeft } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

export default function Analytics() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Analytics" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro analítico completo — métricas profundas, drill-down e filtros avançados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/conversoes")} className="btn-ghost text-xs gap-1.5"><ArrowRightLeft size={13} />Conversões</button>
        </div>
      </div>

      <div className="glass-card">
        <EmptyState
          icon={BarChart3}
          title="Sem dados analíticos ainda"
          description="Os gráficos e métricas serão exibidos automaticamente quando houver cliques, cadastros e conversões registrados na plataforma."
          actionLabel="Configurar UTMs"
          onAction={() => navigate("/utms")}
          secondaryLabel="Ver Landing Pages"
          onSecondary={() => navigate("/landing-pages")}
        />
      </div>
    </div>
  );
}
