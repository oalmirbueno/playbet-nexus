import { Check, X } from "lucide-react";

const saques = [
  { usuario: "Carlos Silva", tipo: "Influencer", valor: "R$ 4.200", data: "05/03/2026", status: "Pendente" },
  { usuario: "Ricardo Almeida", tipo: "Sócio", valor: "R$ 12.000", data: "04/03/2026", status: "Pendente" },
  { usuario: "Ana Souza", tipo: "Influencer", valor: "R$ 2.800", data: "03/03/2026", status: "Aprovado" },
  { usuario: "Fernanda Rocha", tipo: "Sócio", valor: "R$ 10.500", data: "02/03/2026", status: "Aprovado" },
  { usuario: "Pedro Lima", tipo: "Influencer", valor: "R$ 6.100", data: "01/03/2026", status: "Rejeitado" },
];

export default function Saques() {
  return (
    <div>
      <h1 className="page-header">Saques</h1>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {saques.map((s, i) => (
              <tr key={i}>
                <td className="font-medium">{s.usuario}</td>
                <td>{s.tipo}</td>
                <td>{s.valor}</td>
                <td>{s.data}</td>
                <td>
                  <span className={s.status === "Aprovado" ? "status-active" : s.status === "Pendente" ? "status-pending" : "status-inactive"}>
                    {s.status}
                  </span>
                </td>
                <td>
                  {s.status === "Pendente" && (
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors">
                        <Check size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
