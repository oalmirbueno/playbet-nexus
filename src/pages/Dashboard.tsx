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

export default function Dashboard() {
  return (
    <div>
      <h1 className="page-header">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{s.label}</span>
              <s.icon size={18} className="text-accent" />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <span className="text-xs text-success">{s.trend} vs ontem</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Cliques & Cadastros Semanal</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
              <XAxis dataKey="day" stroke="hsl(0 0% 60%)" fontSize={12} />
              <YAxis stroke="hsl(0 0% 60%)" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(0 0% 9%)", border: "1px solid hsl(0 0% 18%)", borderRadius: 8, color: "#fff" }} />
              <Line type="monotone" dataKey="cliques" stroke="hsl(217 85% 30%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cadastros" stroke="hsl(45 100% 50%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Receita Semanal</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
              <XAxis dataKey="day" stroke="hsl(0 0% 60%)" fontSize={12} />
              <YAxis stroke="hsl(0 0% 60%)" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(0 0% 9%)", border: "1px solid hsl(0 0% 18%)", borderRadius: 8, color: "#fff" }} />
              <Bar dataKey="receita" fill="hsl(217 85% 30%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Receita por Plataforma</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={plataformaData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
              <XAxis type="number" stroke="hsl(0 0% 60%)" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="hsl(0 0% 60%)" fontSize={12} width={100} />
              <Tooltip contentStyle={{ background: "hsl(0 0% 9%)", border: "1px solid hsl(0 0% 18%)", borderRadius: 8, color: "#fff" }} />
              <Bar dataKey="receita" fill="hsl(45 100% 50%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Receita por Jogo</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={jogoData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
              <XAxis type="number" stroke="hsl(0 0% 60%)" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="hsl(0 0% 60%)" fontSize={12} width={100} />
              <Tooltip contentStyle={{ background: "hsl(0 0% 9%)", border: "1px solid hsl(0 0% 18%)", borderRadius: 8, color: "#fff" }} />
              <Bar dataKey="receita" fill="hsl(217 85% 30%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
