import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { useInfluencers, useSocios } from "@/hooks/useSupabaseQuery";

export default function Comissoes() {
  const navigate = useNavigate();
  const { data: influencers, isLoading: li } = useInfluencers();
  const { data: socios, isLoading: ls } = useSocios();

  const loading = li || ls;
  const hasData = influencers.length > 0 || socios.length > 0;

  const resumo = useMemo(() => {
    const totalPart = socios.reduce((a: number, s: any) => a + Number(s.participacao || 0), 0);
    return {
      influencersAtivos: influencers.filter((i: any) => i.is_active).length,
      mediaComissao: influencers.length > 0 ? (influencers.reduce((a: number, i: any) => a + Number(i.commission_percent || 0), 0) / influencers.length).toFixed(1) : "0",
      totalSocios: socios.length,
      totalPart,
    };
  }, [influencers, socios]);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Gestão de Receita", path: "/financeiro" }, { label: "Comissões" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comissões</h1>
          <p className="text-sm text-muted-foreground mt-1">Regras de cálculo e distribuição de comissões entre influencers e sócios</p>
        </div>
      </div>

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

      {loading ? (
        <div className="glass-card p-8 text-sm text-muted-foreground">Carregando dados...</div>
      ) : !hasData ? (
        <div className="glass-card">
          <EmptyState
            icon={DollarSign}
            title="Sem dados de comissão"
            description="Os cálculos de comissão serão exibidos quando houver influencers e sócios cadastrados."
            actionLabel="Cadastrar Influencer"
            onAction={() => navigate("/influencers")}
            secondaryLabel="Ver Regras Financeiras"
            onSecondary={() => navigate("/regras")}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Influencers Ativos</p>
              <p className="text-2xl font-semibold mt-1">{resumo.influencersAtivos}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Comissão Média</p>
              <p className="text-2xl font-semibold mt-1">{resumo.mediaComissao}%</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Sócios</p>
              <p className="text-2xl font-semibold mt-1">{resumo.totalSocios}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Participação Total</p>
              <p className="text-2xl font-semibold mt-1">{resumo.totalPart}%</p>
            </div>
          </div>

          {influencers.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-4">Comissão por Influencer</h3>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Influencer</th><th>Comissão %</th><th>Status</th></tr></thead>
                  <tbody>
                    {influencers.map((i: any) => (
                      <tr key={i.id}>
                        <td className="font-medium">{i.name}</td>
                        <td><span className="badge-success">{i.commission_percent || 0}%</span></td>
                        <td><span className={i.is_active ? "badge-success" : "badge-neutral"}>{i.is_active ? "Ativo" : "Inativo"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/socios")}>→ Sócios</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/saques")}>→ Saques</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/regras")}>→ Regras Financeiras</button>
      </div>
    </div>
  );
}
