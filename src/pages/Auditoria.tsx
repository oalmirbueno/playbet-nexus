const logs = [
  { data: "05/03/2026 14:32", usuario: "Admin", acao: "Saque solicitado", modulo: "Saques", detalhe: "Rafael Mendes — R$ 8.500", status: "Pendente" },
  { data: "05/03/2026 13:18", usuario: "Admin", acao: "Link criado", modulo: "Links", detalhe: "FT-Bet365-Marcos — Fortune Tiger", status: "Sucesso" },
  { data: "05/03/2026 12:45", usuario: "Admin", acao: "LP publicada", modulo: "Landing Pages", detalhe: "Aviator Promo Março", status: "Sucesso" },
  { data: "05/03/2026 11:20", usuario: "Admin", acao: "Influencer adicionado", modulo: "Influencers", detalhe: "Marcos Oliveira (@marcos.bet)", status: "Sucesso" },
  { data: "05/03/2026 10:05", usuario: "Admin", acao: "Campanha ativada", modulo: "Campanhas", detalhe: "Março Turbo", status: "Sucesso" },
  { data: "05/03/2026 09:30", usuario: "Admin", acao: "Saque aprovado", modulo: "Saques", detalhe: "Ana Souza — R$ 2.800", status: "Sucesso" },
  { data: "04/03/2026 18:45", usuario: "Admin", acao: "Percentual alterado", modulo: "Influencers", detalhe: "Pedro Lima: 15% → 18%", status: "Sucesso" },
  { data: "04/03/2026 16:20", usuario: "Admin", acao: "Jogo cadastrado", modulo: "Jogos", detalhe: "Spaceman adicionado", status: "Sucesso" },
  { data: "04/03/2026 14:10", usuario: "Admin", acao: "LP vinculada", modulo: "Landing Pages", detalhe: "Mines Special → Sportingbet", status: "Sucesso" },
  { data: "04/03/2026 10:00", usuario: "Maria", acao: "Relatório exportado", modulo: "Financeiro", detalhe: "Relatório Fev 2026", status: "Sucesso" },
];

export default function Auditoria() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Auditoria</h1><p className="page-subtitle">Logs completos de ações e alterações na operação</p></div>
      <div className="flex flex-wrap gap-3">
        <select className="select-field"><option>Módulo: Todos</option></select>
        <select className="select-field"><option>Usuário: Todos</option></select>
        <select className="select-field"><option>Período: Últimos 7 dias</option></select>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Módulo</th><th>Detalhe</th><th>Status</th></tr></thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i}>
                <td className="whitespace-nowrap text-xs text-muted-foreground font-mono">{l.data}</td>
                <td className="text-xs">{l.usuario}</td>
                <td className="font-medium text-sm">{l.acao}</td>
                <td><span className="badge-neutral">{l.modulo}</span></td>
                <td className="text-xs max-w-[250px] truncate">{l.detalhe}</td>
                <td><span className={l.status === "Sucesso" ? "badge-success" : "badge-warning"}>{l.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
