const utms = [
  { source: "playbet", medium: "telegram", campaign: "marco-turbo", content: "cta-azul", subid: "rafa001", jogo: "Fortune Tiger", plat: "Bet365", influencer: "Rafael M.", cliques: 4520, status: "Ativo" },
  { source: "playbet", medium: "instagram", campaign: "aviator-promo", content: "reels", subid: "pedro001", jogo: "Aviator", plat: "Pixbet", influencer: "Pedro L.", cliques: 3200, status: "Ativo" },
  { source: "playbet", medium: "whatsapp", campaign: "mines-vip", content: "msg-direta", subid: "carlos001", jogo: "Mines", plat: "Betano", influencer: "Carlos S.", cliques: 2100, status: "Ativo" },
  { source: "playbet", medium: "bio", campaign: "geral", content: "link-bio", subid: "ana001", jogo: "Gates of Olympus", plat: "Bet365", influencer: "Ana S.", cliques: 1800, status: "Ativo" },
  { source: "playbet", medium: "telegram", campaign: "spaceman", content: "cta-play", subid: "julia001", jogo: "Spaceman", plat: "Pixbet", influencer: "Julia C.", cliques: 450, status: "Inativo" },
];

export default function UtmsSubids() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">UTMs / SubIDs</h1><p className="page-subtitle">Rastreamento detalhado de origens e parâmetros de tráfego</p></div>
      <div className="flex flex-wrap gap-3">
        <select className="select-field"><option>Source: Todos</option></select>
        <select className="select-field"><option>Medium: Todos</option></select>
        <select className="select-field"><option>Campaign: Todas</option></select>
        <select className="select-field"><option>Influencer: Todos</option></select>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Source</th><th>Medium</th><th>Campaign</th><th>Content</th><th>SubID</th><th>Jogo</th><th>Plataforma</th><th>Influencer</th><th>Cliques</th><th>Status</th></tr></thead>
          <tbody>
            {utms.map((u, i) => (
              <tr key={i}>
                <td className="font-mono text-xs">{u.source}</td>
                <td className="font-mono text-xs">{u.medium}</td>
                <td className="font-mono text-xs text-accent">{u.campaign}</td>
                <td className="font-mono text-xs">{u.content}</td>
                <td className="font-mono text-xs text-accent font-medium">{u.subid}</td>
                <td className="text-xs">{u.jogo}</td>
                <td className="text-xs">{u.plat}</td>
                <td className="text-xs">{u.influencer}</td>
                <td className="font-medium">{u.cliques.toLocaleString()}</td>
                <td><span className={u.status === "Ativo" ? "badge-success" : "badge-danger"}>{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
