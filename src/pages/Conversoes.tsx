import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, BarChart3 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

export default function Conversoes() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Conversões" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conversões</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro de leitura operacional — funil, alertas e drill-down por registro</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/analytics")} className="btn-ghost text-xs gap-1.5"><BarChart3 size={13} />Analytics</button>
        </div>
      </div>

      <div className="glass-card">
        <EmptyState
          icon={ArrowRightLeft}
          title="Nenhuma conversão registrada"
          description="O funil de conversão e os registros detalhados serão exibidos quando houver dados de cliques, cadastros e depósitos rastreados."
          actionLabel="Configurar UTMs"
          onAction={() => navigate("/utms")}
          secondaryLabel="Ver Analytics"
          onSecondary={() => navigate("/analytics")}
        />
      </div>
    </div>
  );
}
