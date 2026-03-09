import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Wallet, TrendingUp, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useSocios, useSaques } from "@/hooks/useSupabaseQuery";

const chartTooltip = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "#fff", fontSize: 12 };

export default function SocioDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"resumo" | "saques" | "obs">("resumo");
  const [obs, setObs] = useState("");

  const { data: socios, isLoading } = useSocios();
  const { data: saques } = useSaques();

  const socio = socios.find((s: any) => s.id === id);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!socio) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Sócios", path: "/socios" }, { label: "Não encontrado" }]} />
        <button onClick={() => navigate("/socios")} className="btn-ghost"><ArrowLeft size={14} /> Voltar</button>
        <div className="glass-card p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Sócio não encontrado</p>
          <p className="text-sm mt-2">O ID informado não corresponde a nenhum registro.</p>
        </div>
      </div>
    );
  }

  const sacado = Number(socio.ganhos || 0) - Number(socio.disponivel || 0);
  const saquesSocio = saques.filter((s: any) => s.nome?.toLowerCase().includes(socio.nome?.toLowerCase().split(" ")[0]?.toLowerCase() || "---"));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Sócios", path: "/socios" }, { label: socio.nome }]} />
      <button onClick={() => navigate("/socios")} className="btn-ghost"><ArrowLeft size={14} /> Voltar para Sócios</button>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-accent">{socio.nome?.charAt(0)}</div>
        <div>
          <h1 className="page-header">{socio.nome}</h1>
          <p className="text-sm text-muted-foreground"><span className="badge-primary">{socio.participacao}%</span> participação societária · <span className={socio.status === "Ativo" ? "badge-success" : "badge-neutral"}>{socio.status}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card border-l-2 border-l-accent"><div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground uppercase">Ganhos Acumulados</span><TrendingUp size={14} className="text-muted-foreground" /></div><p className="text-xl font-bold">R$ {Number(socio.ganhos || 0).toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-success"><div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground uppercase">Saldo Disponível</span><Wallet size={14} className="text-muted-foreground" /></div><p className="text-xl font-bold text-success">R$ {Number(socio.disponivel || 0).toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-primary"><div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground uppercase">Total Sacado</span><DollarSign size={14} className="text-muted-foreground" /></div><p className="text-xl font-bold">R$ {sacado.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground uppercase">Último Saque</span><Clock size={14} className="text-muted-foreground" /></div><p className="text-sm font-bold">{socio.ultimo_saque || "—"}</p></div>
      </div>

      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit flex-wrap">
        {(["resumo", "saques", "obs"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? "tab-btn-active" : "tab-btn"}>
            {t === "resumo" ? "Resumo" : t === "saques" ? "Saques" : "Observações"}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="animate-fade-in space-y-4">
          <div className="glass-card p-5">
            <h3 className="section-title">Visão Geral</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-[10px] text-muted-foreground uppercase">Participação</span><p className="font-bold text-lg">{socio.participacao}%</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase">Ganhos</span><p className="font-bold text-lg text-accent">R$ {Number(socio.ganhos || 0).toLocaleString()}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase">Último Saque</span><p className="font-medium">{socio.ultimo_saque || "—"}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase">Status</span><span className={socio.status === "Ativo" ? "badge-success" : "badge-neutral"}>{socio.status}</span></div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate("/saques")} className="btn-ghost text-sm">Ver Saques</button>
            <button onClick={() => navigate("/financeiro")} className="btn-ghost text-sm">Ver Financeiro</button>
          </div>
        </div>
      )}

      {tab === "saques" && (
        <div className="animate-fade-in space-y-4">
          {saquesSocio.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground">
              <p className="font-medium">Nenhum saque registrado</p>
              <button onClick={() => navigate("/saques")} className="btn-primary mt-4">Ir para Saques</button>
            </div>
          ) : (
            <div className="glass-card overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Código</th><th>Valor</th><th>Data</th><th>Conta</th><th>Status</th></tr></thead>
                <tbody>
                  {saquesSocio.map((s: any) => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs">{s.codigo}</td>
                      <td className="font-semibold">R$ {Number(s.valor || 0).toLocaleString()}</td>
                      <td className="text-xs">{s.data || "—"}</td>
                      <td className="font-mono text-xs">{s.conta || "—"}</td>
                      <td><span className={s.status === "Aprovado" ? "badge-success" : s.status === "Pendente" ? "badge-warning" : "badge-danger"}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "obs" && (
        <div className="animate-fade-in glass-card p-5 space-y-3">
          <h3 className="section-title">Observações</h3>
          <textarea className="input-field min-h-[120px]" placeholder="Observações sobre o sócio..." value={obs} onChange={e => setObs(e.target.value)} />
          <button className="btn-primary" onClick={() => toast({ title: "Observação salva" })}>Salvar</button>
        </div>
      )}
    </div>
  );
}
