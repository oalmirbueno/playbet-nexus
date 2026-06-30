import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

export default function Auditoria() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Auditoria" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
          <p className="text-sm text-muted-foreground mt-1">Log operacional completo - rastreio de ações, alterações e responsáveis</p>
        </div>
      </div>

      <div className="glass-card">
        <EmptyState
          icon={Shield}
          title="Nenhum log registrado"
          description="O log de auditoria será preenchido automaticamente conforme ações forem realizadas no sistema - criação, edição, aprovações e alterações de status."
        />
      </div>
    </div>
  );
}
