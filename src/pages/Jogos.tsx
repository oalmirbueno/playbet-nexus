import { Plus } from "lucide-react";

const jogos = [
  { nome: "Fortune Tiger", categoria: "Slot", plataformas: "Bet365, Betano", status: "Ativo" },
  { nome: "Aviator", categoria: "Crash", plataformas: "Bet365, Pixbet", status: "Ativo" },
  { nome: "Mines", categoria: "Casual", plataformas: "Sportingbet, Betano", status: "Ativo" },
  { nome: "Spaceman", categoria: "Crash", plataformas: "Pixbet", status: "Inativo" },
  { nome: "Gates of Olympus", categoria: "Slot", plataformas: "Bet365, Betano, Sportingbet", status: "Ativo" },
];

export default function Jogos() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Jogos</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus size={16} /> Adicionar Jogo
        </button>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome do Jogo</th>
              <th>Categoria</th>
              <th>Plataformas Disponíveis</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {jogos.map((j, i) => (
              <tr key={i}>
                <td className="font-medium">{j.nome}</td>
                <td>{j.categoria}</td>
                <td>{j.plataformas}</td>
                <td><span className={j.status === "Ativo" ? "status-active" : "status-inactive"}>{j.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
