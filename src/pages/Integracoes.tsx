import { Plug, CheckCircle, Clock } from "lucide-react";

const integracoes = [
  { nome: "Asaas", desc: "Plataforma de pagamentos — PIX automático, TED, boletos", status: "Pendente", tipo: "Financeiro" },
  { nome: "Google Analytics 4", desc: "Rastreamento avançado de eventos, conversões e funil", status: "Conectado", tipo: "Analytics" },
  { nome: "Facebook Pixel", desc: "Pixel de conversão para campanhas de aquisição", status: "Conectado", tipo: "Marketing" },
  { nome: "Telegram Bot API", desc: "Bot para notificações automáticas e distribuição de links", status: "Pendente", tipo: "Comunicação" },
  { nome: "Google Sheets", desc: "Exportação automática de relatórios financeiros", status: "Pendente", tipo: "Dados" },
  { nome: "Webhook Personalizado", desc: "Endpoint para eventos em tempo real", status: "Pendente", tipo: "API" },
];

export default function Integracoes() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Integrações</h1><p className="page-subtitle">Conexões com serviços externos e APIs</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integracoes.map((int) => (
          <div key={int.nome} className="glass-card-hover p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Plug size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{int.nome}</p>
                  <span className="badge-neutral">{int.tipo}</span>
                </div>
              </div>
              <span className={int.status === "Conectado" ? "badge-success" : "badge-warning"}>{int.status}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{int.desc}</p>
            <button className={`mt-3 ${int.status === "Conectado" ? "btn-ghost" : "btn-primary"} text-xs`}>
              {int.status === "Conectado" ? "Configurar" : "Conectar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
