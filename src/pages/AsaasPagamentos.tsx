import { useNavigate } from "react-router-dom";
import { CreditCard, ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

export default function AsaasPagamentos() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Receita", path: "/financeiro" }, { label: "Asaas / Pagamentos" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Asaas / Pagamentos</h1>
          <p className="page-subtitle">Central de pagamentos — envio, processamento e conciliação</p>
        </div>
      </div>

      <div className="glass-card p-5 border border-dashed border-primary/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><CreditCard size={18} className="text-primary" /></div>
          <div className="flex-1">
            <p className="font-medium text-sm">Integração com API de Pagamentos</p>
            <p className="text-xs text-muted-foreground">Estrutura preparada para conexão com a API de pagamentos. Configure nas integrações para ativar.</p>
          </div>
          <button className="btn-ghost text-xs" onClick={() => navigate("/integracoes")}>Configurar</button>
        </div>
      </div>

      <div className="glass-card">
        <EmptyState
          icon={CreditCard}
          title="Nenhum pagamento registrado"
          description="Os pagamentos serão exibidos aqui quando houver saques aprovados e processados pela plataforma."
          secondaryLabel="Ver Saques"
          onSecondary={() => navigate("/saques")}
        />
      </div>
    </div>
  );
}
