const plataformas = [
  { nome: "Bet365", tipo: "CPA + RevShare", revshare: "30%", cpa: "R$ 50", moeda: "BRL", pagamento: "Mensal", status: "Ativo", links: 15, jogos: 5 },
  { nome: "Betano", tipo: "Revenue Share", revshare: "25%", cpa: "—", moeda: "BRL", pagamento: "Quinzenal", status: "Ativo", links: 12, jogos: 4 },
  { nome: "Sportingbet", tipo: "CPA", revshare: "—", cpa: "R$ 45", moeda: "BRL", pagamento: "Mensal", status: "Ativo", links: 8, jogos: 3 },
  { nome: "Pixbet", tipo: "Revenue Share", revshare: "22%", cpa: "—", moeda: "BRL", pagamento: "Semanal", status: "Pendente", links: 5, jogos: 2 },
  { nome: "KTO", tipo: "Hybrid", revshare: "20%", cpa: "R$ 35", moeda: "BRL", pagamento: "Mensal", status: "Ativo", links: 4, jogos: 3 },
];

export default function PlataformasPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Plataformas</h1><p className="page-subtitle">Gestão de plataformas parceiras e modelos de comissão</p></div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Plataforma</th><th>Tipo Comissão</th><th>RevShare</th><th>CPA</th><th>Moeda</th><th>Pagamento</th><th>Links</th><th>Jogos</th><th>Status</th></tr></thead>
          <tbody>
            {plataformas.map((p, i) => (
              <tr key={i}>
                <td className="font-medium">{p.nome}</td>
                <td><span className="badge-primary">{p.tipo}</span></td>
                <td>{p.revshare}</td>
                <td>{p.cpa}</td>
                <td>{p.moeda}</td>
                <td>{p.pagamento}</td>
                <td>{p.links}</td>
                <td>{p.jogos}</td>
                <td><span className={p.status === "Ativo" ? "badge-success" : "badge-warning"}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
