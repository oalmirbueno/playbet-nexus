import { useState } from "react";
import { Plus, Users, TrendingUp, MousePointerClick, DollarSign, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const stats = [
  { label: "Total Influencers", value: "12", icon: Users, variant: "border-l-primary" },
  { label: "Ativos", value: "9", icon: TrendingUp, variant: "border-l-success" },
  { label: "Pausados", value: "3", icon: Users, variant: "border-l-warning" },
  { label: "Maior Faturamento", value: "Rafael M. — R$ 42.1K", icon: DollarSign, variant: "border-l-accent" },
  { label: "Maior CTR", value: "Pedro L. — 12.8%", icon: MousePointerClick, variant: "border-l-info" },
  { label: "Maior Conversão", value: "Carlos S. — 9.2%", icon: TrendingUp, variant: "border-l-success" },
];

const influencers = [
  { id: 1, nome: "Rafael Mendes", insta: "@rafa.bet", seg: "410K", tipo: "Premium", perc: 20, jogos: 5, links: 8, receita: 42100, saldo: 8500, ultimoSaque: "01/03/2026", status: "Ativo" },
  { id: 2, nome: "Pedro Lima", insta: "@pedro.apostas", seg: "320K", tipo: "Premium", perc: 18, jogos: 4, links: 6, receita: 35700, saldo: 6100, ultimoSaque: "28/02/2026", status: "Ativo" },
  { id: 3, nome: "Carlos Silva", insta: "@carlos.bet", seg: "250K", tipo: "Standard", perc: 15, jogos: 3, links: 5, receita: 28500, saldo: 4200, ultimoSaque: "25/02/2026", status: "Ativo" },
  { id: 4, nome: "Ana Souza", insta: "@ana.plays", seg: "180K", tipo: "Standard", perc: 12, jogos: 3, links: 4, receita: 18200, saldo: 2800, ultimoSaque: "20/02/2026", status: "Ativo" },
  { id: 5, nome: "Julia Costa", insta: "@ju.games", seg: "95K", tipo: "Starter", perc: 10, jogos: 2, links: 2, receita: 8400, saldo: 1200, ultimoSaque: "15/02/2026", status: "Pausado" },
  { id: 6, nome: "Marcos Oliveira", insta: "@marcos.bet", seg: "520K", tipo: "Premium", perc: 22, jogos: 5, links: 9, receita: 0, saldo: 0, ultimoSaque: "—", status: "Novo" },
];

export default function Influencers() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Influencers</h1>
          <p className="page-subtitle">Gestão completa de influenciadores e performance de afiliados</p>
        </div>
        <button className="btn-primary"><Plus size={14} /> Adicionar Influencer</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card border-l-2 ${s.variant}`}>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
            <div className="text-sm font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Nome</th><th>Instagram</th><th>Seguidores</th><th>Tipo</th><th>%</th><th>Jogos</th><th>Links</th><th>Receita</th><th>Saldo</th><th>Último Saque</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {influencers.map((inf) => (
              <tr key={inf.id} className="cursor-pointer" onClick={() => navigate(`/influencers/${inf.id}`)}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-accent">{inf.nome.charAt(0)}</div>
                    <span className="font-medium">{inf.nome}</span>
                  </div>
                </td>
                <td className="text-accent text-xs">{inf.insta}</td>
                <td>{inf.seg}</td>
                <td><span className={inf.tipo === "Premium" ? "badge-accent" : inf.tipo === "Standard" ? "badge-primary" : "badge-neutral"}>{inf.tipo}</span></td>
                <td>{inf.perc}%</td>
                <td>{inf.jogos}</td>
                <td>{inf.links}</td>
                <td className="font-medium">R$ {inf.receita.toLocaleString()}</td>
                <td className="text-success">R$ {inf.saldo.toLocaleString()}</td>
                <td className="text-xs text-muted-foreground">{inf.ultimoSaque}</td>
                <td><span className={inf.status === "Ativo" ? "badge-success" : inf.status === "Pausado" ? "badge-warning" : "badge-info"}>{inf.status}</span></td>
                <td><ArrowRight size={14} className="text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
