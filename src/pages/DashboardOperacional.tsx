import { MousePointerClick, UserPlus, DollarSign, Wallet, Calendar, Megaphone, FileText, Gamepad2, TrendingUp } from "lucide-react";

const widgets = [
  { label: "Cliques Hoje", value: "4.230", trend: "+14%", icon: MousePointerClick },
  { label: "Novos Leads", value: "312", trend: "+9%", icon: UserPlus },
  { label: "Novos Cadastros", value: "187", trend: "+11%", icon: TrendingUp },
  { label: "Depósitos Estimados", value: "R$ 9.350", trend: "+18%", icon: DollarSign },
  { label: "Solicitações de Saque", value: "6", trend: "pendentes", icon: Wallet },
  { label: "Conteúdos Agendados", value: "8", trend: "esta semana", icon: Calendar },
  { label: "Campanhas Ativas", value: "3", trend: "em curso", icon: Megaphone },
  { label: "LPs em Alta", value: "Fortune Tiger LP", trend: "CTR 14.2%", icon: FileText },
  { label: "Jogos em Alta", value: "Fortune Tiger", trend: "+32% cadastros", icon: Gamepad2 },
];

const atividades = [
  { data: "05/03 14:32", evento: "Saque solicitado", usuario: "Rafael Mendes", tipo: "Influencer", status: "Pendente" },
  { data: "05/03 13:18", evento: "Novo link criado", usuario: "Admin", tipo: "Sistema", status: "Ativo" },
  { data: "05/03 12:45", evento: "LP publicada", usuario: "Admin", tipo: "Marketing", status: "Publicado" },
  { data: "05/03 11:20", evento: "Influencer adicionado", usuario: "Admin", tipo: "Gestão", status: "Ativo" },
  { data: "05/03 10:05", evento: "Campanha ativada", usuario: "Admin", tipo: "Marketing", status: "Ativo" },
  { data: "05/03 09:30", evento: "Saque aprovado", usuario: "Ana Souza", tipo: "Influencer", status: "Aprovado" },
  { data: "04/03 18:45", evento: "Percentual alterado", usuario: "Admin", tipo: "Financeiro", status: "Atualizado" },
  { data: "04/03 16:20", evento: "Novo jogo cadastrado", usuario: "Admin", tipo: "Ativos", status: "Ativo" },
];

const feedEventos = [
  { time: "14:32", msg: "Novo saque solicitado por Rafael Mendes — R$ 8.500", tipo: "saque" },
  { time: "13:18", msg: "Novo link cadastrado: Fortune Tiger → Bet365", tipo: "link" },
  { time: "12:45", msg: "Nova LP criada: Aviator Promo Março", tipo: "lp" },
  { time: "11:20", msg: "Novo influencer: Marcos Oliveira (@marcos.bet)", tipo: "influencer" },
  { time: "10:05", msg: "Campanha 'Março Turbo' ativada", tipo: "campanha" },
  { time: "09:30", msg: "Saque de Ana Souza aprovado — R$ 2.800", tipo: "saque" },
  { time: "08:15", msg: "Link Spaceman/Pixbet desativado automaticamente", tipo: "link" },
];

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = { Pendente: "badge-warning", Ativo: "badge-success", Publicado: "badge-info", Aprovado: "badge-success", Atualizado: "badge-primary" };
  return map[status] || "badge-neutral";
};

const getEventColor = (tipo: string) => {
  const map: Record<string, string> = { saque: "bg-warning", link: "bg-primary", lp: "bg-info", influencer: "bg-success", campanha: "bg-accent" };
  return map[tipo] || "bg-muted";
};

export default function DashboardOperacional() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard Operacional</h1>
        <p className="page-subtitle">Visão do dia a dia — ações, eventos e métricas em tempo real</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {widgets.map((w) => (
          <div key={w.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{w.label}</span>
              <w.icon size={15} className="text-muted-foreground" />
            </div>
            <div className="text-xl font-bold">{w.value}</div>
            <span className="text-[11px] text-success font-medium">{w.trend}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="section-title">Atividades Recentes</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Evento</th>
                  <th>Usuário</th>
                  <th>Tipo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {atividades.map((a, i) => (
                  <tr key={i}>
                    <td className="text-muted-foreground text-xs whitespace-nowrap">{a.data}</td>
                    <td className="font-medium">{a.evento}</td>
                    <td>{a.usuario}</td>
                    <td><span className="badge-neutral">{a.tipo}</span></td>
                    <td><span className={getStatusBadge(a.status)}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="section-title">Feed de Eventos</h3>
          <div className="space-y-3">
            {feedEventos.map((e, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${getEventColor(e.tipo)}`} />
                  {i < feedEventos.length - 1 && <div className="w-px h-full bg-border mt-1 min-h-[20px]" />}
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <p className="text-xs">{e.msg}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{e.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
