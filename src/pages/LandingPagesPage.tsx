const pages = [
  { nome: "Fortune Tiger LP", url: "https://playbet.com/fortune-tiger", cliques: "12.450", conversoes: "1.245" },
  { nome: "Aviator Promo", url: "https://playbet.com/aviator-promo", cliques: "8.320", conversoes: "832" },
  { nome: "Cadastro Geral", url: "https://playbet.com/cadastro", cliques: "15.780", conversoes: "2.367" },
  { nome: "Mines Special", url: "https://playbet.com/mines-special", cliques: "5.600", conversoes: "448" },
];

export default function LandingPagesPage() {
  return (
    <div>
      <h1 className="page-header">Landing Pages</h1>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome da Página</th>
              <th>URL</th>
              <th>Cliques</th>
              <th>Conversões</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p, i) => (
              <tr key={i}>
                <td className="font-medium">{p.nome}</td>
                <td className="text-accent text-xs">{p.url}</td>
                <td>{p.cliques}</td>
                <td>{p.conversoes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
