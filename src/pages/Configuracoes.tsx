import { useState } from "react";
import { Save, Settings, DollarSign, Users, Plug, Database, Trash2, Loader2, Eye, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useInfluencers, useGames, usePlatforms, useLandingPages, useTemplates, useUtms, useCampanhas, useSocios, useSaques, useConteudo } from "@/hooks/useSupabaseQuery";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { seedDemoData, clearDemoData } from "@/services/seedDemoData";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const tabs = [
  { key: "geral", label: "Geral", icon: Settings },
  { key: "financeiro", label: "Financeiro", icon: DollarSign },
  { key: "usuarios", label: "Usuários", icon: Users },
  { key: "integracoes", label: "Integrações", icon: Plug },
  { key: "demo", label: "Dados Demo", icon: Database },
];

export default function Configuracoes() {
  const [tab, setTab] = useState("geral");
  const { demoMode, setDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: influencers } = useInfluencers();
  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();
  const { data: landingPages } = useLandingPages();
  const { data: templates } = useTemplates();
  const { data: utms } = useUtms();
  const { data: campanhas } = useCampanhas();
  const { data: socios } = useSocios();
  const { data: saques } = useSaques();
  const { data: conteudos } = useConteudo();

  const auditModules = [
    { label: "Plataformas", count: platforms.length, category: "infra" },
    { label: "Jogos", count: games.length, category: "infra" },
    { label: "Influencers", count: influencers.length, category: "infra" },
    { label: "Templates", count: templates.length, category: "infra" },
    { label: "Landing Pages", count: landingPages.length, category: "infra" },
    { label: "UTMs / SubIDs", count: utms.length, category: "infra" },
    { label: "Campanhas", count: campanhas.length, category: "marketing" },
    { label: "Conteúdo / Calendário", count: conteudos.length, category: "marketing" },
    { label: "Sócios", count: socios.length, category: "financeiro" },
    { label: "Saques", count: saques.length, category: "financeiro" },
  ];

  const missingModules = auditModules.filter(m => m.count === 0);
  const totalItems = auditModules.reduce((a, b) => a + b.count, 0);
  const completionPct = Math.round((auditModules.filter(m => m.count > 0).length / auditModules.length) * 100);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      setDemoMode("all");
      await queryClient.invalidateQueries();
      toast({ title: "Dados demo criados com sucesso!", description: "Modo alterado para: Todos os dados." });
    } catch (e: any) {
      toast({ title: "Erro ao criar dados demo", description: e.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    setConfirmClear(false);
    try {
      await clearDemoData();
      queryClient.invalidateQueries();
      toast({ title: "Dados demo removidos com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao limpar dados demo", description: e.message, variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const modeOptions = [
    { value: "all" as const, label: "Todos os dados", desc: "Exibe dados reais + demo juntos" },
    { value: "real" as const, label: "Somente reais", desc: "Esconde dados demo, mostra apenas os reais" },
    { value: "demo" as const, label: "Somente demo", desc: "Mostra apenas os dados demo para apresentação" },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Configurações</h1><p className="page-subtitle">Configurações gerais da plataforma PlayBet</p></div>

      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl overflow-x-auto invisible-scroll">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`${tab === t.key ? "tab-btn-active" : "tab-btn"} flex items-center gap-1.5 whitespace-nowrap`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "geral" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
          <div className="glass-card p-5">
            <h3 className="section-title">Informações da Plataforma</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Nome</label><input className="input-field" defaultValue="PlayBet" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">E-mail</label><input className="input-field" defaultValue="admin@playbet.com" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Domínio</label><input className="input-field" defaultValue="https://playbet.com" /></div>
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="section-title">Preferências</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Fuso Horário</label><select className="select-field w-full"><option>America/Sao_Paulo (GMT-3)</option></select></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Moeda Padrão</label><select className="select-field w-full"><option>BRL (Real)</option></select></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Idioma</label><select className="select-field w-full"><option>Português (BR)</option></select></div>
            </div>
          </div>
        </div>
      )}

      {tab === "financeiro" && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-card p-5">
            <h3 className="section-title">Regras de Cálculo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">Percentual Operacional Padrão</label><div className="flex items-center gap-2"><input className="input-field" defaultValue="10" type="number" /><span className="text-sm text-muted-foreground">%</span></div></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Saque Mínimo</label><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">R$</span><input className="input-field" defaultValue="100" type="number" /></div></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Dias para Pagamento</label><input className="input-field" defaultValue="30" type="number" /></div>
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="section-title">Divisão Societária Padrão</h3>
            <p className="text-xs text-muted-foreground mb-3">Base societária = Receita Bruta - % Influencer - 10% Operacional</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="glass-card-elevated p-3 rounded-lg"><p className="text-[10px] text-muted-foreground">Ricardo Almeida</p><p className="font-bold">40%</p></div>
              <div className="glass-card-elevated p-3 rounded-lg"><p className="text-[10px] text-muted-foreground">Fernanda Rocha</p><p className="font-bold">35%</p></div>
              <div className="glass-card-elevated p-3 rounded-lg"><p className="text-[10px] text-muted-foreground">Lucas Martins</p><p className="font-bold">25%</p></div>
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="section-title">Aprovação de Saques</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked className="rounded" /><span className="text-sm">Exigir aprovação manual para todos os saques</span></label>
            </div>
          </div>
        </div>
      )}

      {tab === "usuarios" && (
        <div className="glass-card p-5 animate-fade-in">
          <h3 className="section-title">Funções e Permissões</h3>
          <div className="space-y-3">
            {["Super Admin", "Gestor Financeiro", "Marketing", "Suporte"].map((role) => (
              <div key={role} className="glass-card-elevated p-3 rounded-lg flex items-center justify-between">
                <div><p className="text-sm font-medium">{role}</p><p className="text-xs text-muted-foreground">Acesso completo ao módulo correspondente</p></div>
                <button className="btn-ghost text-xs">Editar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "integracoes" && (
        <div className="space-y-4 animate-fade-in">
          {[
            { nome: "Asaas", desc: "API de pagamentos — PIX, TED, boleto", status: "Pendente" },
            { nome: "Google Analytics", desc: "Rastreamento de eventos e conversões", status: "Ativo" },
            { nome: "Facebook Pixel", desc: "Pixel de conversão para campanhas", status: "Ativo" },
            { nome: "Telegram Bot", desc: "Notificações automáticas", status: "Pendente" },
          ].map((int) => (
            <div key={int.nome} className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{int.nome}</p>
                <p className="text-xs text-muted-foreground">{int.desc}</p>
              </div>
              <span className={int.status === "Ativo" ? "badge-success" : "badge-warning"}>{int.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "demo" && (
        <div className="space-y-4 animate-fade-in">
          {/* Visualization mode */}
          <div className="glass-card p-5">
            <h3 className="section-title">Modo de visualização</h3>
            <p className="text-xs text-muted-foreground mb-4">Controle quais dados aparecem no painel. Dados reais nunca são afetados.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {modeOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setDemoMode(opt.value)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    demoMode === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-secondary/20 hover:bg-secondary/40"
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Modo atual: <span className="font-semibold text-foreground">{modeOptions.find(o => o.value === demoMode)?.label}</span>
            </p>
          </div>

          {/* Seed / Clear */}
          <div className="glass-card p-5">
            <h3 className="section-title">Gerenciar dados demo</h3>
            <p className="text-xs text-muted-foreground mb-4">Crie dados fictícios para demonstração aos sócios. Os dados reais ficam intactos.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSeed} disabled={seeding} size="sm">
                {seeding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                {seeding ? "Criando..." : "Povoar dados demo"}
              </Button>
              <Button onClick={() => setConfirmClear(true)} disabled={clearing} variant="destructive" size="sm">
                {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {clearing ? "Removendo..." : "Remover todos os dados demo"}
              </Button>
            </div>
          </div>

          {/* Audit Panel */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="section-title">Auditoria da Simulação</h3>
                <p className="text-xs text-muted-foreground">Contagem por módulo e alertas de dados ausentes</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{totalItems} registros</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${completionPct === 100 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {completionPct}%
                </span>
              </div>
            </div>

            {missingModules.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/10 mb-4">
                <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-destructive">Módulos sem dados</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {missingModules.map(m => m.label).join(", ")}
                  </p>
                </div>
              </div>
            )}

            {missingModules.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/10 mb-4">
                <CheckCircle2 size={14} className="text-success shrink-0" />
                <p className="text-xs font-medium text-success">Todos os módulos possuem dados — simulação 100% completa</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {auditModules.map((m) => (
                <div
                  key={m.label}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    m.count > 0
                      ? "border-success/20 bg-success/5"
                      : "border-destructive/20 bg-destructive/5"
                  }`}
                >
                  <p className="text-lg font-bold tracking-tight">{m.count}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab !== "demo" && (
        <button className="btn-primary"><Save size={14} /> Salvar Configurações</button>
      )}

      {/* Confirm clear dialog */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover todos os dados demo?</DialogTitle>
            <DialogDescription>
              Apenas os registros marcados como demo serão apagados. Seus dados reais permanecem intactos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClear}>Sim, remover dados demo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
