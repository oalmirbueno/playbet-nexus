const socios = [
  { nome: "Ricardo Almeida", participacao: "40%", ganhos: "R$ 51.000", saldo: "R$ 12.000", saques: "R$ 39.000" },
  { nome: "Fernanda Rocha", participacao: "35%", ganhos: "R$ 44.625", saldo: "R$ 10.500", saques: "R$ 34.125" },
  { nome: "Lucas Martins", participacao: "25%", ganhos: "R$ 31.875", saldo: "R$ 7.500", saques: "R$ 24.375" },
];

export default function Socios() {
  return (
    <div>
      <h1 className="page-header">Sócios</h1>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Participação</th>
              <th>Ganhos Totais</th>
              <th>Saldo Disponível</th>
              <th>Saques Realizados</th>
            </tr>
          </thead>
          <tbody>
            {socios.map((s, i) => (
              <tr key={i}>
                <td className="font-medium">{s.nome}</td>
                <td>{s.participacao}</td>
                <td>{s.ganhos}</td>
                <td>{s.saldo}</td>
                <td>{s.saques}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
