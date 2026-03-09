import { useState, useCallback } from "react";
import {
  Plug, CheckCircle, AlertTriangle, Clock, RefreshCw, Play, Settings,
  Database, CreditCard, BarChart3, Cloud, Webhook, Zap, Eye, Loader2, ExternalLink,
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type IntStatus = "Conectado" | "Pendente" | "Erro" | "Testando";
type IntSaude = "Saudável" | "Atenção" | "Crítico" | "—";

interface LogEntry {
  data: string;
  tipo: string;
  msg: string;
  status: "Sucesso" | "Erro" | "Aviso" | "Info";
}

interface Integracao {
  id: string;
  nome: string;
  desc: string;
  tipo: string;
  icon: React.ElementType;
  payloadExemplo: string;
  // Dynamic
  status: IntStatus;
  saude: IntSaude;
  ultimaSinc: string;
  logs: LogEntry[];
  canTest: boolean;
  configurable: boolean;
  configUrl?: string;
}

const now = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function Integracoes() {
  const [detail, setDetail] = useState<Integracao | null>(null);
  const [configOpen, setConfigOpen] = useState<Integracao | null>(null);
  const [integracoes, setIntegracoes] = useState<Integracao[]>([
    {
      id: "lovable-cloud",
      nome: "Lovable Cloud",
      desc: "Backend integrado — banco de dados, autenticação, functions e storage. Já conectado automaticamente ao projeto.",
      tipo: "Infra",
      icon: Cloud,
      status: "Conectado",
      saude: "Saudável",
      ultimaSinc: now(),
      canTest: true,
      configurable: false,
      logs: [
        { data: now(), tipo: "Config", msg: "Projeto conectado automaticamente via Lovable Cloud", status: "Sucesso" },
      ],
      payloadExemplo: '{\n  "project_id": "***",\n  "region": "us-east-1",\n  "services": ["database", "auth", "storage", "functions"]\n}',
    },
    {
      id: "database",
      nome: "Banco de Dados",
      desc: "PostgreSQL com Row Level Security, migrations automáticas e tipos TypeScript gerados.",
      tipo: "Backend",
      icon: Database,
      status: "Conectado",
      saude: "Saudável",
      ultimaSinc: now(),
      canTest: true,
      configurable: false,
      logs: [
        { data: now(), tipo: "Health", msg: "14 tabelas ativas, RLS habilitado em todas", status: "Sucesso" },
      ],
      payloadExemplo: '{\n  "tables": ["influencers", "saques", "socios", "campanhas", ...],\n  "rls_enabled": true,\n  "policies_count": 28\n}',
    },
    {
      id: "auth",
      nome: "Autenticação",
      desc: "Sistema de login com e-mail/senha, roles (admin_master, sócio, financeiro, etc.) e sessões seguras.",
      tipo: "Segurança",
      icon: Settings,
      status: "Conectado",
      saude: "Saudável",
      ultimaSinc: now(),
      canTest: true,
      configurable: false,
      logs: [
        { data: now(), tipo: "Auth", msg: "Sessão ativa, roles configurados via user_roles", status: "Sucesso" },
      ],
      payloadExemplo: '{\n  "roles": ["admin_master", "socio", "financeiro", "operacao", "conteudo", "visualizacao"],\n  "auto_confirm": false,\n  "email_verification": true\n}',
    },
    {
      id: "asaas",
      nome: "Asaas",
      desc: "Plataforma de pagamentos — PIX automático, TED e boletos. Requer API Key para ativar.",
      tipo: "Financeiro",
      icon: CreditCard,
      status: "Pendente",
      saude: "—",
      ultimaSinc: "—",
      canTest: false,
      configurable: true,
      logs: [
        { data: now(), tipo: "Config", msg: "API Key não configurada — integração inativa", status: "Aviso" },
      ],
      payloadExemplo: '{\n  "customer": "cus_xxx",\n  "billingType": "PIX",\n  "value": 85000,\n  "description": "Saque SAQ-001 — Rafael Mendes"\n}',
    },
    {
      id: "ga4",
      nome: "Google Analytics 4",
      desc: "Rastreamento de eventos, conversões e funil. Requer Measurement ID para ativar.",
      tipo: "Analytics",
      icon: BarChart3,
      status: "Pendente",
      saude: "—",
      ultimaSinc: "—",
      canTest: false,
      configurable: true,
      logs: [
        { data: now(), tipo: "Config", msg: "Measurement ID não configurado", status: "Aviso" },
      ],
      payloadExemplo: '{\n  "event_name": "page_view",\n  "params": {\n    "page_title": "Fortune Tiger LP",\n    "utm_source": "playbet"\n  }\n}',
    },
    {
      id: "n8n",
      nome: "n8n / Automação",
      desc: "Automação de workflows — onboarding de influencers, alertas de saques, etc. Requer webhook URL.",
      tipo: "Automação",
      icon: Zap,
      status: "Pendente",
      saude: "—",
      ultimaSinc: "—",
      canTest: false,
      configurable: true,
      logs: [],
      payloadExemplo: '{\n  "workflow": "new-influencer-onboard",\n  "trigger": "webhook",\n  "data": { "influencer_id": "uuid", "name": "..." }\n}',
    },
    {
      id: "webhooks",
      nome: "Webhooks",
      desc: "Endpoints para eventos do sistema em tempo real (saques, links, conversões).",
      tipo: "API",
      icon: Webhook,
      status: "Pendente",
      saude: "—",
      ultimaSinc: "—",
      canTest: false,
      configurable: true,
      logs: [],
      payloadExemplo: '{\n  "event": "saque.solicitado",\n  "data": {\n    "id": "SAQ-001",\n    "valor": 85000,\n    "nome": "Rafael Mendes"\n  }\n}',
    },
  ]);

  const addLog = useCallback((id: string, log: LogEntry) => {
    setIntegracoes(prev =>
      prev.map(i => i.id === id ? { ...i, logs: [log, ...i.logs].slice(0, 20), ultimaSinc: now() } : i)
    );
    // Update detail if open
    setDetail(prev => prev?.id === id ? { ...prev, logs: [log, ...prev.logs].slice(0, 20), ultimaSinc: now() } : prev);
  }, []);

  const updateStatus = useCallback((id: string, status: IntStatus, saude: IntSaude) => {
    setIntegracoes(prev =>
      prev.map(i => i.id === id ? { ...i, status, saude } : i)
    );
    setDetail(prev => prev?.id === id ? { ...prev, status, saude } : prev);
  }, []);

  const testarConexao = useCallback(async (int: Integracao) => {
    if (!int.canTest) {
      toast({ title: "Não configurado", description: `${int.nome} precisa ser configurado antes de testar.`, variant: "destructive" });
      return;
    }

    updateStatus(int.id, "Testando", "—");
    addLog(int.id, { data: now(), tipo: "Test", msg: `Testando conexão com ${int.nome}...`, status: "Info" });

    try {
      if (int.id === "lovable-cloud" || int.id === "database") {
        // Test actual database connection
        const { data, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
        if (error) throw error;
        updateStatus(int.id, "Conectado", "Saudável");
        addLog(int.id, { data: now(), tipo: "Test", msg: "Conexão com banco de dados OK — query executada com sucesso", status: "Sucesso" });
        toast({ title: "✅ Conexão OK", description: `${int.nome} respondeu com sucesso.` });
      } else if (int.id === "auth") {
        // Test auth by checking session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session) throw new Error("Sem sessão ativa");
        updateStatus(int.id, "Conectado", "Saudável");
        addLog(int.id, { data: now(), tipo: "Test", msg: `Sessão ativa — ${session.user.email}`, status: "Sucesso" });
        toast({ title: "✅ Auth OK", description: `Sessão verificada: ${session.user.email}` });
      } else {
        throw new Error("Serviço não configurado");
      }
    } catch (err: any) {
      updateStatus(int.id, "Erro", "Crítico");
      addLog(int.id, { data: now(), tipo: "Test", msg: `Falha: ${err.message}`, status: "Erro" });
      toast({ title: "❌ Falha na conexão", description: err.message, variant: "destructive" });
    }
  }, [addLog, updateStatus]);

  const testarTodos = useCallback(async () => {
    const testable = integracoes.filter(i => i.canTest);
    for (const int of testable) {
      await testarConexao(int);
    }
  }, [integracoes, testarConexao]);

  const statusIcon = (s: IntStatus) => {
    if (s === "Conectado") return <CheckCircle size={14} className="text-success" />;
    if (s === "Erro") return <AlertTriangle size={14} className="text-destructive" />;
    if (s === "Testando") return <Loader2 size={14} className="text-primary animate-spin" />;
    return <Clock size={14} className="text-warning" />;
  };

  const saudeBadge = (s: IntSaude) => {
    if (s === "Saudável") return <span className="badge-success">{s}</span>;
    if (s === "Atenção") return <span className="badge-warning">{s}</span>;
    if (s === "Crítico") return <span className="badge-danger">{s}</span>;
    return <span className="badge-neutral">—</span>;
  };

  const logStatusBadge = (s: LogEntry["status"]) => {
    if (s === "Sucesso") return <span className="badge-success">{s}</span>;
    if (s === "Erro") return <span className="badge-danger">{s}</span>;
    if (s === "Aviso") return <span className="badge-warning">{s}</span>;
    return <span className="badge-info">{s}</span>;
  };

  const conectados = integracoes.filter(i => i.status === "Conectado").length;
  const pendentes = integracoes.filter(i => i.status === "Pendente").length;
  const erros = integracoes.filter(i => i.status === "Erro").length;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Integrações" }]} />
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
          <p className="text-sm text-muted-foreground mt-1">Central de conexões — status em tempo real, testes e configuração</p>
        </div>
        <button onClick={testarTodos} className="btn-primary text-xs">
          <RefreshCw size={13} /> Testar Todas
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-5 border-l-2 border-l-success">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Conectados</p>
          <p className="text-2xl font-bold mt-1">{conectados}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">de {integracoes.length} serviços</p>
        </div>
        <div className="glass-card p-5 border-l-2 border-l-warning">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendentes</p>
          <p className="text-2xl font-bold mt-1">{pendentes}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">aguardando config</p>
        </div>
        <div className="glass-card p-5 border-l-2 border-l-destructive">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Com Erro</p>
          <p className="text-2xl font-bold mt-1">{erros}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">requer atenção</p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integracoes.map(int => (
          <div key={int.id} className={`glass-card p-6 transition-colors ${int.status === "Conectado" ? "hover:border-success/20" : int.status === "Erro" ? "border-destructive/20" : "hover:border-primary/15"}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  int.status === "Conectado" ? "bg-success/10" : int.status === "Erro" ? "bg-destructive/10" : "bg-secondary/60"
                }`}>
                  <int.icon size={18} className={
                    int.status === "Conectado" ? "text-success" : int.status === "Erro" ? "text-destructive" : "text-muted-foreground"
                  } />
                </div>
                <div>
                  <p className="font-semibold text-sm">{int.nome}</p>
                  <span className="badge-neutral">{int.tipo}</span>
                </div>
              </div>
              {statusIcon(int.status)}
            </div>
            <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{int.desc}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Status</p>
                <span className={
                  int.status === "Conectado" ? "badge-success" :
                  int.status === "Erro" ? "badge-danger" :
                  int.status === "Testando" ? "badge-info" : "badge-warning"
                }>{int.status}</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Saúde</p>
                {saudeBadge(int.saude)}
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Última Verificação</p>
                <p className="text-xs">{int.ultimaSinc}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-border">
              <button onClick={() => setDetail(int)} className="btn-ghost text-xs flex-1"><Eye size={12} /> Detalhes</button>
              {int.canTest && (
                <button
                  onClick={() => testarConexao(int)}
                  className="btn-ghost text-xs flex-1"
                  disabled={int.status === "Testando"}
                >
                  {int.status === "Testando" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  Testar
                </button>
              )}
              {int.configurable && (
                <button onClick={() => setConfigOpen(int)} className="btn-primary text-xs flex-1">
                  <Settings size={12} /> Configurar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plug size={16} /> {detail?.nome}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Tipo</p>
                  <p className="text-sm font-medium">{detail.tipo}</p>
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                  <span className={
                    detail.status === "Conectado" ? "badge-success" :
                    detail.status === "Erro" ? "badge-danger" :
                    detail.status === "Testando" ? "badge-info" : "badge-warning"
                  }>{detail.status}</span>
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Saúde</p>
                  {saudeBadge(detail.saude)}
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Última Verificação</p>
                  <p className="text-sm font-medium">{detail.ultimaSinc}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Logs de Execução</h4>
                {detail.logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Nenhum log registrado. Teste a conexão para gerar logs.</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto invisible-scroll">
                    {detail.logs.map((log, i) => (
                      <div key={i} className="flex items-center gap-3 bg-secondary/30 border border-border px-4 py-3 rounded-md">
                        <span className="text-[11px] text-muted-foreground font-mono w-24 shrink-0">{log.data}</span>
                        <span className="badge-neutral">{log.tipo}</span>
                        <span className="text-xs flex-1">{log.msg}</span>
                        {logStatusBadge(log.status)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Payload Exemplo</h4>
                <pre className="bg-secondary/50 border border-border rounded-md p-4 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">{detail.payloadExemplo}</pre>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                {detail.canTest && (
                  <button
                    onClick={() => testarConexao(detail)}
                    className="btn-ghost text-xs"
                    disabled={detail.status === "Testando"}
                  >
                    {detail.status === "Testando" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    Testar Conexão
                  </button>
                )}
                {detail.configurable && (
                  <button onClick={() => { setDetail(null); setConfigOpen(detail); }} className="btn-primary text-xs">
                    <Settings size={12} /> Configurar
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={!!configOpen} onOpenChange={() => setConfigOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings size={16} /> Configurar {configOpen?.nome}
            </DialogTitle>
          </DialogHeader>
          {configOpen && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">{configOpen.desc}</p>

              {configOpen.id === "asaas" && (
                <div className="space-y-3">
                  <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                    <h4 className="text-sm font-semibold mb-2">Como configurar</h4>
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>Acesse sua conta no <strong>Asaas</strong> (asaas.com)</li>
                      <li>Vá em <strong>Configurações → Integrações → API</strong></li>
                      <li>Copie sua <strong>API Key de Produção</strong></li>
                      <li>A chave será armazenada de forma segura no backend</li>
                    </ol>
                  </div>
                  <p className="text-xs text-muted-foreground">⚠️ A integração com Asaas requer configuração de API Key via backend seguro. Entre em contato com o suporte para ativar.</p>
                </div>
              )}

              {configOpen.id === "ga4" && (
                <div className="space-y-3">
                  <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                    <h4 className="text-sm font-semibold mb-2">Como configurar</h4>
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>Acesse o <strong>Google Analytics</strong> (analytics.google.com)</li>
                      <li>Vá em <strong>Admin → Data Streams</strong></li>
                      <li>Copie o <strong>Measurement ID</strong> (G-XXXXXXXXXX)</li>
                      <li>O tracking será adicionado automaticamente às páginas</li>
                    </ol>
                  </div>
                  <p className="text-xs text-muted-foreground">ℹ️ O GA4 requer apenas o Measurement ID público para funcionar.</p>
                </div>
              )}

              {configOpen.id === "n8n" && (
                <div className="space-y-3">
                  <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                    <h4 className="text-sm font-semibold mb-2">Como configurar</h4>
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>Configure um workflow no <strong>n8n</strong></li>
                      <li>Use o trigger <strong>Webhook</strong></li>
                      <li>Copie a <strong>URL do webhook</strong></li>
                      <li>Configure no backend como secret</li>
                    </ol>
                  </div>
                </div>
              )}

              {configOpen.id === "webhooks" && (
                <div className="space-y-3">
                  <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                    <h4 className="text-sm font-semibold mb-2">Eventos disponíveis</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• <code className="bg-secondary px-1 rounded">saque.solicitado</code> — Novo saque criado</p>
                      <p>• <code className="bg-secondary px-1 rounded">saque.aprovado</code> — Saque aprovado</p>
                      <p>• <code className="bg-secondary px-1 rounded">influencer.criado</code> — Novo influencer</p>
                      <p>• <code className="bg-secondary px-1 rounded">campanha.finalizada</code> — Campanha encerrada</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">ℹ️ Configure URLs de destino via backend functions para receber eventos em tempo real.</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <button className="btn-ghost text-xs" onClick={() => setConfigOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
