import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const jogos = [
  { id: 1, nome: "Fortune Tiger", cat: "Slot", status: "Ativo", lp: "Fortune Tiger LP", plats: "Bet365, Betano, Sportingbet", links: 12, cliques: 18400, ctr: "14.2%", cadastros: 1245, receita: 32500 },
  { id: 2, nome: "Aviator", cat: "Crash", status: "Ativo", lp: "Aviator Promo", plats: "Bet365, Pixbet", links: 8, cliques: 12300, ctr: "11.8%", cadastros: 890, receita: 28100 },
  { id: 3, nome: "Gates of Olympus", cat: "Slot", status: "Ativo", lp: "—", plats: "Bet365, Betano, Sportingbet", links: 6, cliques: 8500, ctr: "9.4%", cadastros: 620, receita: 19800 },
  { id: 4, nome: "Mines", cat: "Casual", status: "Ativo", lp: "Mines Special", plats: "Sportingbet, Betano", links: 5, cliques: 6200, ctr: "8.1%", cadastros: 445, receita: 15200 },
  { id: 5, nome: "Spaceman", cat: "Crash", status: "Inativo", lp: "—", plats: "Pixbet", links: 2, cliques: 1800, ctr: "4.2%", cadastros: 120, receita: 3200 },
];

export default function Jogos() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Jogos</h1><p className="page-subtitle">Centro de gestão de jogos cadastrados na operação</p></div>
        <button className="btn-primary"><Plus size={14} /> Adicionar Jogo</button>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Jogo</th><th>Categoria</th><th>LP Vinculada</th><th>Plataformas</th><th>Links</th><th>Cliques</th><th>CTR</th><th>Cadastros</th><th>Receita Est.</th><th>Status</th></tr></thead>
          <tbody>
            {jogos.map((j) => (
              <tr key={j.id}>
                <td className="font-medium">{j.nome}</td>
                <td><span className="badge-neutral">{j.cat}</span></td>
                <td className="text-xs">{j.lp}</td>
                <td className="text-xs">{j.plats}</td>
                <td>{j.links}</td>
                <td>{j.cliques.toLocaleString()}</td>
                <td className="text-accent font-medium">{j.ctr}</td>
                <td>{j.cadastros.toLocaleString()}</td>
                <td className="font-medium">R$ {j.receita.toLocaleString()}</td>
                <td><span className={j.status === "Ativo" ? "badge-success" : "badge-danger"}>{j.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
