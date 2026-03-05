const pages = [
  { nome: "Fortune Tiger LP", rota: "/fortune-tiger", tipo: "Jogo", jogo: "Fortune Tiger", plats: "Bet365, Betano", cliques: 12450, ctr: "14.2%", saida: "32%", status: "Ativo" },
  { nome: "Aviator Promo", rota: "/aviator-promo", tipo: "Promoção", jogo: "Aviator", plats: "Bet365, Pixbet", cliques: 8320, ctr: "11.8%", saida: "28%", status: "Ativo" },
  { nome: "Cadastro Geral", rota: "/cadastro", tipo: "Geral", jogo: "—", plats: "Todas", cliques: 15780, ctr: "9.6%", saida: "45%", status: "Ativo" },
  { nome: "Mines Special", rota: "/mines-special", tipo: "Jogo", jogo: "Mines", plats: "Sportingbet", cliques: 5600, ctr: "2.8%", saida: "58%", status: "Revisão" },
];

export default function LandingPagesPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Landing Pages</h1><p className="page-subtitle">Gestão de páginas de conversão e performance</p></div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Rota</th><th>Tipo</th><th>Jogo</th><th>Plataformas</th><th>Cliques</th><th>CTR</th><th>Taxa Saída</th><th>Status</th></tr></thead>
          <tbody>
            {pages.map((p, i) => (
              <tr key={i}>
                <td className="font-medium">{p.nome}</td>
                <td className="font-mono text-xs text-accent">{p.rota}</td>
                <td><span className="badge-neutral">{p.tipo}</span></td>
                <td>{p.jogo}</td>
                <td className="text-xs">{p.plats}</td>
                <td>{p.cliques.toLocaleString()}</td>
                <td className="font-medium text-accent">{p.ctr}</td>
                <td className={parseFloat(p.saida) > 40 ? "text-destructive" : "text-success"}>{p.saida}</td>
                <td><span className={p.status === "Ativo" ? "badge-success" : "badge-warning"}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
