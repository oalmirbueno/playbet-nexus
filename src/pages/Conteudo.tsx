const conteudos = [
  { data: "05/03/2026", tipo: "Reels", plataforma: "Instagram", descricao: "Review Fortune Tiger - estratégias", status: "Publicado" },
  { data: "06/03/2026", tipo: "Story", plataforma: "Instagram", descricao: "Promo Bet365 - bônus cadastro", status: "Agendado" },
  { data: "07/03/2026", tipo: "Vídeo", plataforma: "YouTube", descricao: "Top 5 jogos da semana", status: "Rascunho" },
  { data: "08/03/2026", tipo: "Post", plataforma: "Telegram", descricao: "Link exclusivo Aviator", status: "Agendado" },
  { data: "10/03/2026", tipo: "Reels", plataforma: "TikTok", descricao: "Ganhos ao vivo - Mines", status: "Rascunho" },
];

export default function Conteudo() {
  return (
    <div>
      <h1 className="page-header">Conteúdo</h1>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Plataforma</th>
              <th>Descrição</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {conteudos.map((c, i) => (
              <tr key={i}>
                <td>{c.data}</td>
                <td>{c.tipo}</td>
                <td>{c.plataforma}</td>
                <td>{c.descricao}</td>
                <td>
                  <span className={c.status === "Publicado" ? "status-active" : c.status === "Agendado" ? "status-pending" : "status-inactive"}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
