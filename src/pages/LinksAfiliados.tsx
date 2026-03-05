import { Copy, Edit, XCircle, CopyPlus, Filter } from "lucide-react";

const links = [
  { nome: "FT-Bet365-Rafa", jogo: "Fortune Tiger", plat: "Bet365", influencer: "Rafael M.", uso: "Telegram", source: "playbet", medium: "telegram", campaign: "marco-turbo", subid: "rafa001", status: "Ativo", ultimoClique: "05/03 14:32", cliques: 4520 },
  { nome: "AV-Pixbet-Pedro", jogo: "Aviator", plat: "Pixbet", influencer: "Pedro L.", uso: "Instagram", source: "playbet", medium: "instagram", campaign: "aviator-promo", subid: "pedro001", status: "Ativo", ultimoClique: "05/03 13:18", cliques: 3200 },
  { nome: "MN-Betano-Carlos", jogo: "Mines", plat: "Betano", influencer: "Carlos S.", uso: "Grupo WA", source: "playbet", medium: "whatsapp", campaign: "mines-vip", subid: "carlos001", status: "Ativo", ultimoClique: "05/03 11:45", cliques: 2100 },
  { nome: "GO-Bet365-Ana", jogo: "Gates of Olympus", plat: "Bet365", influencer: "Ana S.", uso: "Bio Link", source: "playbet", medium: "bio", campaign: "geral", subid: "ana001", status: "Ativo", ultimoClique: "04/03 22:10", cliques: 1800 },
  { nome: "SP-Pixbet-Julia", jogo: "Spaceman", plat: "Pixbet", influencer: "Julia C.", uso: "Telegram", source: "playbet", medium: "telegram", campaign: "spaceman", subid: "julia001", status: "Inativo", ultimoClique: "28/02 15:30", cliques: 450 },
];

export default function LinksAfiliados() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Links Afiliados</h1><p className="page-subtitle">Centro de links — rastreio, UTMs e gestão completa</p></div>

      <div className="flex flex-wrap gap-3">
        <select className="select-field"><option>Jogo: Todos</option></select>
        <select className="select-field"><option>Plataforma: Todas</option></select>
        <select className="select-field"><option>Influencer: Todos</option></select>
        <select className="select-field"><option>Status: Todos</option></select>
        <select className="select-field"><option>Campanha: Todas</option></select>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Jogo</th><th>Plataforma</th><th>Influencer</th><th>Uso</th><th>Source</th><th>Medium</th><th>Campaign</th><th>SubID</th><th>Cliques</th><th>Último</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {links.map((l, i) => (
              <tr key={i}>
                <td className="font-medium text-xs">{l.nome}</td>
                <td className="text-xs">{l.jogo}</td>
                <td className="text-xs">{l.plat}</td>
                <td className="text-xs">{l.influencer}</td>
                <td><span className="badge-neutral">{l.uso}</span></td>
                <td className="font-mono text-[10px] text-muted-foreground">{l.source}</td>
                <td className="font-mono text-[10px] text-muted-foreground">{l.medium}</td>
                <td className="font-mono text-[10px] text-muted-foreground">{l.campaign}</td>
                <td className="font-mono text-[10px] text-accent">{l.subid}</td>
                <td className="font-medium">{l.cliques.toLocaleString()}</td>
                <td className="text-[10px] text-muted-foreground whitespace-nowrap">{l.ultimoClique}</td>
                <td><span className={l.status === "Ativo" ? "badge-success" : "badge-danger"}>{l.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar"><Copy size={12} /></button>
                    <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                    <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Duplicar"><CopyPlus size={12} /></button>
                    <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors" title="Desativar"><XCircle size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
