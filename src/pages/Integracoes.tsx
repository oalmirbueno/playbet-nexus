import { useState } from "react";
import { Plug, CheckCircle, AlertTriangle, Clock, RefreshCw, Play, Settings, Database, CreditCard, BarChart3, Cloud, Webhook, Zap, ExternalLink } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Integracao {
  id: number; nome: string; desc: string; tipo: string; status: "Conectado" | "Pendente" | "Erro";
  ultimaSinc: string; saude: "Saudável" | "Atenção" | "Crítico" | "—"; icon: React.ElementType;
  logs: { data: string; tipo: string; msg: string; status: string }[];
  payloadExemplo: string;
}

const integracoes: Integracao[] = [
  {
    id: 1, nome: "Supabase", desc: "Banco de dados PostgreSQL, autenticação e storage", tipo: "Backend", status: "Pendente", ultimaSinc: "—", saude: "—", icon: Database,
    logs: [], payloadExemplo: '{ "table": "influencers", "action": "INSERT", "record": { "nome": "..." } }',
  },
  {
    id: 2, nome: "Asaas", desc: "Plataforma de pagamentos — PIX automático, TED, boletos", tipo: "Financeiro", status: "Pendente", ultimaSinc: "—", saude: "—", icon: CreditCard,
    logs: [{ data: "04/03 10:00", tipo: "Config", msg: "API Key pendente", status: "Aviso" }],
    payloadExemplo: '{ "customer": "cus_xxx", "billingType": "PIX", "value": 8500 }',
  },
  {
    id: 3, nome: "Google Analytics 4", desc: "Rastreamento avançado de eventos, conversões e funil", tipo: "Analytics", status: "Conectado", ultimaSinc: "05/03/2026 14:30", saude: "Saudável", icon: BarChart3,
    logs: [
      { data: "05/03 14:30", tipo: "Sync", msg: "Eventos sincronizados: 1.240", status: "Sucesso" },
      { data: "05/03 10:00", tipo: "Sync", msg: "Eventos sincronizados: 890", status: "Sucesso" },
    ],
    payloadExemplo: '{ "event_name": "page_view", "params": { "page_title": "Fortune Tiger LP" } }',
  },
  {
    id: 4, nome: "Lovable Cloud", desc: "Backend integrado — banco, auth, functions e storage", tipo: "Infra", status: "Pendente", ultimaSinc: "—", saude: "—", icon: Cloud,
    logs: [], payloadExemplo: '{ "function": "process-payment", "payload": { ... } }',
  },
  {
    id: 5, nome: "n8n", desc: "Automação de workflows e integrações entre serviços", tipo: "Automação", status: "Pendente", ultimaSinc: "—", saude: "—", icon: Zap,
    logs: [], payloadExemplo: '{ "workflow": "new-influencer-onboard", "trigger": "webhook" }',
  },
  {
    id: 6, nome: "Webhooks", desc: "Endpoints para eventos em tempo real do sistema", tipo: "API", status: "Conectado", ultimaSinc: "05/03/2026 14:32", saude: "Atenção", icon: Webhook,
    logs: [
      { data: "05/03 14:32", tipo: "Event", msg: "saque.solicitado → endpoint /hooks/saque", status: "Sucesso" },
      { data: "05/03 13:18", tipo: "Event", msg: "link.criado → endpoint /hooks/link", status: "Sucesso" },
      { data: "04/03 18:00", tipo: "Error", msg: "Timeout em /hooks/conversion", status: "Erro" },
    ],
    payloadExemplo: '{ "event": "saque.solicitado", "data": { "id": "SAQ-001", "valor": 8500 } }',
  },
];

export default function Integracoes() {
  const [detail, setDetail] = useState<Integracao | null>(null);

  const statusIcon = (s: Integracao["status"]) => {
    if (s === "Conectado") return <CheckCircle size={14} className="text-success" />;
    if (s === "Erro") return <AlertTriangle size={14} className="text-destructive" />;
    return <Clock size={14} className="text-warning" />;
  };

  const saudeBadge = (s: Integracao["saude"]) => {
    if (s === "Saudável") return <span className="badge-success">{s}</span>;
    if (s === "Atenção") return <span className="badge-warning">{s}</span>;
    if (s === "Crítico") return <span className="badge-danger">{s}</span>;
    return <span className="badge-neutral">—</span>;
  };

  const testar = (int: Integracao) => {
    toast.success(`Teste de conexão: ${int.nome} — ${int.status === "Conectado" ? "OK" : "Falha (não configurado)"}`);
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Integrações" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
          <p className="text-sm text-muted-foreground mt-1">Central de conexões — status, logs, saúde e configuração de cada serviço</p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integracoes.map(int => (
          <div key={int.id} className="glass-card p-6 hover:border-primary/15 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/60 flex items-center justify-center">
                  <int.icon size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{int.nome}</p>
                  <span className="badge-neutral">{int.tipo}</span>
                </div>
              </div>
              {statusIcon(int.status)}
            </div>
            <p className="text-xs text-muted-foreground mb-4">{int.desc}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Status</p>
                <span className={int.status === "Conectado" ? "badge-success" : int.status === "Erro" ? "badge-danger" : "badge-warning"}>{int.status}</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Saúde</p>
                {saudeBadge(int.saude)}
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Última Sinc.</p>
                <p className="text-xs">{int.ultimaSinc}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-border">
              <button onClick={() => setDetail(int)} className="btn-ghost text-xs flex-1"><Eye size={12} />Detalhes</button>
              <button onClick={() => testar(int)} className="btn-ghost text-xs flex-1"><Play size={12} />Testar</button>
              <button className={`${int.status === "Conectado" ? "btn-ghost" : "btn-primary"} text-xs flex-1`}>
                <Settings size={12} />{int.status === "Conectado" ? "Config" : "Conectar"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plug size={16} /> {detail?.nome}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { l: "Tipo", v: detail.tipo }, { l: "Status", v: detail.status },
                  { l: "Saúde", v: detail.saude }, { l: "Última Sinc.", v: detail.ultimaSinc },
                ].map(f => (
                  <div key={f.l}>
                    <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">{f.l}</p>
                    <p className="text-sm font-medium">{f.v}</p>
                  </div>
                ))}
              </div>

              {/* Logs */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Últimas Execuções</h4>
                {detail.logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum log registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.logs.map((log, i) => (
                      <div key={i} className="flex items-center gap-3 glass-card-elevated px-4 py-3 rounded-md">
                        <span className="text-[11px] text-muted-foreground font-mono w-24 shrink-0">{log.data}</span>
                        <span className="badge-neutral">{log.tipo}</span>
                        <span className="text-xs flex-1">{log.msg}</span>
                        <span className={log.status === "Sucesso" ? "badge-success" : log.status === "Erro" ? "badge-danger" : "badge-warning"}>{log.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payload */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Payload Exemplo</h4>
                <pre className="bg-secondary/50 border border-border rounded-md p-4 text-[11px] font-mono overflow-x-auto">{detail.payloadExemplo}</pre>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button onClick={() => testar(detail)} className="btn-ghost text-xs"><Play size={12} />Testar Conexão</button>
                <button className="btn-ghost text-xs"><RefreshCw size={12} />Reprocessar</button>
                <button className="btn-ghost text-xs"><Settings size={12} />Configurar</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Eye icon import
import { Eye } from "lucide-react";
