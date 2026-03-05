import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { periodo: "Sem 1", trafego: 4200, cliques: 3100, cadastros: 420, receita: 8500 },
  { periodo: "Sem 2", trafego: 5100, cliques: 3800, cadastros: 510, receita: 10200 },
  { periodo: "Sem 3", trafego: 4800, cliques: 3500, cadastros: 480, receita: 9600 },
  { periodo: "Sem 4", trafego: 6200, cliques: 4600, cadastros: 620, receita: 12400 },
];

const filtros = {
  jogo: ["Todos", "Fortune Tiger", "Aviator", "Mines"],
  plataforma: ["Todas", "Bet365", "Betano", "Pixbet"],
  influencer: ["Todos", "Carlos Silva", "Ana Souza", "Pedro Lima"],
};

export default function Metricas() {
  const [filtroJogo, setFiltroJogo] = useState("Todos");
  const [filtroPlat, setFiltroPlat] = useState("Todas");
  const [filtroInf, setFiltroInf] = useState("Todos");

  const selectClass = "bg-secondary text-foreground border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div>
      <h1 className="page-header">Métricas</h1>

      <div className="flex flex-wrap gap-4 mb-8">
        <select className={selectClass} value={filtroJogo} onChange={(e) => setFiltroJogo(e.target.value)}>
          {filtros.jogo.map((j) => <option key={j}>{j}</option>)}
        </select>
        <select className={selectClass} value={filtroPlat} onChange={(e) => setFiltroPlat(e.target.value)}>
          {filtros.plataforma.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className={selectClass} value={filtroInf} onChange={(e) => setFiltroInf(e.target.value)}>
          {filtros.influencer.map((i) => <option key={i}>{i}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Tráfego & Cliques</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
              <XAxis dataKey="periodo" stroke="hsl(0 0% 60%)" fontSize={12} />
              <YAxis stroke="hsl(0 0% 60%)" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(0 0% 9%)", border: "1px solid hsl(0 0% 18%)", borderRadius: 8, color: "#fff" }} />
              <Line type="monotone" dataKey="trafego" stroke="hsl(217 85% 30%)" strokeWidth={2} />
              <Line type="monotone" dataKey="cliques" stroke="hsl(45 100% 50%)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Cadastros & Receita</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
              <XAxis dataKey="periodo" stroke="hsl(0 0% 60%)" fontSize={12} />
              <YAxis stroke="hsl(0 0% 60%)" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(0 0% 9%)", border: "1px solid hsl(0 0% 18%)", borderRadius: 8, color: "#fff" }} />
              <Bar dataKey="cadastros" fill="hsl(217 85% 30%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="receita" fill="hsl(45 100% 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
