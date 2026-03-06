import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MousePointerClick, UserPlus, DollarSign, TrendingUp, Monitor, Gamepad2 } from "lucide-react";

const weeklyData = [
  { day: "Seg", cliques: 320, cadastros: 45, receita: 1200 },
  { day: "Ter", cliques: 450, cadastros: 62, receita: 1800 },
  { day: "Qua", cliques: 380, cadastros: 51, receita: 1500 },
  { day: "Qui", cliques: 520, cadastros: 78, receita: 2200 },
  { day: "Sex", cliques: 610, cadastros: 95, receita: 2800 },
  { day: "Sáb", cliques: 780, cadastros: 120, receita: 3500 },
  { day: "Dom", cliques: 690, cadastros: 108, receita: 3100 },
];

const plataformaData = [
  { name: "Bet365", receita: 12500 },
  { name: "Betano", receita: 9800 },
  { name: "Sportingbet", receita: 7200 },
  { name: "Pixbet", receita: 5400 },
];

const jogoData = [
  { name: "Fortune Tiger", receita: 8200 },
  { name: "Aviator", receita: 6500 },
  { name: "Mines", receita: 4800 },
  { name: "Spaceman", receita: 3200 },
];

const stats = [
  { label: "Cliques hoje", value: "3.750", icon: MousePointerClick, trend: "+12%" },
  { label: "Cadastros hoje", value: "559", icon: UserPlus, trend: "+8%" },
  { label: "Depósitos estimados", value: "R$ 14.200", icon: DollarSign, trend: "+15%" },
  { label: "Receita total", value: "R$ 127.500", icon: TrendingUp, trend: "+22%" },
  { label: "Receita por plataforma", value: "R$ 34.900", icon: Monitor, trend: "+10%" },
  { label: "Receita por jogo", value: "R$ 22.700", icon: Gamepad2, trend: "+18%" },
];

const ct = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "#fff", fontSize: 12 };

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral consolidada da operação</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</span>
              <s.icon size={15} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold tracking-tight">{s.value}</div>
            <span className="text-xs text-success font-medium">{s.trend} vs ontem</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Cliques & Cadastros Semanal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis dataKey="day" stroke="hsl(0 0% 40%)" fontSize={12} />
              <YAxis stroke="hsl(0 0% 40%)" fontSize={12} />
              <Tooltip contentStyle={ct} />
              <Line type="monotone" dataKey="cliques" stroke="hsl(220 78% 35%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cadastros" stroke="hsl(0 0% 50%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Receita Semanal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis dataKey="day" stroke="hsl(0 0% 40%)" fontSize={12} />
              <YAxis stroke="hsl(0 0% 40%)" fontSize={12} />
              <Tooltip contentStyle={ct} />
              <Bar dataKey="receita" fill="hsl(220 78% 30%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Receita por Plataforma</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={plataformaData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis type="number" stroke="hsl(0 0% 40%)" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="hsl(0 0% 40%)" fontSize={12} width={100} />
              <Tooltip contentStyle={ct} />
              <Bar dataKey="receita" fill="hsl(0 0% 35%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Receita por Jogo</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={jogoData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis type="number" stroke="hsl(0 0% 40%)" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="hsl(0 0% 40%)" fontSize={12} width={100} />
              <Tooltip contentStyle={ct} />
              <Bar dataKey="receita" fill="hsl(220 78% 30%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
