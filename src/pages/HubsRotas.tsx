const hubs = [
  { nome: "Hub Principal", rota: "/", destino: "Página inicial PlayBet", tipo: "Principal", status: "Ativo", links: 8, cliques: 24500 },
  { nome: "Hub Jogar", rota: "/jogar", destino: "Seleção de jogos", tipo: "Navegação", status: "Ativo", links: 12, cliques: 18200 },
  { nome: "Hub Influencer", rota: "/convite/:slug", destino: "Página personalizada influencer", tipo: "Dinâmico", status: "Ativo", links: 5, cliques: 9800 },
  { nome: "Hub Campanha Março", rota: "/marco-turbo", destino: "LP campanha especial", tipo: "Campanha", status: "Ativo", links: 4, cliques: 6500 },
  { nome: "Hub VIP", rota: "/vip", destino: "Acesso VIP exclusivo", tipo: "Especial", status: "Inativo", links: 2, cliques: 1200 },
];

export default function HubsRotas() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Hubs / Rotas</h1><p className="page-subtitle">Gestão de páginas-hub e rotas de redirecionamento</p></div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Rota</th><th>Destino</th><th>Tipo</th><th>Links</th><th>Cliques</th><th>Status</th></tr></thead>
          <tbody>
            {hubs.map((h, i) => (
              <tr key={i}>
                <td className="font-medium">{h.nome}</td>
                <td className="font-mono text-xs text-accent">{h.rota}</td>
                <td className="text-xs">{h.destino}</td>
                <td><span className="badge-neutral">{h.tipo}</span></td>
                <td>{h.links}</td>
                <td>{h.cliques.toLocaleString()}</td>
                <td><span className={h.status === "Ativo" ? "badge-success" : "badge-danger"}>{h.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
