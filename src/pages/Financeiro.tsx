import { useState } from "react";
import { DollarSign, TrendingUp, Wallet, CreditCard, Download, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const resumo = [
  { label: "Receita Bruta", value: "R$ 284.750", icon: DollarSign, variant: "accent" },
  { label: "10% Operacional", value: "R$ 28.475", icon: TrendingUp, variant: "info" },
  { label: "Total Influencers", value: "R$ 85.425", icon: Wallet, variant: "success" },
  { label: "Base Divisão Societária", value: "R$ 170.850", icon: CreditCard, variant: "primary" },
  { label: "Saldo Líquido", value: "R$ 142.890", icon: DollarSign, variant: "accent" },
  { label: "Saldo em Asaas", value: "R$ 38.200", icon: Wallet, variant: "info" },
  { label: "Disponível p/ Saque", value: "R$ 44.615", icon: CreditCard, variant: "success" },
  { label: "Saldo Comprometido", value: "R$ 23.400", icon: Wallet, variant: "warning" },
];

const fluxo = [
  { data: "05/03", origem: "Afiliado", plataforma: "Bet365", jogo: "Fortune Tiger", influencer: "Rafael M.", bruto: 4500, taxa: 0, percInf: 20, valorInf: 900, operacao: 450, baseSocios: 3150, liquido: 3150, status: "Confirmado" },
  { data: "04/03", origem: "Link Direto", plataforma: "Betano", jogo: "Aviator", influencer: "Carlos S.", bruto: 3200, taxa: 0, percInf: 15, valorInf: 480, operacao: 320, baseSocios: 2400, liquido: 2400, status: "Confirmado" },
  { data: "03/03", origem: "LP", plataforma: "Sportingbet", jogo: "Mines", influencer: "Ana S.", bruto: 2800, taxa: 0, percInf: 12, valorInf: 336, operacao: 280, baseSocios: 2184, liquido: 2184, status: "Pendente" },
  { data: "02/03", origem: "Afiliado", plataforma: "Pixbet", jogo: "Gates of Olympus", influencer: "Pedro L.", bruto: 5100, taxa: 0, percInf: 18, valorInf: 918, operacao: 510, baseSocios: 3672, liquido: 3672, status: "Confirmado" },
  { data: "01/03", origem: "Telegram", plataforma: "Bet365", jogo: "Fortune Tiger", influencer: "Rafael M.", bruto: 6200, taxa: 0, percInf: 20, valorInf: 1240, operacao: 620, baseSocios: 4340, liquido: 4340, status: "Pendente" },
  { data: "28/02", origem: "LP", plataforma: "KTO", jogo: "Aviator", influencer: "Julia C.", bruto: 1900, taxa: 0, percInf: 10, valorInf: 190, operacao: 190, baseSocios: 1520, liquido: 1520, status: "Confirmado" },
];

const receitaPeriodo = [
  { periodo: "Jan", receita: 42000, liquida: 21000 },
  { periodo: "Fev", receita: 58000, liquida: 29000 },
  { periodo: "Mar", receita: 72000, liquida: 36000 },
];

const chartTooltip = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "#fff", fontSize: 12 };

const variants: Record<string, string> = { accent: "border-l-accent", primary: "border-l-primary", info: "border-l-info", success: "border-l-success", warning: "border-l-warning" };

export default function Financeiro() {
  const [tab, setTab] = useState<"resumo" | "fluxo" | "centro">("resumo");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Financeiro</h1>
          <p className="page-subtitle">Controle financeiro completo — receitas, comissões e fluxo de caixa</p>
        </div>
        <button className="btn-secondary"><Download size={14} /> Exportar Relatório</button>
      </div>

      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit">
        {(["resumo", "fluxo", "centro"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? "tab-btn-active" : "tab-btn"}>
            {t === "resumo" ? "Resumo Financeiro" : t === "fluxo" ? "Fluxo Financeiro" : "Centro Financeiro"}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {resumo.map((r) => (
              <div key={r.label} className={`stat-card border-l-2 ${variants[r.variant]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{r.label}</span>
                  <r.icon size={15} className="text-muted-foreground" />
                </div>
                <div className="text-xl font-bold">{r.value}</div>
              </div>
            ))}
          </div>
          <div className="glass-card p-5">
            <h3 className="section-title">Fluxo de Cálculo</h3>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="glass-card-elevated px-4 py-3 rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Receita Bruta</p>
                <p className="font-bold text-accent">R$ 284.750</p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="glass-card-elevated px-4 py-3 rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">- % Influencer</p>
                <p className="font-bold text-success">R$ 85.425</p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="glass-card-elevated px-4 py-3 rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">- 10% Operação</p>
                <p className="font-bold text-info">R$ 28.475</p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="glass-card-elevated px-4 py-3 rounded-lg text-center border border-primary/30">
                <p className="text-[10px] text-muted-foreground uppercase">= Base Sócios</p>
                <p className="font-bold text-primary">R$ 170.850</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "fluxo" && (
        <div className="animate-fade-in glass-card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th><th>Origem</th><th>Plataforma</th><th>Jogo</th><th>Influencer</th>
                <th>Bruto</th><th>% Inf</th><th>Valor Inf</th><th>10% Op</th><th>Base Sócios</th><th>Líquido</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fluxo.map((f, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap text-muted-foreground">{f.data}</td>
                  <td><span className="badge-neutral">{f.origem}</span></td>
                  <td>{f.plataforma}</td>
                  <td>{f.jogo}</td>
                  <td>{f.influencer}</td>
                  <td className="font-medium">R$ {f.bruto.toLocaleString()}</td>
                  <td>{f.percInf}%</td>
                  <td className="text-success">R$ {f.valorInf.toLocaleString()}</td>
                  <td className="text-info">R$ {f.operacao.toLocaleString()}</td>
                  <td>R$ {f.baseSocios.toLocaleString()}</td>
                  <td className="font-semibold">R$ {f.liquido.toLocaleString()}</td>
                  <td><span className={f.status === "Confirmado" ? "badge-success" : "badge-warning"}>{f.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "centro" && (
        <div className="animate-fade-in space-y-4">
          <div className="flex flex-wrap gap-3">
            <select className="select-field"><option>Período: Março 2026</option></select>
            <select className="select-field"><option>Todas Plataformas</option></select>
            <select className="select-field"><option>Todos Jogos</option></select>
            <select className="select-field"><option>Todos Influencers</option></select>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <h3 className="section-title">Receita por Período</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={receitaPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                  <XAxis dataKey="periodo" stroke="hsl(0 0% 40%)" fontSize={11} />
                  <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Bar dataKey="receita" fill="hsl(45 100% 50%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="liquida" fill="hsl(217 85% 40%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card p-5">
              <h3 className="section-title">Evolução da Receita</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={receitaPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                  <XAxis dataKey="periodo" stroke="hsl(0 0% 40%)" fontSize={11} />
                  <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Line type="monotone" dataKey="receita" stroke="hsl(45 100% 50%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="liquida" stroke="hsl(152 69% 41%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
