const campanhas = [
  { nome: "Março Turbo", objetivo: "Aumentar cadastros em 30%", jogo: "Fortune Tiger", plat: "Bet365", influencer: "Rafael M.", inicio: "01/03", fim: "31/03", status: "Ativa", resultado: "+18% cadastros" },
  { nome: "Aviator Week", objetivo: "Promover Aviator em todas plataformas", jogo: "Aviator", plat: "Todas", influencer: "Pedro L.", inicio: "10/03", fim: "17/03", status: "Planejada", resultado: "—" },
  { nome: "Bônus Fev", objetivo: "Divulgar bônus de cadastro", jogo: "Vários", plat: "Betano", influencer: "Carlos S.", inicio: "01/02", fim: "28/02", status: "Finalizada", resultado: "+420 cadastros" },
  { nome: "VIP Mines", objetivo: "Campanha exclusiva grupo VIP", jogo: "Mines", plat: "Sportingbet", influencer: "Ana S.", inicio: "15/02", fim: "01/03", status: "Finalizada", resultado: "+180 depósitos" },
];

export default function Campanhas() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Campanhas</h1><p className="page-subtitle">Gestão de campanhas de marketing e performance</p></div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Objetivo</th><th>Jogo</th><th>Plataforma</th><th>Influencer</th><th>Início</th><th>Fim</th><th>Status</th><th>Resultado</th></tr></thead>
          <tbody>
            {campanhas.map((c, i) => (
              <tr key={i}>
                <td className="font-medium">{c.nome}</td>
                <td className="text-xs max-w-[200px]">{c.objetivo}</td>
                <td>{c.jogo}</td>
                <td>{c.plat}</td>
                <td>{c.influencer}</td>
                <td className="text-xs">{c.inicio}</td>
                <td className="text-xs">{c.fim}</td>
                <td><span className={c.status === "Ativa" ? "badge-success" : c.status === "Planejada" ? "badge-info" : "badge-neutral"}>{c.status}</span></td>
                <td className="text-xs font-medium">{c.resultado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
