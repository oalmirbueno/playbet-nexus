const links = [
  { jogo: "Fortune Tiger", plataforma: "Bet365", link: "https://bet365.com/ft?ref=pb", utm: "utm_source=playbet&utm_medium=link", status: "Ativo" },
  { jogo: "Aviator", plataforma: "Pixbet", link: "https://pixbet.com/av?ref=pb", utm: "utm_source=playbet&utm_campaign=aviator", status: "Ativo" },
  { jogo: "Mines", plataforma: "Betano", link: "https://betano.com/mn?ref=pb", utm: "utm_source=playbet&utm_medium=cta", status: "Ativo" },
  { jogo: "Spaceman", plataforma: "Sportingbet", link: "https://sb.com/sp?ref=pb", utm: "utm_source=playbet&utm_campaign=spaceman", status: "Inativo" },
];

export default function LinksAfiliados() {
  return (
    <div>
      <h1 className="page-header">Links Afiliados</h1>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Jogo</th>
              <th>Plataforma</th>
              <th>Link</th>
              <th>UTM</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l, i) => (
              <tr key={i}>
                <td className="font-medium">{l.jogo}</td>
                <td>{l.plataforma}</td>
                <td className="text-accent text-xs truncate max-w-[180px]">{l.link}</td>
                <td className="text-xs text-muted-foreground truncate max-w-[200px]">{l.utm}</td>
                <td><span className={l.status === "Ativo" ? "status-active" : "status-inactive"}>{l.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
