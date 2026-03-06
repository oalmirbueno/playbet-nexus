import { MousePointerClick, UserPlus, DollarSign, Wallet, Calendar, Megaphone, FileText, Gamepad2, TrendingUp, ExternalLink, Eye, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const widgets = [
  { label: "Cliques Hoje", value: "4.230", trend: "+14%", icon: MousePointerClick, path: "/analytics" },
  { label: "Novos Leads", value: "312", trend: "+9%", icon: UserPlus, path: "/conversoes" },
  { label: "Novos Cadastros", value: "187", trend: "+11%", icon: TrendingUp, path: "/conversoes" },
  { label: "Depósitos Estimados", value: "R$ 9.350", trend: "+18%", icon: DollarSign, path: "/financeiro" },
  { label: "Solicitações de Saque", value: "6", trend: "pendentes", icon: Wallet, path: "/saques" },
  { label: "Conteúdos Agendados", value: "8", trend: "esta semana", icon: Calendar, path: "/conteudo" },
  { label: "Campanhas Ativas", value: "3", trend: "em curso", icon: Megaphone, path: "/campanhas" },
  { label: "LPs em Alta", value: "Fortune Tiger LP", trend: "CTR 14.2%", icon: FileText, path: "/landing-pages" },
  { label: "Jogos em Alta", value: "Fortune Tiger", trend: "+32% cadastros", icon: Gamepad2, path: "/jogos" },
];

const atividades = [
  { data: "05/03 14:32", evento: "Saque solicitado", usuario: "Rafael Mendes", tipo: "Influencer", status: "Pendente", path: "/saques", modulo: "Saques" },
  { data: "05/03 13:18", evento: "Novo link criado", usuario: "Admin", tipo: "Sistema", status: "Ativo", path: "/links", modulo: "Links" },
  { data: "05/03 12:45", evento: "LP publicada", usuario: "Admin", tipo: "Marketing", status: "Publicado", path: "/landing-pages", modulo: "LPs" },
  { data: "05/03 11:20", evento: "Influencer adicionado", usuario: "Admin", tipo: "Gestão", status: "Ativo", path: "/influencers", modulo: "Influencers" },
  { data: "05/03 10:05", evento: "Campanha ativada", usuario: "Admin", tipo: "Marketing", status: "Ativo", path: "/campanhas", modulo: "Campanhas" },
  { data: "05/03 09:30", evento: "Saque aprovado", usuario: "Ana Souza", tipo: "Influencer", status: "Aprovado", path: "/saques", modulo: "Saques" },
  { data: "04/03 18:45", evento: "Percentual alterado", usuario: "Admin", tipo: "Financeiro", status: "Atualizado", path: "/regras", modulo: "Regras" },
  { data: "04/03 16:20", evento: "Novo jogo cadastrado", usuario: "Admin", tipo: "Ativos", status: "Ativo", path: "/jogos", modulo: "Jogos" },
];

const feedEventos = [
  { time: "14:32", msg: "Novo saque solicitado por Rafael Mendes — R$ 8.500", tipo: "saque", path: "/saques" },
  { time: "13:18", msg: "Novo link cadastrado: Fortune Tiger → Bet365", tipo: "link", path: "/links" },
  { time: "12:45", msg: "Nova LP criada: Aviator Promo Março", tipo: "lp", path: "/landing-pages" },
  { time: "11:20", msg: "Novo influencer: Marcos Oliveira (@marcos.bet)", tipo: "influencer", path: "/influencers" },
  { time: "10:05", msg: "Campanha 'Março Turbo' ativada", tipo: "campanha", path: "/campanhas" },
  { time: "09:30", msg: "Saque de Ana Souza aprovado — R$ 2.800", tipo: "saque", path: "/saques" },
  { time: "08:15", msg: "Link Spaceman/Pixbet desativado automaticamente", tipo: "link", path: "/links" },
];

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = { Pendente: "badge-warning", Ativo: "badge-success", Publicado: "badge-info", Aprovado: "badge-success", Atualizado: "badge-primary" };
  return map[status] || "badge-neutral";
};

const getEventColor = (tipo: string) => {
  const map: Record<string, string> = { saque: "bg-warning", link: "bg-primary", lp: "bg-info", influencer: "bg-success", campanha: "bg-muted-foreground" };
  return map[tipo] || "bg-muted";
};

export default function DashboardOperacional() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Operacional</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão do dia a dia — ações, eventos e métricas em tempo real</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((w) => (
          <div
            key={w.label}
            onClick={() => navigate(w.path)}
            className="glass-card p-6 cursor-pointer hover:bg-secondary/30 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{w.label}</span>
              <w.icon size={15} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold tracking-tight">{w.value}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-success font-medium">{w.trend}</span>
              <ExternalLink size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividades Recentes */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Atividades Recentes</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Evento</th>
                  <th>Usuário</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {atividades.map((a, i) => (
                  <tr key={i} className="group">
                    <td className="text-muted-foreground text-xs whitespace-nowrap">{a.data}</td>
                    <td className="font-medium">{a.evento}</td>
                    <td>{a.usuario}</td>
                    <td><span className="badge-neutral">{a.tipo}</span></td>
                    <td><span className={getStatusBadge(a.status)}>{a.status}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(a.path)}
                          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                          title="Ver detalhe"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => navigate(a.path)}
                          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                          title={`Ir para ${a.modulo}`}
                        >
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feed de Eventos */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Feed de Eventos</h3>
          <div className="space-y-3">
            {feedEventos.map((e, i) => (
              <div
                key={i}
                onClick={() => navigate(e.path)}
                className="flex items-start gap-3 cursor-pointer hover:bg-secondary/30 rounded-lg p-2 -mx-2 transition-colors group"
              >
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${getEventColor(e.tipo)}`} />
                  {i < feedEventos.length - 1 && <div className="w-px h-full bg-border mt-1 min-h-[20px]" />}
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <p className="text-sm">{e.msg}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
