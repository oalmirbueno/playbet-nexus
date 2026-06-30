
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
  Terminal, Loader2, RefreshCw, Rocket, Plug,
} from "lucide-react";

/* ─── types ─── */
interface Integration {
  id: string; name: string; base_url: string; auth_type: string; header_name: string;
  api_key_encrypted: string; description: string; notes: string; is_active: boolean;
  created_at: string; updated_at: string;
}
interface Endpoint {
  id: string; integration_id: string; method: string; path: string; description: string;
  request_example: string; response_example: string; is_active: boolean;
}
interface ApiKeyRow {
  id: string; name: string; key_prefix: string; is_active: boolean;
  last_used_at: string | null; created_at: string;
}

type Tab = "overview" | "integrations" | "endpoints" | "docs" | "openclaw";

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
  { key: "openclaw", label: "OpenClaw / API", icon: Plug },
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

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const GATEWAY_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/api-gateway`;

const AVAILABLE_TABLES = [
  "influencers", "games", "platforms", "templates", "landing_pages",
  "landing_page_instances", "utms", "clicks", "campanhas", "socios",
  "saques", "conteudo", "game_platforms",
];

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

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("OpenClaw");

  const fetchData = async () => {
    setLoading(true);
    const [iRes, eRes] = await Promise.all([
      supabase.from("api_integrations").select("*").order("created_at"),
      supabase.from("api_endpoints").select("*").order("created_at"),
    ]);
    if (iRes.data) setIntegrations(iRes.data as unknown as Integration[]);
    if (eRes.data) setEndpoints(eRes.data as unknown as Endpoint[]);
    await fetchApiKeys();
    setLoading(false);
  };

  const fetchApiKeys = async () => {
    const { data } = await (supabase as any).from("api_keys").select("id, name, key_prefix, is_active, last_used_at, created_at").order("created_at", { ascending: false });
    if (data) setApiKeys(data);
  };

  useEffect(() => { fetchData(); }, []);

  /* ── Generate API Key ── */
  const generateApiKey = async () => {
    setGeneratingKey(true);
    try {
      const { data, error } = await supabase.rpc("generate_api_key", { _name: newKeyName });
      if (error) throw error;
      const result = data as any;
      setGeneratedKey(result.key);
      toast({ title: "API Key gerada!", description: "Copie a chave agora - ela não será exibida novamente." });
      await fetchApiKeys();
    } catch (e: any) {
      toast({ title: "Erro ao gerar chave", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingKey(false);
    }
  };

  const deactivateKey = async (id: string) => {
    await (supabase as any).from("api_keys").update({ is_active: false }).eq("id", id);
    toast({ title: "Chave desativada" });
    fetchApiKeys();
  };

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

  const dbTables = [
    "influencers", "platforms", "games", "templates", "landing_pages", "landing_page_instances",
    "utms", "clicks", "campanhas", "conteudo", "socios", "saques", "profiles", "user_roles",
    "game_platforms", "api_integrations", "api_endpoints", "api_keys",
  ];

  const dbFunctions = [
    { name: "has_role(user_id, role)", desc: "Verifica se o usuário tem um papel específico" },
    { name: "is_admin(user_id)", desc: "Verifica se o usuário é admin_master ou socio" },
    { name: "handle_new_user()", desc: "Trigger: cria perfil e role ao registrar novo usuário" },
    { name: "generate_api_key(name)", desc: "Gera uma API key segura (hash SHA-256)" },
    { name: "validate_api_key(key)", desc: "Valida uma API key no gateway" },
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

      {/* ═══════ OPENCLAW / API TAB ═══════ */}
      {tab === "openclaw" && (
        <div className="space-y-4 animate-fade-in">
          {/* Hero */}
          <div className="glass-card p-6 border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Rocket size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base">API Gateway PlayBet</h3>
                <p className="text-xs text-muted-foreground">Tudo pronto para conectar no OpenClaw ou qualquer sistema externo</p>
              </div>
            </div>

            {/* Step 1: Generate Key */}
            <div className="space-y-4">
              <div className="glass-card-elevated p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-sm font-semibold">Gerar sua API Key</p>
                </div>
                
                {generatedKey ? (
                  <div className="space-y-2">
                    <div className="bg-success/10 border border-success/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 size={14} className="text-success" />
                        <p className="text-xs font-semibold text-success">Chave gerada com sucesso!</p>
                      </div>
                      <p className="text-[10px] text-warning">⚠️ Copie agora - esta chave NÃO será exibida novamente.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono bg-secondary/50 px-3 py-2 rounded border border-border-subtle break-all">
                        {generatedKey}
                      </code>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedKey)}>
                        <Copy size={12} /> Copiar
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setGeneratedKey(null)} className="text-xs">
                      Fechar e gerar outra
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Nome da chave (ex: OpenClaw)"
                      className="max-w-[200px]"
                    />
                    <Button size="sm" onClick={generateApiKey} disabled={generatingKey}>
                      {generatingKey ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
                      Gerar API Key
                    </Button>
                  </div>
                )}
              </div>

              {/* Step 2: Config for OpenClaw */}
              <div className="glass-card-elevated p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-sm font-semibold">Configuração para OpenClaw</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Copie os valores abaixo e cole no OpenClaw ao criar sua integração:</p>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Base URL</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono bg-secondary/50 px-3 py-2 rounded border border-border-subtle break-all">
                        {GATEWAY_URL}
                      </code>
                      <button onClick={() => copyToClipboard(GATEWAY_URL)} className="btn-ghost p-1.5 shrink-0"><Copy size={12} /></button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Header de Autenticação</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-secondary/50 px-3 py-2 rounded border border-border-subtle">
                        X-API-Key: {"<sua_chave_gerada_acima>"}
                      </code>
                      <button onClick={() => copyToClipboard("X-API-Key")} className="btn-ghost p-1.5 shrink-0"><Copy size={12} /></button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Método de Autenticação</p>
                    <code className="text-xs font-mono bg-secondary/50 px-3 py-2 rounded border border-border-subtle block">
                      API Key (Header)
                    </code>
                  </div>
                </div>
              </div>

              {/* Step 3: Endpoints */}
              <div className="glass-card-elevated p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-sm font-semibold">Endpoints Disponíveis</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Todos os endpoints seguem o padrão: <code className="font-mono text-primary">{GATEWAY_URL}/{"<tabela>"}</code></p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_TABLES.map((t) => (
                    <div key={t} className="flex items-center justify-between bg-secondary/30 px-3 py-2 rounded-lg border border-border-subtle">
                      <span className="text-xs font-mono">{t}</span>
                      <button onClick={() => copyToClipboard(`${GATEWAY_URL}/${t}`)} className="btn-ghost p-0.5"><Copy size={10} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 4: Examples */}
              <div className="glass-card-elevated p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                  <p className="text-sm font-semibold">Exemplos Prontos</p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      title: "Listar todos os influencers",
                      method: "GET",
                      code: `curl -X GET '${GATEWAY_URL}/influencers' \\\n  -H "X-API-Key: <SUA_API_KEY>"`,
                    },
                    {
                      title: "Buscar influencer por ID",
                      method: "GET",
                      code: `curl -X GET '${GATEWAY_URL}/influencers/<ID>' \\\n  -H "X-API-Key: <SUA_API_KEY>"`,
                    },
                    {
                      title: "Criar um novo jogo",
                      method: "POST",
                      code: `curl -X POST '${GATEWAY_URL}/games' \\\n  -H "X-API-Key: <SUA_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Fortune Tiger", "category": "Slots", "is_active": true}'`,
                    },
                    {
                      title: "Atualizar campanha",
                      method: "PUT",
                      code: `curl -X PUT '${GATEWAY_URL}/campanhas/<ID>' \\\n  -H "X-API-Key: <SUA_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"status": "Ativa", "resultado": "Em andamento"}'`,
                    },
                    {
                      title: "Deletar registro",
                      method: "DELETE",
                      code: `curl -X DELETE '${GATEWAY_URL}/saques/<ID>' \\\n  -H "X-API-Key: <SUA_API_KEY>"`,
                    },
                    {
                      title: "Filtrar com query params",
                      method: "GET",
                      code: `curl -X GET '${GATEWAY_URL}/influencers?is_active=true&limit=10&order_by=name&order_dir=asc' \\\n  -H "X-API-Key: <SUA_API_KEY>"`,
                    },
                  ].map((ex) => (
                    <div key={ex.title}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${METHOD_COLORS[ex.method]}`}>{ex.method}</span>
                          <p className="text-xs font-semibold">{ex.title}</p>
                        </div>
                        <button onClick={() => copyToClipboard(ex.code)} className="btn-ghost p-0.5"><Copy size={10} /></button>
                      </div>
                      <pre className="bg-secondary/50 p-3 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap border border-border-subtle">{ex.code}</pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 5: Response format */}
              <div className="glass-card-elevated p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</span>
                  <p className="text-sm font-semibold">Formato das Respostas</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold mb-1">GET (lista)</p>
                    <pre className="bg-secondary/50 p-3 rounded-lg text-[11px] font-mono border border-border-subtle whitespace-pre-wrap">{`{
  "data": [
    { "id": "uuid", "name": "...", ... }
  ],
  "total": 42,
  "limit": 100,
  "offset": 0
}`}</pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">GET (por ID)</p>
                    <pre className="bg-secondary/50 p-3 rounded-lg text-[11px] font-mono border border-border-subtle whitespace-pre-wrap">{`{
  "id": "uuid",
  "name": "...",
  "is_active": true,
  "created_at": "2026-03-10T...",
  ...
}`}</pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">Erro</p>
                    <pre className="bg-secondary/50 p-3 rounded-lg text-[11px] font-mono border border-border-subtle whitespace-pre-wrap">{`{
  "error": "Invalid API key"
}`}</pre>
                  </div>
                </div>
              </div>

              {/* Managed keys */}
              <div className="glass-card-elevated p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold flex items-center gap-2"><Key size={14} /> Chaves Ativas</p>
                  <Button size="sm" variant="ghost" onClick={fetchApiKeys}><RefreshCw size={12} /></Button>
                </div>
                {apiKeys.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma chave gerada ainda. Clique em "Gerar API Key" acima.</p>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((k) => (
                      <div key={k.id} className="flex items-center justify-between bg-secondary/30 px-3 py-2 rounded-lg border border-border-subtle">
                        <div>
                          <p className="text-xs font-semibold">{k.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{k.key_prefix}•••••••</p>
                          <p className="text-[10px] text-muted-foreground">
                            Criada: {new Date(k.created_at).toLocaleDateString("pt-BR")}
                            {k.last_used_at && ` | Último uso: ${new Date(k.last_used_at).toLocaleDateString("pt-BR")}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${k.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                            {k.is_active ? "Ativa" : "Desativada"}
                          </span>
                          {k.is_active && (
                            <Button size="sm" variant="ghost" onClick={() => deactivateKey(k.id)} className="text-destructive text-[10px] h-6 px-2">
                              Desativar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ OVERVIEW ═══════ */}
      {tab === "overview" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Server size={13} /> Backend</div>
              <p className="font-semibold text-sm">Lovable Cloud</p>
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Zap size={13} /> API Keys</div>
              <p className="font-semibold text-sm">{apiKeys.filter(k => k.is_active).length} ativas</p>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="section-title">Arquitetura do Backend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Estrutura</p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> Banco PostgreSQL gerenciado</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> API REST automática (PostgREST)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> API Gateway com X-API-Key</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> Autenticação JWT (GoTrue)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> Row Level Security em todas as tabelas</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success shrink-0" /> Edge Functions (Deno runtime)</li>
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
          <div className="glass-card p-5">
            <h3 className="section-title flex items-center gap-2"><BookOpen size={14} /> Quick Start - API Gateway</h3>
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-xs font-semibold mb-1">1. Base URL do Gateway</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-secondary/50 px-3 py-1.5 rounded border border-border-subtle">
                    {GATEWAY_URL}
                  </code>
                  <button onClick={() => copyToClipboard(GATEWAY_URL)} className="btn-ghost p-1"><Copy size={12} /></button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1">2. Autenticação</p>
                <p className="text-xs text-muted-foreground mb-2">Use o header X-API-Key com a chave gerada na aba "OpenClaw / API":</p>
                <pre className="bg-secondary/50 p-3 rounded-lg text-[11px] font-mono border border-border-subtle whitespace-pre-wrap">{`X-API-Key: pb_live_xxxxxxxxxxxxxxxxxxxxxxxx`}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1">3. Exemplo - Listar Influencers</p>
                <pre className="bg-secondary/50 p-3 rounded-lg text-[11px] font-mono border border-border-subtle whitespace-pre-wrap">{`curl -X GET '${GATEWAY_URL}/influencers' \\
  -H "X-API-Key: pb_live_sua_chave_aqui"`}</pre>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="section-title flex items-center gap-2"><Shield size={14} /> Segurança</h3>
            <div className="space-y-2 mt-3">
              {[
                "O Gateway usa service_role internamente - a API Key controla o acesso externo.",
                "Chaves são armazenadas com hash SHA-256 - nunca em texto puro.",
                "Você pode desativar chaves a qualquer momento na aba OpenClaw / API.",
                "Cada uso de chave registra o timestamp de último acesso.",
                "Apenas tabelas da whitelist são acessíveis via Gateway.",
              ].map((note, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={11} className="text-success mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="section-title flex items-center gap-2"><Terminal size={14} /> Filtros Disponíveis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {[
                { filter: "limit", desc: "Limite de resultados", ex: "?limit=10" },
                { filter: "offset", desc: "Paginação", ex: "?offset=20" },
                { filter: "order_by", desc: "Ordenar por campo", ex: "?order_by=name" },
                { filter: "order_dir", desc: "Direção", ex: "?order_dir=asc" },
                { filter: "campo=valor", desc: "Filtro exato", ex: "?is_active=true" },
                { filter: "/{id}", desc: "Buscar por ID", ex: "/influencers/uuid-aqui" },
              ].map((f) => (
                <div key={f.filter} className="glass-card-elevated p-2.5 rounded-lg">
                  <p className="text-xs"><span className="font-mono text-primary font-bold">{f.filter}</span> - {f.desc}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{f.ex}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ DIALOG - Integration ═══════ */}
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

      {/* ═══════ DIALOG - Endpoint ═══════ */}
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
