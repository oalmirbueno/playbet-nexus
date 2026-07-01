// Central registry of app modules that can be granted/denied per user.
// Keep in sync with routes in src/App.tsx.
export interface AppModule {
  key: string;
  label: string;
  group: string;
  defaultRoles: string[]; // roles that have access by default
}

export const APP_MODULES: AppModule[] = [
  // Dashboards
  { key: "dashboard", label: "Dashboard Geral", group: "Dashboards", defaultRoles: ["admin_master", "socio", "financeiro", "operacao", "conteudo", "visualizacao"] },
  { key: "dashboard_executivo", label: "Dashboard Executivo", group: "Dashboards", defaultRoles: ["admin_master", "socio"] },
  { key: "dashboard_operacional", label: "Dashboard Operacional", group: "Dashboards", defaultRoles: ["admin_master", "socio", "operacao"] },
  { key: "analytics", label: "Analytics", group: "Dashboards", defaultRoles: ["admin_master", "socio", "operacao"] },

  // Comercial
  { key: "comercial_pipeline", label: "Pipeline Comercial", group: "Comercial", defaultRoles: ["admin_master", "socio"] },
  { key: "comercial_qualificacao", label: "Qualificação", group: "Comercial", defaultRoles: ["admin_master", "socio", "operacao"] },
  { key: "comercial_squads", label: "Squads", group: "Comercial", defaultRoles: ["admin_master", "socio"] },

  // Pessoas
  { key: "pessoas", label: "Pessoas", group: "Pessoas", defaultRoles: ["admin_master", "socio", "operacao"] },
  { key: "influencers", label: "Influenciadores", group: "Pessoas", defaultRoles: ["admin_master", "socio", "operacao"] },
  { key: "socios", label: "Sócios", group: "Pessoas", defaultRoles: ["admin_master", "socio"] },

  // Financeiro
  { key: "financeiro", label: "Financeiro", group: "Financeiro", defaultRoles: ["admin_master", "socio", "financeiro"] },
  { key: "comissoes", label: "Comissões", group: "Financeiro", defaultRoles: ["admin_master", "socio", "financeiro"] },
  { key: "saques", label: "Saques", group: "Financeiro", defaultRoles: ["admin_master", "socio", "financeiro"] },
  { key: "asaas", label: "Asaas Pagamentos", group: "Financeiro", defaultRoles: ["admin_master", "socio", "financeiro"] },
  { key: "reconciliacao", label: "Reconciliação", group: "Financeiro", defaultRoles: ["admin_master", "socio", "financeiro"] },
  { key: "regras_financeiras", label: "Regras Financeiras", group: "Financeiro", defaultRoles: ["admin_master", "socio"] },

  // Conteúdo & Campanhas
  { key: "campanhas", label: "Campanhas", group: "Conteúdo", defaultRoles: ["admin_master", "socio", "conteudo", "operacao"] },
  { key: "conteudo", label: "Conteúdo", group: "Conteúdo", defaultRoles: ["admin_master", "socio", "conteudo"] },
  { key: "calendario", label: "Calendário Editorial", group: "Conteúdo", defaultRoles: ["admin_master", "socio", "conteudo"] },

  // Landing Pages
  { key: "lp_templates", label: "LP Templates", group: "Landing Pages", defaultRoles: ["admin_master", "socio", "conteudo"] },
  { key: "lp_instances", label: "LP Instâncias", group: "Landing Pages", defaultRoles: ["admin_master", "socio", "conteudo"] },
  { key: "lp_performance", label: "LP Performance", group: "Landing Pages", defaultRoles: ["admin_master", "socio", "operacao"] },
  { key: "lp_oportunidades", label: "LP Oportunidades", group: "Landing Pages", defaultRoles: ["admin_master", "socio", "operacao"] },

  // Tracking
  { key: "tracking_dashboard", label: "Tracking Dashboard", group: "Tracking", defaultRoles: ["admin_master", "socio", "operacao"] },
  { key: "tracking_links", label: "Tracking Links", group: "Tracking", defaultRoles: ["admin_master", "socio", "operacao"] },
  { key: "tracking_events", label: "Tracking Events", group: "Tracking", defaultRoles: ["admin_master", "socio", "operacao"] },
  { key: "tracking_accounts", label: "Tracking Contas", group: "Tracking", defaultRoles: ["admin_master", "socio", "operacao"] },
  { key: "tracking_mappings", label: "Tracking Mapeamentos", group: "Tracking", defaultRoles: ["admin_master", "socio", "operacao"] },

  // Plataformas
  { key: "plataformas", label: "Plataformas", group: "Plataformas", defaultRoles: ["admin_master", "socio", "operacao"] },
  { key: "jogos", label: "Jogos", group: "Plataformas", defaultRoles: ["admin_master", "socio", "conteudo"] },
  { key: "integracoes", label: "Integrações", group: "Plataformas", defaultRoles: ["admin_master", "socio"] },

  // Admin
  { key: "configuracoes", label: "Configurações", group: "Admin", defaultRoles: ["admin_master", "socio"] },
  { key: "auditoria", label: "Auditoria", group: "Admin", defaultRoles: ["admin_master", "socio"] },
  { key: "permissoes", label: "Permissões", group: "Admin", defaultRoles: ["admin_master"] },
  { key: "usuarios_internos", label: "Usuários Internos", group: "Admin", defaultRoles: ["admin_master"] },
  { key: "developer", label: "Developer Settings", group: "Admin", defaultRoles: ["admin_master"] },
];

export const MODULE_GROUPS = Array.from(new Set(APP_MODULES.map((m) => m.group)));

export function hasModuleAccess(
  role: string | null | undefined,
  moduleKey: string,
  allowed: string[] = [],
  denied: string[] = [],
): boolean {
  if (denied.includes(moduleKey)) return false;
  if (allowed.includes(moduleKey)) return true;
  const mod = APP_MODULES.find((m) => m.key === moduleKey);
  if (!mod) return true;
  return role ? mod.defaultRoles.includes(role) : false;
}
