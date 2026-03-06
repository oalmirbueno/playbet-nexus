// Prepared for Supabase migration — replace mock lookups with queries
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Link2, Megaphone, Wallet, PenTool, MessageSquare, Copy, Edit, Globe, MousePointerClick, BarChart3, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { initialInfluencers, initialInfluencerLPs, initialLinks, initialConteudos, initialSaques, initialCampanhas } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

const chartTooltip = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "#fff", fontSize: 12 };

const tabs = [
  { key: "resumo", label: "Resumo", icon: DollarSign },
  { key: "landing", label: "Landing Pages", icon: Globe },
  { key: "links", label: "Links", icon: Link2 },
  { key: "campanhas", label: "Campanhas", icon: Megaphone },
  { key: "ganhos", label: "Ganhos", icon: DollarSign },
  { key: "saques", label: "Saques", icon: Wallet },
  { key: "cliques", label: "Cliques", icon: MousePointerClick },
  { key: "conteudos", label: "Conteúdos", icon: PenTool },
  { key: "obs", label: "Observações", icon: MessageSquare },
];

// Mock click data
const mockClicks = [
  { data: "05/03", cliques: 820, source: "instagram", device: "Mobile" },
  { data: "04/03", cliques: 650, source: "telegram", device: "Mobile" },
  { data: "03/03", cliques: 740, source: "whatsapp", device: "Mobile" },
  { data: "02/03", cliques: 510, source: "bio", device: "Desktop" },
  { data: "01/03", cliques: 900, source: "instagram", device: "Mobile" },
  { data: "28/02", cliques: 420, source: "telegram", device: "Desktop" },
  { data: "27/02", cliques: 380, source: "whatsapp", device: "Mobile" },
];

const clicksRecentes = [
  { id: 1, hora: "05/03 14:32", referrer: "instagram.com/stories", device: "iPhone 15 / iOS 18", rota: "/i/rafa", ip: "189.***.***.42" },
  { id: 2, hora: "05/03 14:28", referrer: "t.me/canal_bet", device: "Samsung S24 / Android 14", rota: "/i/rafa", ip: "177.***.***.18" },
  { id: 3, hora: "05/03 14:15", referrer: "wa.me/redirect", device: "Chrome / Windows", rota: "/i/rafa", ip: "201.***.***.91" },
  { id: 4, hora: "05/03 13:55", referrer: "bio.link/rafa", device: "iPhone 14 / iOS 17", rota: "/i/rafa", ip: "191.***.***.65" },
  { id: 5, hora: "05/03 13:40", referrer: "instagram.com/reels", device: "Pixel 8 / Android 14", rota: "/i/rafa", ip: "200.***.***.33" },
];

export default function InfluencerDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("resumo");
  const [obs, setObs] = useState("");
  const [editLPOpen, setEditLPOpen] = useState(false);

  const influencer = initialInfluencers.find(i => i.id === Number(id));
  if (!influencer) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Influencers", path: "/influencers" }, { label: "Não encontrado" }]} />
        <button onClick={() => navigate("/influencers")} className="btn-ghost"><ArrowLeft size={14} /> Voltar</button>
        <div className="glass-card p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Influenciador não encontrado</p>
          <p className="text-sm mt-2">O ID informado não corresponde a nenhum registro.</p>
        </div>
      </div>
    );
  }

  const lps = initialInfluencerLPs.filter(lp => lp.influencerId === influencer.id);
  const links = initialLinks.filter(l => l.influencer.includes(influencer.nome.split(" ")[0]));
  const campanhas = initialCampanhas.filter(c => c.influencer.includes(influencer.nome.split(" ")[0]));
  const conteudos = initialConteudos.filter(c => c.influencer.includes(influencer.nome.split(" ")[0]));
  const saques = initialSaques.filter(s => s.nome === influencer.nome);
  const totalCliques = lps.reduce((a, l) => a + l.cliques, 0) + links.reduce((a, l) => a + l.cliques, 0);

  const ganhos = [
    { periodo: "Mar/2026", receita: Math.round(influencer.receita * 0.35), comissao: Math.round(influencer.receita * 0.35 * influencer.perc / 100), status: "Parcial" },
    { periodo: "Fev/2026", receita: Math.round(influencer.receita * 0.38), comissao: Math.round(influencer.receita * 0.38 * influencer.perc / 100), status: "Pago" },
    { periodo: "Jan/2026", receita: Math.round(influencer.receita * 0.27), comissao: Math.round(influencer.receita * 0.27 * influencer.perc / 100), status: "Pago" },
  ];
  const totalComissao = Math.round(influencer.receita * influencer.perc / 100);

  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); toast({ title: "URL copiada!", description: url }); };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Influencers", path: "/influencers" }, { label: influencer.nome }]} />
      <button onClick={() => navigate("/influencers")} className="btn-ghost"><ArrowLeft size={14} /> Voltar para Influencers</button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-foreground">{influencer.nome.charAt(0)}</div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{influencer.nome}</h1>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
            <span>{influencer.insta}</span> · {influencer.seg} seguidores ·
            <span className="badge-neutral">{influencer.tipo}</span>
            <span className={influencer.status === "Ativo" ? "badge-success" : influencer.status === "Pausado" ? "badge-warning" : "badge-neutral"}>{influencer.status}</span>
            <span className="font-mono text-xs text-muted-foreground">slug: {influencer.slug}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/comissoes")} className="btn-ghost text-xs">Comissões</button>
          <button onClick={() => navigate("/saques")} className="btn-ghost text-xs">Saques</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Receita Gerada</span><p className="text-lg font-bold">R$ {influencer.receita.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Saldo Disponível</span><p className="text-lg font-bold text-success">R$ {influencer.saldo.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Comissão ({influencer.perc}%)</span><p className="text-lg font-bold">R$ {totalComissao.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Links Ativos</span><p className="text-lg font-bold">{links.filter(l => l.status === "Ativo").length}</p></div>
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Total Cliques</span><p className="text-lg font-bold">{totalCliques.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-warning"><span className="text-[10px] text-muted-foreground uppercase">LPs Vinculadas</span><p className="text-lg font-bold">{lps.length}</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`${tab === t.key ? "tab-btn-active" : "tab-btn"} whitespace-nowrap flex items-center gap-1.5`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* RESUMO */}
      {tab === "resumo" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <h3 className="section-title">Informações</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">Slug</span><p className="font-mono text-accent">{influencer.slug}</p></div>
                <div><span className="text-xs text-muted-foreground">Último Saque</span><p>{influencer.ultimoSaque}</p></div>
                <div><span className="text-xs text-muted-foreground">Affiliate Link</span><p className="text-xs break-all">{influencer.affiliate_link || "—"}</p></div>
                <div><span className="text-xs text-muted-foreground">Template</span><p>{influencer.landing_template || "—"}</p></div>
                <div><span className="text-xs text-muted-foreground">Criado em</span><p>{influencer.created_at}</p></div>
                <div><span className="text-xs text-muted-foreground">Atualizado em</span><p>{influencer.updated_at}</p></div>
              </div>
            </div>
            <div className="glass-card p-5">
              <h3 className="section-title">Landing Pages Vinculadas</h3>
              {lps.length > 0 ? (
                <div className="space-y-2">
                  {lps.map(lp => (
                    <div key={lp.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                      <div>
                        <p className="text-sm font-medium">{lp.templateNome}</p>
                        <p className="font-mono text-xs text-accent">playbet.com{lp.urlPublica}</p>
                        <p className="text-xs text-muted-foreground mt-1">{lp.cliques.toLocaleString()} cliques · {lp.status}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => copyUrl(`https://playbet.com${lp.urlPublica}`)} className="btn-ghost text-xs py-1 px-2"><Copy size={11} /> Copiar</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhuma LP vinculada</p>
                  <button onClick={() => navigate("/link-engine")} className="text-accent text-xs underline mt-1">Vincular na Engine de Links</button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate("/link-engine")} className="btn-ghost text-xs">→ Engine de Links</button>
            <button onClick={() => navigate("/landing-pages")} className="btn-ghost text-xs">→ Landing Pages</button>
            <button onClick={() => navigate("/links")} className="btn-ghost text-xs">→ Links Afiliados</button>
            <button onClick={() => navigate("/comissoes")} className="btn-ghost text-xs">→ Comissões</button>
            <button onClick={() => navigate("/campanhas")} className="btn-ghost text-xs">→ Campanhas</button>
          </div>
        </div>
      )}

      {/* LANDING PAGES */}
      {tab === "landing" && (
        <div className="space-y-4 animate-fade-in">
          {lps.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground">
              <Globe size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma landing page vinculada</p>
              <p className="text-xs mt-1">Vá para <button onClick={() => navigate("/link-engine")} className="text-accent underline">Engine de Links</button> para criar um vínculo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lps.map(lp => (
                <div key={lp.id} className="glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="section-title mb-0">{lp.templateNome}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => copyUrl(`https://playbet.com${lp.urlPublica}`)} className="btn-ghost text-xs"><Copy size={12} /> Copiar URL</button>
                      <button onClick={() => setEditLPOpen(true)} className="btn-ghost text-xs"><Edit size={12} /> Editar</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                    <div><span className="text-xs text-muted-foreground">URL Pública</span><p className="font-mono text-accent text-xs">playbet.com{lp.urlPublica}</p></div>
                    <div><span className="text-xs text-muted-foreground">Template</span><p>{lp.templateNome}</p></div>
                    <div><span className="text-xs text-muted-foreground">Cliques</span><p className="font-bold text-lg">{lp.cliques.toLocaleString()}</p></div>
                    <div><span className="text-xs text-muted-foreground">Status</span><p><span className={lp.status === "Ativo" ? "badge-success" : "badge-danger"}>{lp.status}</span></p></div>
                    <div><span className="text-xs text-muted-foreground">Última Atividade</span><p className="text-xs">{lp.ultimaAtividade}</p></div>
                  </div>
                  <div><span className="text-xs text-muted-foreground">Affiliate Link</span><p className="text-xs break-all mt-1">{lp.affiliateLink}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LINKS */}
      {tab === "links" && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">Links Totais</span><p className="text-lg font-bold">{links.length}</p></div>
            <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">Ativos</span><p className="text-lg font-bold text-success">{links.filter(l => l.status === "Ativo").length}</p></div>
            <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">Cliques de Links</span><p className="text-lg font-bold">{links.reduce((a, l) => a + l.cliques, 0).toLocaleString()}</p></div>
          </div>
          {links.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground"><p className="font-medium">Nenhum link encontrado.</p></div>
          ) : (
            <div className="glass-card overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Nome</th><th>Jogo</th><th>Plataforma</th><th>UTM Source</th><th>SubID</th><th>Cliques</th><th>Último Clique</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>{links.map((l) => (
                  <tr key={l.id}>
                    <td className="font-medium text-xs">{l.nome}</td>
                    <td>{l.jogo}</td>
                    <td>{l.plat}</td>
                    <td className="font-mono text-xs">{l.source}</td>
                    <td className="font-mono text-xs text-accent">{l.subid}</td>
                    <td className="font-medium">{l.cliques.toLocaleString()}</td>
                    <td className="text-xs text-muted-foreground">{l.ultimoClique}</td>
                    <td><span className={l.status === "Ativo" ? "badge-success" : "badge-danger"}>{l.status}</span></td>
                    <td><button onClick={() => { navigator.clipboard.writeText(`https://playbet.com/${l.source}?subid=${l.subid}`); toast({ title: "Link copiado!" }); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Copy size={12} /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CAMPANHAS */}
      {tab === "campanhas" && (
        <div className="animate-fade-in">
          {campanhas.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground"><p className="font-medium">Nenhuma campanha vinculada.</p></div>
          ) : (
            <div className="glass-card overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Nome</th><th>Objetivo</th><th>Jogo</th><th>Plataforma</th><th>Início</th><th>Fim</th><th>Status</th><th>Resultado</th></tr></thead>
                <tbody>{campanhas.map(c => (
                  <tr key={c.id}><td className="font-medium">{c.nome}</td><td className="text-xs">{c.objetivo}</td><td>{c.jogo}</td><td>{c.plat}</td><td>{c.inicio}</td><td>{c.fim}</td>
                    <td><span className={c.status === "Ativa" ? "badge-success" : c.status === "Planejada" ? "badge-info" : "badge-neutral"}>{c.status}</span></td>
                    <td className="text-xs">{c.resultado}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* GANHOS */}
      {tab === "ganhos" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Receita Total</span><p className="text-lg font-bold">R$ {influencer.receita.toLocaleString()}</p></div>
            <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Comissão Total</span><p className="text-lg font-bold text-success">R$ {totalComissao.toLocaleString()}</p></div>
            <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Saldo Pendente</span><p className="text-lg font-bold">R$ {influencer.saldo.toLocaleString()}</p></div>
            <div className="stat-card border-l-2 border-l-info cursor-pointer hover:bg-secondary/40" onClick={() => navigate("/saques")}><span className="text-[10px] text-muted-foreground uppercase">Já Sacado</span><p className="text-lg font-bold">R$ {(totalComissao - influencer.saldo).toLocaleString()}</p></div>
          </div>
          <div className="glass-card p-5">
            <h3 className="section-title">Evolução de Ganhos</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ganhos}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                <XAxis dataKey="periodo" stroke="hsl(0 0% 40%)" fontSize={11} />
                <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
                <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
                <Bar dataKey="receita" fill="hsl(0 0% 25%)" radius={[3, 3, 0, 0]} name="Receita" />
                <Bar dataKey="comissao" fill="hsl(152 69% 41%)" radius={[3, 3, 0, 0]} name="Comissão" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Período</th><th>Receita</th><th>Comissão ({influencer.perc}%)</th><th>Status</th></tr></thead>
              <tbody>{ganhos.map((g, i) => (
                <tr key={i}><td>{g.periodo}</td><td>R$ {g.receita.toLocaleString()}</td><td className="text-success font-medium">R$ {g.comissao.toLocaleString()}</td>
                  <td><span className={g.status === "Pago" ? "badge-success" : "badge-warning"}>{g.status}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* SAQUES */}
      {tab === "saques" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="stat-card border-l-2 border-l-success w-fit"><span className="text-[10px] text-muted-foreground uppercase">Saldo Disponível para Saque</span><p className="text-xl font-bold text-success">R$ {influencer.saldo.toLocaleString()}</p></div>
            <button onClick={() => navigate("/saques")} className="btn-primary text-xs">Solicitar Saque</button>
          </div>
          {saques.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground"><p className="font-medium">Nenhum saque registrado.</p></div>
          ) : (
            <div className="glass-card overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Valor</th><th>Data</th><th>Conta</th><th>Status</th></tr></thead>
                <tbody>{saques.map(s => (
                  <tr key={s.id}><td className="font-mono text-xs">{s.id}</td><td className="font-semibold">R$ {s.valor.toLocaleString()}</td><td className="text-xs">{s.data}</td><td className="font-mono text-xs">{s.conta}</td>
                    <td><span className={s.status === "Aprovado" ? "badge-success" : s.status === "Pendente" ? "badge-warning" : "badge-danger"}>{s.status}</span></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CLIQUES */}
      {tab === "cliques" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Total Cliques</span><p className="text-lg font-bold">{totalCliques.toLocaleString()}</p></div>
            <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Hoje</span><p className="text-lg font-bold">820</p></div>
            <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Fonte Principal</span><p className="text-sm font-bold">Instagram</p></div>
            <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Device Principal</span><p className="text-sm font-bold">Mobile (78%)</p></div>
          </div>
          <div className="glass-card p-5">
            <h3 className="section-title">Cliques por Dia</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mockClicks}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                <XAxis dataKey="data" stroke="hsl(0 0% 40%)" fontSize={11} />
                <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
                <Tooltip contentStyle={chartTooltip} />
                <Line type="monotone" dataKey="cliques" stroke="hsl(45 100% 50%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-5">
            <h3 className="section-title">Cliques Recentes</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Data/Hora</th><th>Referrer</th><th>Device</th><th>Rota</th><th>IP</th></tr></thead>
                <tbody>{clicksRecentes.map(c => (
                  <tr key={c.id}>
                    <td className="text-xs whitespace-nowrap">{c.hora}</td>
                    <td className="text-xs text-accent">{c.referrer}</td>
                    <td className="text-xs">{c.device}</td>
                    <td className="font-mono text-xs">{c.rota}</td>
                    <td className="font-mono text-xs text-muted-foreground">{c.ip}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDOS */}
      {tab === "conteudos" && (
        <div className="animate-fade-in">
          {conteudos.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground"><p className="font-medium">Nenhum conteúdo vinculado.</p></div>
          ) : (
            <div className="glass-card overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Data</th><th>Tipo</th><th>Tema</th><th>Jogo</th><th>Campanha</th><th>Status</th></tr></thead>
                <tbody>{conteudos.map(c => (
                  <tr key={c.id}><td>{c.data}</td><td><span className="badge-neutral">{c.tipo}</span></td><td>{c.tema}</td><td>{c.jogo}</td><td>{c.campanha}</td>
                    <td><span className={c.status === "Publicado" ? "badge-success" : c.status === "Agendado" ? "badge-info" : c.status === "Produção" ? "badge-warning" : "badge-neutral"}>{c.status}</span></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* OBSERVAÇÕES */}
      {tab === "obs" && (
        <div className="glass-card p-5 animate-fade-in space-y-3">
          <h3 className="section-title">Observações</h3>
          {influencer.observacoes && <p className="text-sm text-muted-foreground italic mb-2">Nota salva: {influencer.observacoes}</p>}
          <textarea className="input-field min-h-[120px]" placeholder="Adicionar observação sobre o influencer..." value={obs} onChange={e => setObs(e.target.value)} />
          <button className="btn-primary" onClick={() => toast({ title: "Observação salva" })}>Salvar Observação</button>
        </div>
      )}

      {/* Edit LP Modal */}
      <Dialog open={editLPOpen} onOpenChange={setEditLPOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Vínculo de LP</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Para editar o vínculo deste influenciador com a landing page, utilize a <button onClick={() => { setEditLPOpen(false); navigate("/link-engine"); }} className="text-accent underline">Engine de Links</button>.</p>
          <DialogFooter><button className="btn-ghost" onClick={() => setEditLPOpen(false)}>Fechar</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
