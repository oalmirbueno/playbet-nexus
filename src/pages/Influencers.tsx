import { Plus } from "lucide-react";

const influencers = [
  { nome: "Carlos Silva", instagram: "@carlos.bet", seguidores: "250K", comissao: "15%", ganhos: "R$ 18.500", saldo: "R$ 4.200", status: "Ativo" },
  { nome: "Ana Souza", instagram: "@ana.plays", seguidores: "180K", comissao: "12%", ganhos: "R$ 12.300", saldo: "R$ 2.800", status: "Ativo" },
  { nome: "Pedro Lima", instagram: "@pedro.apostas", seguidores: "320K", comissao: "18%", ganhos: "R$ 25.700", saldo: "R$ 6.100", status: "Ativo" },
  { nome: "Julia Costa", instagram: "@ju.games", seguidores: "95K", comissao: "10%", ganhos: "R$ 5.400", saldo: "R$ 1.200", status: "Inativo" },
  { nome: "Rafael Mendes", instagram: "@rafa.bet", seguidores: "410K", comissao: "20%", ganhos: "R$ 32.100", saldo: "R$ 8.500", status: "Ativo" },
];

export default function Influencers() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Influencers</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus size={16} /> Adicionar Influencer
        </button>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Instagram</th>
              <th>Seguidores</th>
              <th>Comissão</th>
              <th>Ganhos Totais</th>
              <th>Saldo Disponível</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {influencers.map((inf, i) => (
              <tr key={i}>
                <td className="font-medium">{inf.nome}</td>
                <td className="text-accent">{inf.instagram}</td>
                <td>{inf.seguidores}</td>
                <td>{inf.comissao}</td>
                <td>{inf.ganhos}</td>
                <td>{inf.saldo}</td>
                <td><span className={inf.status === "Ativo" ? "status-active" : "status-inactive"}>{inf.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
