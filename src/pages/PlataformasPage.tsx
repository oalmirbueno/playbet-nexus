const plataformas = [
  { nome: "Bet365", tipo: "CPA + Revenue Share", link: "https://bet365.com/aff/playbet", status: "Ativo" },
  { nome: "Betano", tipo: "Revenue Share", link: "https://betano.com/aff/playbet", status: "Ativo" },
  { nome: "Sportingbet", tipo: "CPA", link: "https://sportingbet.com/aff/playbet", status: "Ativo" },
  { nome: "Pixbet", tipo: "Revenue Share", link: "https://pixbet.com/aff/playbet", status: "Pendente" },
];

export default function PlataformasPage() {
  return (
    <div>
      <h1 className="page-header">Plataformas</h1>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome da Plataforma</th>
              <th>Tipo de Comissão</th>
              <th>Link Afiliado</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {plataformas.map((p, i) => (
              <tr key={i}>
                <td className="font-medium">{p.nome}</td>
                <td>{p.tipo}</td>
                <td className="text-accent text-xs truncate max-w-[200px]">{p.link}</td>
                <td><span className={p.status === "Ativo" ? "status-active" : "status-pending"}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
