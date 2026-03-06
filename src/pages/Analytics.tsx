import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const data = [
  { periodo: "Sem 1", cliques: 12400, ctr: 8.2, cadastros: 620, depositos: 280, receita: 28500, liquida: 14250 },
  { periodo: "Sem 2", cliques: 15800, ctr: 9.1, cadastros: 810, depositos: 365, receita: 36200, liquida: 18100 },
  { periodo: "Sem 3", cliques: 14200, ctr: 8.8, cadastros: 720, depositos: 310, receita: 32800, liquida: 16400 },
  { periodo: "Sem 4", cliques: 18600, ctr: 10.4, cadastros: 980, depositos: 440, receita: 45200, liquida: 22600 },
];

const receitaJogo = [
  { name: "Fortune Tiger", value: 32500 }, { name: "Aviator", value: 28100 }, { name: "Gates", value: 19800 }, { name: "Mines", value: 15200 },
];
const receitaLP = [
  { name: "Fortune Tiger LP", value: 18400 }, { name: "Aviator Promo", value: 12300 }, { name: "Cadastro Geral", value: 9800 }, { name: "Mines Special", value: 4200 },
];
const receitaInfluencer = [
  { name: "Rafael M.", value: 42100 }, { name: "Pedro L.", value: 35700 }, { name: "Carlos S.", value: 28500 }, { name: "Ana S.", value: 18200 },
];
const receitaPlat = [
  { name: "Bet365", value: 45200 }, { name: "Betano", value: 38600 }, { name: "Sportingbet", value: 22100 }, { name: "Pixbet", value: 18400 },
];

const ct = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "#fff", fontSize: 12 };

export default function Analytics() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Centro analítico da operação — métricas profundas e filtros avançados</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className="select-field"><option>Período: Março 2026</option></select>
        <select className="select-field"><option>Jogo: Todos</option></select>
        <select className="select-field"><option>Plataforma: Todas</option></select>
        <select className="select-field"><option>Influencer: Todos</option></select>
        <select className="select-field"><option>Campanha: Todas</option></select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Cliques & CTR</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis dataKey="periodo" stroke="hsl(0 0% 40%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
              <Tooltip contentStyle={ct} />
              <Area type="monotone" dataKey="cliques" stroke="hsl(220 78% 35%)" fill="hsl(220 78% 35% / 0.08)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Cadastros & Depósitos Estimados</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis dataKey="periodo" stroke="hsl(0 0% 40%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
              <Tooltip contentStyle={ct} />
              <Bar dataKey="cadastros" fill="hsl(220 78% 30%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="depositos" fill="hsl(0 0% 40%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Receita Bruta vs Líquida</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis dataKey="periodo" stroke="hsl(0 0% 40%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
              <Tooltip contentStyle={ct} />
              <Line type="monotone" dataKey="receita" stroke="hsl(0 0% 50%)" strokeWidth={2} />
              <Line type="monotone" dataKey="liquida" stroke="hsl(152 55% 38%)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Receita por Jogo</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={receitaJogo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis type="number" stroke="hsl(0 0% 40%)" fontSize={10} />
              <YAxis dataKey="name" type="category" stroke="hsl(0 0% 40%)" fontSize={10} width={100} />
              <Tooltip contentStyle={ct} />
              <Bar dataKey="value" fill="hsl(0 0% 40%)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: "Receita por LP", data: receitaLP, color: "hsl(205 70% 40%)" },
          { title: "Receita por Influencer", data: receitaInfluencer, color: "hsl(152 55% 35%)" },
          { title: "Receita por Plataforma", data: receitaPlat, color: "hsl(220 78% 30%)" },
        ].map((c) => (
          <div key={c.title} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-5">{c.title}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={c.data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                <XAxis type="number" stroke="hsl(0 0% 40%)" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="hsl(0 0% 40%)" fontSize={10} width={100} />
                <Tooltip contentStyle={ct} />
                <Bar dataKey="value" fill={c.color} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}
