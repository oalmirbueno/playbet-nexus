import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, AlertTriangle, ExternalLink, BarChart3 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const conversoes = [
  { id: 1, data: "05/03/2026", origem: "Telegram", influencer: "Rafael M.", lp: "Fortune Tiger LP", jogo: "Fortune Tiger", plat: "Bet365", campanha: "Março Turbo", cliques: 1240, cadastro: 124, deposito: 56, receita: 5600, status: "Convertido" },
  { id: 2, data: "05/03/2026", origem: "Instagram Reels", influencer: "Pedro L.", lp: "Aviator Promo", jogo: "Aviator", plat: "Pixbet", campanha: "Aviator Week", cliques: 980, cadastro: 78, deposito: 31, receita: 3100, status: "Convertido" },
  { id: 3, data: "04/03/2026", origem: "WhatsApp", influencer: "Carlos S.", lp: "Fortune Tiger LP", jogo: "Mines", plat: "Betano", campanha: "VIP Mines", cliques: 620, cadastro: 50, deposito: 20, receita: 2000, status: "Convertido" },
  { id: 4, data: "04/03/2026", origem: "Bio Link", influencer: "Ana S.", lp: "Cadastro Geral", jogo: "Gates of Olympus", plat: "Bet365", campanha: "—", cliques: 540, cadastro: 38, deposito: 15, receita: 1500, status: "Parcial" },
  { id: 5, data: "03/03/2026", origem: "Story", influencer: "Julia C.", lp: "Aviator Promo", jogo: "Spaceman", plat: "Pixbet", campanha: "—", cliques: 180, cadastro: 9, deposito: 2, receita: 200, status: "Fraco" },
  { id: 6, data: "03/03/2026", origem: "YouTube", influencer: "Ana S.", lp: "Cadastro Geral", jogo: "Vários", plat: "Bet365", campanha: "—", cliques: 420, cadastro: 34, deposito: 14, receita: 1400, status: "Convertido" },
  { id: 7, data: "02/03/2026", origem: "Telegram", influencer: "Rafael M.", lp: "Fortune Tiger LP", jogo: "Fortune Tiger", plat: "Betano", campanha: "Março Turbo", cliques: 880, cadastro: 88, deposito: 35, receita: 3500, status: "Convertido" },
  { id: 8, data: "01/03/2026", origem: "Instagram Reels", influencer: "Pedro L.", lp: "Aviator Promo", jogo: "Aviator", plat: "Bet365", campanha: "Aviator Week", cliques: 760, cadastro: 61, deposito: 24, receita: 2400, status: "Parcial" },
];

const funnel = [
  { etapa: "Impressões", valor: 245000, pct: "100%" },
  { etapa: "Cliques", valor: 61000, pct: "24.9%" },
  { etapa: "Landing Page", valor: 42700, pct: "70.0%" },
  { etapa: "Cadastro Est.", valor: 3130, pct: "7.3%" },
  { etapa: "Depósito Est.", valor: 1395, pct: "44.6%" },
  { etapa: "Receita Est.", valor: 142700, pct: "—" },
];

const alerts = [
  { msg: "Mines Special LP com 5.600 cliques e apenas 2.8% CTR", link: "/landing-pages", type: "warning" },
  { msg: "Julia C. com CTR bom (4.2%) mas conversão fraca (2 depósitos)", link: "/influencers", type: "warning" },
  { msg: "Campanha 'Aviator Week' com muito clique e resultado abaixo da meta", link: "/campanhas", type: "warning" },
  { msg: "Plataforma Pixbet com queda de 12% na performance semanal", link: "/plataformas", type: "danger" },
];

export default function Conversoes() {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<typeof conversoes[0] | null>(null);
  const [filterEtapa, setFilterEtapa] = useState("Todos");
  const [filterInfluencer, setFilterInfluencer] = useState("Todos");
  const [filterLP, setFilterLP] = useState("Todas");
  const [filterPlat, setFilterPlat] = useState("Todas");

  const filtered = conversoes.filter(c => {
    if (filterInfluencer !== "Todos" && c.influencer !== filterInfluencer) return false;
    if (filterLP !== "Todas" && c.lp !== filterLP) return false;
    if (filterPlat !== "Todas" && c.plat !== filterPlat) return false;
    if (filterEtapa !== "Todos" && c.status !== filterEtapa) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Conversões" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conversões</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro de leitura operacional — funil, alertas e drill-down por registro</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/analytics")} className="btn-ghost text-xs gap-1.5"><BarChart3 size={13} />Analytics</button>
          <ExportDropdown data={conversoes} filename="conversoes" />
        </div>
      </div>

      {/* Funnel */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-5">Funil de Conversão</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {funnel.map((f, i) => (
            <div key={f.etapa} className="flex items-center gap-2">
              {i > 0 && <ArrowDown size={14} className="text-muted-foreground shrink-0 rotate-[-90deg]" />}
              <div className="glass-card-elevated px-5 py-4 rounded-lg text-center min-w-[140px]">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{f.etapa}</p>
                <p className="text-lg font-semibold">{f.etapa === "Receita Est." ? `R$ ${f.valor.toLocaleString()}` : f.valor.toLocaleString()}</p>
                {f.pct !== "—" && <p className="text-[11px] text-muted-foreground mt-0.5">{f.pct}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`glass-card p-4 flex items-center gap-3 cursor-pointer hover:bg-secondary/20 transition-colors border-l-2 ${a.type === "danger" ? "border-l-destructive" : "border-l-warning"}`} onClick={() => navigate(a.link)}>
              <AlertTriangle size={14} className={a.type === "danger" ? "text-destructive" : "text-warning"} />
              <span className="text-sm">{a.msg}</span>
              <ExternalLink size={12} className="text-muted-foreground ml-auto shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="select-field text-xs w-auto" value={filterEtapa} onChange={e => setFilterEtapa(e.target.value)}>
          <option value="Todos">Status: Todos</option>
          <option value="Convertido">Convertido</option><option value="Parcial">Parcial</option><option value="Fraco">Fraco</option>
        </select>
        <select className="select-field text-xs w-auto" value={filterInfluencer} onChange={e => setFilterInfluencer(e.target.value)}>
          <option value="Todos">Influencer: Todos</option>
          {["Rafael M.", "Pedro L.", "Carlos S.", "Ana S.", "Julia C."].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterLP} onChange={e => setFilterLP(e.target.value)}>
          <option value="Todas">LP: Todas</option>
          {["Fortune Tiger LP", "Aviator Promo", "Cadastro Geral"].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterPlat} onChange={e => setFilterPlat(e.target.value)}>
          <option value="Todas">Plataforma: Todas</option>
          {["Bet365", "Betano", "Pixbet", "Sportingbet"].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead>
            <tr><th>Data</th><th>Origem</th><th>Influencer</th><th>LP</th><th>Jogo</th><th>Plat.</th><th>Campanha</th><th>Cliques</th><th>Cadastros</th><th>Depósitos</th><th>Receita Est.</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="cursor-pointer" onClick={() => setDetail(c)}>
                <td className="text-xs text-muted-foreground whitespace-nowrap">{c.data}</td>
                <td className="text-xs">{c.origem}</td>
                <td className="font-medium text-sm">{c.influencer}</td>
                <td className="text-xs">{c.lp}</td>
                <td className="text-xs">{c.jogo}</td>
                <td className="text-xs">{c.plat}</td>
                <td className="text-xs">{c.campanha}</td>
                <td className="font-medium">{c.cliques.toLocaleString()}</td>
                <td>{c.cadastro}</td>
                <td>{c.deposito}</td>
                <td className="font-medium">R$ {c.receita.toLocaleString()}</td>
                <td><span className={c.status === "Convertido" ? "badge-success" : c.status === "Parcial" ? "badge-warning" : "badge-danger"}>{c.status}</span></td>
                <td><ExternalLink size={12} className="text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhe da Conversão</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { l: "Data", v: detail.data }, { l: "Origem", v: detail.origem }, { l: "Influencer", v: detail.influencer },
                  { l: "Landing Page", v: detail.lp }, { l: "Jogo", v: detail.jogo }, { l: "Plataforma", v: detail.plat },
                  { l: "Campanha", v: detail.campanha }, { l: "Cliques", v: detail.cliques.toLocaleString() }, { l: "Cadastros Est.", v: String(detail.cadastro) },
                  { l: "Depósitos Est.", v: String(detail.deposito) }, { l: "Receita Est.", v: `R$ ${detail.receita.toLocaleString()}` }, { l: "Status", v: detail.status },
                ].map(f => (
                  <div key={f.l}>
                    <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">{f.l}</p>
                    <p className="text-sm font-medium">{f.v}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <button className="btn-ghost text-xs" onClick={() => { setDetail(null); navigate("/influencers"); }}>Ver Influencer</button>
                <button className="btn-ghost text-xs" onClick={() => { setDetail(null); navigate("/landing-pages"); }}>Ver LP</button>
                <button className="btn-ghost text-xs" onClick={() => { setDetail(null); navigate("/analytics"); }}>Ver Analytics</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
