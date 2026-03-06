const conversoes = [
  { origem: "Telegram", cadastros: 820, depositos: 380, taxa: "46.3%", receita: "R$ 18.200", status: "Alta" },
  { origem: "Instagram Reels", cadastros: 610, depositos: 245, taxa: "40.1%", receita: "R$ 12.400", status: "Alta" },
  { origem: "Bio Link", cadastros: 420, depositos: 160, taxa: "38.0%", receita: "R$ 8.600", status: "Média" },
  { origem: "WhatsApp", cadastros: 350, depositos: 140, taxa: "40.0%", receita: "R$ 6.800", status: "Média" },
  { origem: "Story", cadastros: 280, depositos: 85, taxa: "30.3%", receita: "R$ 4.200", status: "Baixa" },
  { origem: "YouTube", cadastros: 180, depositos: 72, taxa: "40.0%", receita: "R$ 3.500", status: "Média" },
];

export default function Conversoes() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conversões</h1>
        <p className="text-sm text-muted-foreground mt-1">Análise de conversão por origem e canal</p>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Origem</th><th>Cadastros</th><th>Depósitos</th><th>Taxa Conversão</th><th>Receita Estimada</th><th>Performance</th></tr></thead>
          <tbody>
            {conversoes.map((c, i) => (
              <tr key={i}>
                <td className="font-medium">{c.origem}</td>
                <td>{c.cadastros.toLocaleString()}</td>
                <td>{c.depositos.toLocaleString()}</td>
                <td className="font-medium">{c.taxa}</td>
                <td className="font-medium">{c.receita}</td>
                <td><span className={c.status === "Alta" ? "badge-success" : c.status === "Média" ? "badge-neutral" : "badge-warning"}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
