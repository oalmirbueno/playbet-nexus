import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock3, CircleCheckBig } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { useConteudo } from "@/hooks/useSupabaseQuery";

function formatDate(value: string | null) {
  if (!value) return "Sem data";
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("pt-BR");
}

export default function CalendarioEditorial() {
  const navigate = useNavigate();
  const { data, isLoading } = useConteudo();

  const items = useMemo(() => {
    return [...data]
      .sort((a, b) => (a.data || "9999-12-31").localeCompare(b.data || "9999-12-31"))
      .slice(0, 24);
  }, [data]);

  const agendados = data.filter((item) => item.status === "Agendado").length;
  const publicados = data.filter((item) => item.status === "Publicado").length;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/conteudo" }, { label: "Calendário Editorial" }]} />

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário Editorial</h1>
          <p className="text-sm text-muted-foreground mt-1">Planejamento visual de conteúdo com dados reais e demo</p>
        </div>
        <div className="flex gap-2 items-center">
          <button className="btn-ghost text-sm" onClick={() => navigate("/conteudo")}>Central de Conteúdo</button>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card p-8 text-sm text-muted-foreground">Carregando calendário...</div>
      ) : data.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={CalendarDays}
            title="Calendário vazio"
            description="Povoe os dados demo para visualizar o calendário completo com campanha, responsáveis e datas."
            actionLabel="Ir para Dados Demo"
            onAction={() => navigate("/configuracoes")}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de conteúdos</p>
              <p className="text-2xl font-semibold mt-1">{data.length}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Agendados</p>
              <p className="text-2xl font-semibold mt-1">{agendados}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Publicados</p>
              <p className="text-2xl font-semibold mt-1">{publicados}</p>
            </div>
          </div>

          <div className="glass-card p-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-secondary/20 p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-[120px] text-sm font-medium">{formatDate(item.data)}</div>
                <div className="flex-1 min-w-[240px]">
                  <p className="text-sm font-medium">{item.tema}</p>
                  <p className="text-xs text-muted-foreground">{item.canal || "Canal não definido"} • {item.influencer || "Responsável não definido"}</p>
                </div>
                <span className="badge-neutral">{item.status || "Sem status"}</span>
                <span className="badge-warning">{item.prioridade || "Média"}</span>
              </div>
            ))}
          </div>

          <div className="glass-card p-5 grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-secondary/20 p-4 flex items-center gap-3">
              <Clock3 size={16} className="text-muted-foreground" />
              <p className="text-sm">Pendências: conteúdos em Ideia, Roteiro e Produção.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4 flex items-center gap-3">
              <CircleCheckBig size={16} className="text-muted-foreground" />
              <p className="text-sm">Use o modo <strong>Todos os dados</strong> para ver a simulação completa.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
