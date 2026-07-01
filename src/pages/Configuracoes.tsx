import { useState } from "react";
import { Save, Settings, DollarSign, Users, Plug, ShieldCheck } from "lucide-react";
import UsersAccessSection from "@/components/settings/UsersAccessSection";
import { useAuth } from "@/contexts/AuthContext";

const tabsAll = [
  { key: "geral", label: "Geral", icon: Settings },
  { key: "financeiro", label: "Financeiro", icon: DollarSign },
  { key: "usuarios", label: "Usuários", icon: Users },
  { key: "sistema", label: "Sistema · Admin", icon: ShieldCheck },
  { key: "integracoes", label: "Integrações", icon: Plug },
];

export default function Configuracoes() {
  const { previewAs } = useAuth();
  const isPreviewing = !!previewAs;
  // Sensitive admin tools are hidden while previewing another user
  const tabs = isPreviewing ? tabsAll.filter((t) => t.key !== "sistema") : tabsAll;
  const [tab, setTab] = useState("geral");


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
      {tab === "sistema" && !isPreviewing && <UsersAccessSection />}


      {tab === "integracoes" && (
        <div className="space-y-4 animate-fade-in">
          {[
            { nome: "Asaas", desc: "API de pagamentos - PIX, TED, boleto", status: "Pendente" },
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

      <button className="btn-primary"><Save size={14} /> Salvar Configurações</button>
    </div>
  );
}
