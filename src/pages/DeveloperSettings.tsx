
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Code2, Server, Shield, Key, Globe, FileText, Copy, Eye, EyeOff, Plus, Pencil, Trash2,
  CheckCircle2, AlertTriangle, Database, Lock, Zap, BookOpen, ChevronRight, ExternalLink,
  Terminal, Loader2, RefreshCw,
} from "lucide-react";

/* ─── types ─── */
interface Integration {
  id: string;
  name: string;
  base_url: string;
  auth_type: string;
  header_name: string;
  api_key_encrypted: string;
  description: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Endpoint {
  id: string;
  integration_id: string;
  method: string;
  path: string;
  description: string;
  request_example: string;
  response_example: string;
  is_active: boolean;
}

type Tab = "overview" | "integrations" | "endpoints" | "docs";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  PATCH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
};

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Visão Geral", icon: Server },
  { key: "integrations", label: "Integrações", icon: Globe },
  { key: "endpoints", label: "Endpoints", icon: Terminal },
  { key: "docs", label: "Documentação", icon: BookOpen },
];

/* ─── helpers ─── */
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast({ title: "Copiado!", description: "Valor copiado para a área de transferência." });
};

const maskKey = (key: string) => {
  if (!key || key.length < 8) return "***";
  return key.slice(0, 6) + "•".repeat(Math.max(key.length - 10, 4)) + key.slice(-4);
};

/* ─── COMPONENT ─── */
export default function DeveloperSettings() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // dialog state
  const [editInt, setEditInt] = useState<Partial<Integration> | null>(null);
  const [editEp, setEditEp] = useState<Partial<Endpoint> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [iRes, eRes] = await Promise.all([
      supabase.from("api_integrations").select("*").order("created_at"),
      supabase.from("api_endpoints").select("*").order("created_at"),
    ]);
    if (iRes.data) setIntegrations(iRes.data as unknown as Integration[]);
    if (eRes.data) setEndpoints(eRes.data as unknown as Endpoint[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  /* ── CRUD Integration ── */
  const saveIntegration = async () => {
    if (!editInt?.name || !editInt?.base_url) return;
    setSaving(true);
    try {
      if (editInt.id) {
        const { error } = await supabase.from("api_integrations").update({
          name: editInt.name, base_url: editInt.base_url, auth_type: editInt.auth_type || "api_key",
          header_name: editInt.header_name || "X-API-Key", api_key_encrypted: editInt.api_key_encrypted || "",
          description: editInt.description || "", notes: editInt.notes || "",
        } as any).eq("id", editInt.id);
        if (error) throw error;
        toast({ title: "Integração atualizada" });
      } else {
        const { error } = await supabase.from("api_integrations").insert({
          name: editInt.name, base_url: editInt.base_url, auth_type: editInt.auth_type || "api_key",
          header_name: editInt.header_name || "X-API-Key", api_key_encrypted: editInt.api_key_encrypted || "",
          description: editInt.description || "", notes: editInt.notes || "",
        } as any);
        if (error) throw error;
        toast({ title: "Integração criada" });
      }
      setEditInt(null);
      fetchData();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteIntegration = async (id: string) => {
    const { error } = await supabase.from("api_integrations").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Integração removida" }); fetchData(); }
  };

  /* ── CRUD Endpoint ── */
  const saveEndpoint = async () => {
    if (!editEp?.path || !editEp?.integration_id) return;
    setSaving(true);
    try {
      if (editEp.id) {
        const { error } = await supabase.from("api_endpoints").update({
          method: editEp.method || "GET", path: editEp.path, description: editEp.description || "",
          request_example: editEp.request_example || "", response_example: editEp.response_example || "",
        } as any).eq("id", editEp.id);
        if (error) throw error;
        toast({ title: "Endpoint atualizado" });
      } else {
        const { error } = await supabase.from("api_endpoints").insert({
          integration_id: editEp.integration_id, method: editEp.method || "GET", path: editEp.path,
          description: editEp.description || "", request_example: editEp.request_example || "",
          response_example: editEp.response_example || "",
        } as any);
        if (error) throw error;
        toast({ title: "Endpoint criado" });
      }
      setEditEp(null);
      fetchData();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteEndpoint = async (id: string) => {
    const { error } = await supabase.from("api_endpoints").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Endpoint removido" }); fetchData(); }
  };

  /* ── ENV vars ── */
  const envVars = [
    { name: "VITE_SUPABASE_URL", value: import.meta.env.VITE_SUPABASE_URL, desc: "Base URL do backend" },
    { name: "VITE_SUPABASE_PUBLISHABLE_KEY", value: maskKey(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""), desc: "Chave anon pública" },
    { name: "VITE_SUPABASE_PROJECT_ID", value: import.meta.env.VITE_SUPABASE_PROJECT_ID, desc: "ID do projeto backend" },
  ];

  /* ── DB tables ── */
  const dbTables = [
    "influencers", "platforms", "games", "templates", "landing_pages", "landing_page_instances",
    "utms", "clicks", "campanhas", "conteudo", "socios", "saques", "profiles", "user_roles",
    "game_platforms", "api_integrations", "api_endpoints",
  ];

  const dbFunctions = [
    { name: "has_role(user_id, role)", desc: "Verifica se o usuário tem um papel específico" },
    { name: "is_admin(user_id)", desc: "Verifica se o usuário é admin_master ou socio" },
    { name: "handle_new_user()", desc: "Trigger: cria perfil e role ao registrar novo usuário" },
    { name: "update_updated_at_column()", desc: "Trigger: atualiza campo updated_at automaticamente" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-muted-foreground" size={24} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header flex items-center gap-2"><Code2 size={22} /> Developer Settings</h1>
        <p className="page-subtitle">Configurações técnicas, documentação da API e gestão de integrações</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl overflow-x-auto invisible-scroll">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`${tab === t.key ? "tab-btn-active" : "tab-btn"} flex items-center gap-1.5 whitespace-nowrap`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ OVERVIEW ═══════ */}
      {tab === "overview" && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Server size={13} /> Backend</div>
              <p className="font-semibold text-sm">Lovable Cloud (Supabase)</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Shield size={13} /> Autenticação</div>
              <p className="font-semibold text-sm">JWT + RLS por tabela</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Database size={13} /> Tabelas</div>
              <p className="font-semibold text-sm">{dbTables.length} tabelas públicas</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Zap size={13} /> Endpoints</div>
              <p className="font-semibold text-sm">{endpoints.length} documentados</p>
            </div>
          </div>

          {/* Architecture */}
          <div className="glass-card p-5">
            <h3 className="section-title">Arquitetura do Backend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Estrutura</p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> Banco PostgreSQL gerenciado (Lovable Cloud)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> API REST automática (PostgREST)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> Autenticação JWT (GoTrue)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> Row Level Security em todas as tabelas</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> Edge Functions (Deno runtime)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> Realtime via WebSocket</li>
                </ul>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Variáveis de Ambiente</p>
                <div className="space-y-2">
                  {envVars.map((v) => (
                    <div key={v.name} className="glass-card-elevated p-2.5 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-mono text-primary">{v.name}</p>
                        <p className="text-[10px] text-muted-foreground">{v.desc}</p>
                      </div>
                      <button onClick={() => copyToClipboard(v.value)} className="btn-ghost p-1"><Copy size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tables & Functions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <h3 className="section-title flex items-center gap-2"><Database size={14} /> Tabelas do Banco</h3>
              <div className="grid grid-cols-2 gap-1.5 mt-3">
                {dbTables.map((t) => (
                  <div key={t} className="text-xs font-mono bg-secondary/50 px-2.5 py-1.5 rounded border border-border-subtle">{t}</div>
                ))}
              </div>
            </div>
            <div className="glass-card p-5">
              <h3 className="section-title flex items-center gap-2"><Lock size={14} /> Funções SQL</h3>
              <div className="space-y-2 mt-3">
                {dbFunctions.map((f) => (
                  <div key={f.name} className="glass-card-elevated p-2.5 rounded-lg">
                    <p className="text-xs font-mono text-primary">{f.name}</p>
                    <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Auth flow */}
          <div className="glass-card p-5">
            <h3 className="section-title flex items-center gap-2"><Shield size={14} /> Fluxo de Autenticação</h3>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
              {["1. Login (email+senha)", "2. JWT gerado", "3. Token no header Authorization", "4. RLS valida permissão", "5. Dados filtrados por role"].map((step, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{step}</span>
                  {i < 4 && <ChevronRight size={12} className="text-muted-foreground" />}
                </span>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border-subtle">
              <p className="text-[11px] text-muted-foreground mb-1">Roles disponíveis:</p>
              <div className="flex flex-wrap gap-1.5">
                {["admin_master", "socio", "financeiro", "operacao", "conteudo", "visualizacao"].map((r) => (
                  <span key={r} className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{r}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ INTEGRATIONS ═══════ */}
      {tab === "integrations" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Configurações de integração persistentes</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchData}><RefreshCw size={13} /> Atualizar</Button>
              {isAdmin && <Button size="sm" onClick={() => setEditInt({ auth_type: "api_key", header_name: "X-API-Key" })}><Plus size={13} /> Nova Integração</Button>}
            </div>
          </div>

          {integrations.map((int) => (
            <div key={int.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${int.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                  <h4 className="font-semibold text-sm">{int.name}</h4>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => setEditInt(int)} className="btn-ghost p-1.5"><Pencil size={12} /></button>
                    <button onClick={() => deleteIntegration(int.id)} className="btn-ghost p-1.5 text-destructive"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{int.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Base URL</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-mono truncate">{int.base_url}</p>
                    <button onClick={() => copyToClipboard(int.base_url)} className="btn-ghost p-0.5 shrink-0"><Copy size={10} /></button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Autenticação</p>
                  <p className="text-xs">{int.auth_type === "bearer_token" ? "Bearer Token" : "API Key"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Header</p>
                  <p className="text-xs font-mono">{int.header_name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Chave</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-mono truncate">
                      {showKeys[int.id] ? int.api_key_encrypted : maskKey(int.api_key_encrypted)}
                    </p>
                    <button onClick={() => setShowKeys((p) => ({ ...p, [int.id]: !p[int.id] }))} className="btn-ghost p-0.5 shrink-0">
                      {showKeys[int.id] ? <EyeOff size={10} /> : <Eye size={10} />}
                    </button>
                  </div>
                </div>
              </div>
              {int.notes && (
                <div className="mt-3 p-2.5 rounded-lg bg-secondary/30 border border-border-subtle">
                  <p className="text-[10px] text-muted-foreground"><strong>Notas:</strong> {int.notes}</p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">Atualizado em {new Date(int.updated_at).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══════ ENDPOINTS ═══════ */}
      {tab === "endpoints" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{endpoints.length} endpoints documentados</p>
            {isAdmin && integrations.length > 0 && (
              <Button size="sm" onClick={() => setEditEp({ integration_id: integrations[0]?.id, method: "GET" })}>
                <Plus size={13} /> Novo Endpoint
              </Button>
            )}
          </div>

          {integrations.map((int) => {
            const eps = endpoints.filter((e) => e.integration_id === int.id);
            if (eps.length === 0) return null;
            return (
              <div key={int.id} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{int.name}</h4>
                {eps.map((ep) => (
                  <details key={ep.id} className="glass-card group">
                    <summary className="p-4 flex items-center gap-3 cursor-pointer list-none">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${METHOD_COLORS[ep.method] || "bg-secondary text-foreground"}`}>
                        {ep.method}
                      </span>
                      <span className="text-xs font-mono flex-1 truncate">{ep.path}</span>
                      <span className="text-xs text-muted-foreground hidden sm:block">{ep.description}</span>
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.preventDefault(); setEditEp(ep); }} className="btn-ghost p-1"><Pencil size={11} /></button>
                          <button onClick={(e) => { e.preventDefault(); deleteEndpoint(ep.id); }} className="btn-ghost p-1 text-destructive"><Trash2 size={11} /></button>
                        </div>
                      )}
                    </summary>
                    <div className="px-4 pb-4 space-y-3 border-t border-border-subtle pt-3">
                      <p className="text-xs text-muted-foreground">{ep.description}</p>
                      {ep.request_example && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Request</p>
                            <button onClick={() => copyToClipboard(ep.request_example)} className="btn-ghost p-0.5"><Copy size={10} /></button>
                          </div>
                          <pre className="bg-secondary/50 p-3 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap border border-border-subtle">{ep.request_example}</pre>
                        </div>
                      )}
                      {ep.response_example && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Response</p>
                            <button onClick={() => copyToClipboard(ep.response_example)} className="btn-ghost p-0.5"><Copy size={10} /></button>
                          </div>
                          <pre className="bg-secondary/50 p-3 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap border border-border-subtle">{ep.response_example}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ DOCS ═══════ */}
      {tab === "docs" && (
        <div className="space-y-4 animate-fade-in">
          {/* Quick start */}
          <div className="glass-card p-5">
            <h3 className="section-title flex items-center gap-2"><BookOpen size={14} /> Quick Start — API PlayBet</h3>
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-xs font-semibold mb-1">1. Base URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-secondary/50 px-3 py-1.5 rounded border border-border-subtle">
                    {import.meta.env.VITE_SUPABASE_URL}/rest/v1
                  </code>
                  <button onClick={() => copyToClipboard(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1`)} className="btn-ghost p-1"><Copy size={12} /></button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1">2. Autenticação</p>
                <p className="text-xs text-muted-foreground mb-2">Toda requisição exige dois headers:</p>
                <pre className="bg-secondary/50 p-3 rounded-lg text-[11px] font-mono border border-border-subtle whitespace-pre-wrap">{`apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <JWT_ACCESS_TOKEN>`}</pre>
                <p className="text-[10px] text-muted-foreground mt-1.5">O JWT é obtido via login (POST /auth/v1/token?grant_type=password).</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1">3. Exemplo Completo — Listar Influencers</p>
                <pre className="bg-secondary/50 p-3 rounded-lg text-[11px] font-mono border border-border-subtle whitespace-pre-wrap">{`curl -X GET '${import.meta.env.VITE_SUPABASE_URL}/rest/v1/influencers?is_active=eq.true' \\
  -H "apikey: <ANON_KEY>" \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json"`}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1">4. Response de Exemplo</p>
                <pre className="bg-secondary/50 p-3 rounded-lg text-[11px] font-mono border border-border-subtle whitespace-pre-wrap">{`[
  {
    "id": "uuid",
    "name": "João Silva",
    "slug": "joao-silva",
    "commission_percent": 15,
    "is_active": true,
    "followers": 50000,
    "instagram": "@joao"
  }
]`}</pre>
              </div>
            </div>
          </div>

          {/* Security notes */}
          <div className="glass-card p-5">
            <h3 className="section-title flex items-center gap-2"><Shield size={14} /> Segurança</h3>
            <div className="space-y-2 mt-3">
              {[
                "Todas as tabelas usam Row Level Security (RLS) — nenhum dado é acessível sem autenticação válida.",
                "A chave anon (apikey) é pública e segura — ela só permite acesso conforme as políticas RLS.",
                "Operações de escrita (INSERT/UPDATE/DELETE) exigem role admin_master ou socio.",
                "Operações de leitura (SELECT) são permitidas a qualquer usuário autenticado.",
                "Tokens JWT expiram em 1 hora e são renovados automaticamente pelo client SDK.",
                "Nunca exponha o service_role_key — ela bypassa RLS e tem acesso total.",
              ].map((note, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle size={11} className="text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Integrating external systems */}
          <div className="glass-card p-5">
            <h3 className="section-title flex items-center gap-2"><ExternalLink size={14} /> Integrando Sistemas Externos</h3>
            <div className="space-y-3 mt-3">
              <div className="glass-card-elevated p-3 rounded-lg">
                <p className="text-xs font-semibold">Via REST API Direta</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Use qualquer cliente HTTP (curl, Postman, n8n, Python requests) com os headers de autenticação.</p>
              </div>
              <div className="glass-card-elevated p-3 rounded-lg">
                <p className="text-xs font-semibold">Via SDK JavaScript/TypeScript</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Use <code className="font-mono text-primary">@supabase/supabase-js</code> com a URL e chave anon para integração nativa.
                </p>
              </div>
              <div className="glass-card-elevated p-3 rounded-lg">
                <p className="text-xs font-semibold">Via Edge Functions</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Crie funções serverless em Deno para lógica customizada, webhooks e integrações com APIs de terceiros.</p>
              </div>
              <div className="glass-card-elevated p-3 rounded-lg">
                <p className="text-xs font-semibold">Via Realtime (WebSocket)</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Assine mudanças em tempo real nas tabelas usando canais WebSocket para dashboards ao vivo.</p>
              </div>
            </div>
          </div>

          {/* Filtros PostgREST */}
          <div className="glass-card p-5">
            <h3 className="section-title flex items-center gap-2"><Terminal size={14} /> Filtros PostgREST</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {[
                { filter: "eq", desc: "Igual", ex: "?status=eq.Ativa" },
                { filter: "neq", desc: "Diferente", ex: "?status=neq.Inativa" },
                { filter: "gt / lt", desc: "Maior / Menor", ex: "?valor=gt.100" },
                { filter: "gte / lte", desc: "Maior ou igual / Menor ou igual", ex: "?participacao=gte.20" },
                { filter: "like", desc: "Contém (case sensitive)", ex: "?name=like.*silva*" },
                { filter: "ilike", desc: "Contém (case insensitive)", ex: "?name=ilike.*silva*" },
                { filter: "in", desc: "Lista de valores", ex: "?status=in.(Ativa,Pausada)" },
                { filter: "order", desc: "Ordenação", ex: "?order=created_at.desc" },
              ].map((f) => (
                <div key={f.filter} className="glass-card-elevated p-2.5 rounded-lg">
                  <p className="text-xs"><span className="font-mono text-primary font-bold">{f.filter}</span> — {f.desc}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{f.ex}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ DIALOG — Integration ═══════ */}
      <Dialog open={!!editInt} onOpenChange={(o) => !o && setEditInt(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editInt?.id ? "Editar" : "Nova"} Integração</DialogTitle>
            <DialogDescription>Configure os detalhes técnicos da integração</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Nome *</label><Input value={editInt?.name || ""} onChange={(e) => setEditInt((p) => ({ ...p!, name: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Base URL *</label><Input value={editInt?.base_url || ""} onChange={(e) => setEditInt((p) => ({ ...p!, base_url: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Tipo de Auth</label>
                <select className="select-field w-full" value={editInt?.auth_type || "api_key"} onChange={(e) => setEditInt((p) => ({ ...p!, auth_type: e.target.value }))}>
                  <option value="api_key">API Key</option>
                  <option value="bearer_token">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="none">Sem autenticação</option>
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Nome do Header</label><Input value={editInt?.header_name || ""} onChange={(e) => setEditInt((p) => ({ ...p!, header_name: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Valor da Chave</label><Input type="password" value={editInt?.api_key_encrypted || ""} onChange={(e) => setEditInt((p) => ({ ...p!, api_key_encrypted: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Descrição</label><Input value={editInt?.description || ""} onChange={(e) => setEditInt((p) => ({ ...p!, description: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Notas Técnicas</label><textarea className="input-field w-full min-h-[60px]" value={editInt?.notes || ""} onChange={(e) => setEditInt((p) => ({ ...p!, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInt(null)}>Cancelar</Button>
            <Button onClick={saveIntegration} disabled={saving}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />} Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ DIALOG — Endpoint ═══════ */}
      <Dialog open={!!editEp} onOpenChange={(o) => !o && setEditEp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editEp?.id ? "Editar" : "Novo"} Endpoint</DialogTitle>
            <DialogDescription>Documente um endpoint da API</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Integração *</label>
              <select className="select-field w-full" value={editEp?.integration_id || ""} onChange={(e) => setEditEp((p) => ({ ...p!, integration_id: e.target.value }))}>
                {integrations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Método</label>
                <select className="select-field w-full" value={editEp?.method || "GET"} onChange={(e) => setEditEp((p) => ({ ...p!, method: e.target.value }))}>
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Path *</label>
                <Input value={editEp?.path || ""} onChange={(e) => setEditEp((p) => ({ ...p!, path: e.target.value }))} placeholder="/resource" />
              </div>
            </div>
            <div><label className="text-xs text-muted-foreground">Descrição</label><Input value={editEp?.description || ""} onChange={(e) => setEditEp((p) => ({ ...p!, description: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Exemplo de Request</label><textarea className="input-field w-full min-h-[60px] font-mono text-xs" value={editEp?.request_example || ""} onChange={(e) => setEditEp((p) => ({ ...p!, request_example: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Exemplo de Response</label><textarea className="input-field w-full min-h-[60px] font-mono text-xs" value={editEp?.response_example || ""} onChange={(e) => setEditEp((p) => ({ ...p!, response_example: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEp(null)}>Cancelar</Button>
            <Button onClick={saveEndpoint} disabled={saving}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Terminal size={13} />} Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
