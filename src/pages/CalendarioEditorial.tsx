import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

export default function CalendarioEditorial() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/conteudo" }, { label: "Calendário Editorial" }]} />

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário Editorial</h1>
          <p className="text-sm text-muted-foreground mt-1">Planejamento visual de conteúdo</p>
        </div>
        <div className="flex gap-2 items-center">
          <button className="btn-ghost text-sm" onClick={() => navigate("/conteudo")}>Central de Conteúdo</button>
        </div>
      </div>

      <div className="glass-card">
        <EmptyState
          icon={CalendarDays}
          title="Calendário vazio"
          description="Crie conteúdos na Central de Conteúdo para visualizá-los no calendário editorial."
          actionLabel="Criar Conteúdo"
          onAction={() => navigate("/conteudo")}
        />
      </div>
    </div>
  );
}
