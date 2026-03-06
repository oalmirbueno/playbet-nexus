import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { useCampanhas, useSaques, useSocios } from "@/hooks/useSupabaseQuery";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Financeiro() {
  const navigate = useNavigate();
  const { data: campanhas, isLoading: loadingCampanhas } = useCampanhas();
  const { data: socios, isLoading: loadingSocios } = useSocios();
  const { data: saques, isLoading: loadingSaques } = useSaques();

  const loading = loadingCampanhas || loadingSocios || loadingSaques;

  const resumo = useMemo(() => {
    const totalSaques = saques.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const pendentes = saques.filter((item) => item.status === "Pendente");
    const totalPendentes = pendentes.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const totalDisponivelSocios = socios.reduce((acc, item) => acc + Number(item.disponivel || 0), 0);

    return {
      totalCampanhas: campanhas.length,
      totalSocios: socios.length,
      totalSaques: saques.length,
      totalSaquesValor: totalSaques,
      totalPendentes: pendentes.length,
      totalPendentesValor: totalPendentes,
      totalDisponivelSocios,
    };
  }, [campanhas, socios, saques]);

  const hasData = resumo.totalCampanhas + resumo.totalSocios + resumo.totalSaques > 0;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Financeiro" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle financeiro completo — receitas, saques, sócios e campanhas</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-8 text-sm text-muted-foreground">Carregando financeiro...</div>
      ) : !hasData ? (
        <div className="glass-card">
          <EmptyState
            icon={DollarSign}
            title="Sem registros financeiros"
            description="Povoe os dados demo em Configurações para simular o financeiro completo com valores e calendário."
            actionLabel="Povoar Dados Demo"
            onAction={() => navigate("/configuracoes")}
            secondaryLabel="Ver Regras Financeiras"
            onSecondary={() => navigate("/regras")}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saques cadastrados</p>
              <p className="text-2xl font-semibold mt-1">{resumo.totalSaques}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatBRL(resumo.totalSaquesValor)}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saques pendentes</p>
              <p className="text-2xl font-semibold mt-1">{resumo.totalPendentes}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatBRL(resumo.totalPendentesValor)}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Sócios ativos</p>
              <p className="text-2xl font-semibold mt-1">{resumo.totalSocios}</p>
              <p className="text-xs text-muted-foreground mt-1">Disponível: {formatBRL(resumo.totalDisponivelSocios)}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Campanhas</p>
              <p className="text-2xl font-semibold mt-1">{resumo.totalCampanhas}</p>
              <p className="text-xs text-muted-foreground mt-1">Financeiro ligado à operação</p>
            </div>
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
        </>
      )}
    </div>
  );
}
