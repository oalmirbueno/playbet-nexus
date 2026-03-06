import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Activity, DollarSign, Wallet, PieChart, CreditCard,
  Users, UserCheck, ShieldCheck, Gamepad2, Monitor, Link2, FileText, GitBranch,
  Calendar, PenTool, Lightbulb, Megaphone, BarChart3, ArrowRightLeft, Tag, ClipboardList,
  Settings, Scale, Lock, Plug, Menu, X, Bell, Search, ChevronDown, PanelLeftClose, PanelLeft,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface MenuItem { label: string; icon: React.ElementType; path: string; }
interface MenuSection { title: string; items: MenuItem[]; }

const sections: MenuSection[] = [
  {
    title: "VISÃO GERAL",
    items: [
      { label: "Dashboard Executivo", icon: LayoutDashboard, path: "/" },
      { label: "Dashboard Operacional", icon: Activity, path: "/operacional" },
    ],
  },
  {
    title: "GESTÃO DE RECEITA",
    items: [
      { label: "Financeiro", icon: DollarSign, path: "/financeiro" },
      { label: "Saques", icon: Wallet, path: "/saques" },
      { label: "Comissões", icon: PieChart, path: "/comissoes" },
      { label: "Asaas / Pagamentos", icon: CreditCard, path: "/asaas" },
    ],
  },
  {
    title: "GESTÃO DE PESSOAS",
    items: [
      { label: "Influencers", icon: Users, path: "/influencers" },
      { label: "Sócios", icon: UserCheck, path: "/socios" },
      { label: "Usuários Internos", icon: ShieldCheck, path: "/usuarios" },
    ],
  },
  {
    title: "GESTÃO DE ATIVOS",
    items: [
      { label: "Jogos", icon: Gamepad2, path: "/jogos" },
      { label: "Plataformas", icon: Monitor, path: "/plataformas" },
      { label: "Links Afiliados", icon: Link2, path: "/links" },
      { label: "Landing Pages", icon: FileText, path: "/landing-pages" },
      { label: "Templates de LP", icon: FileText, path: "/lp-templates" },
      { label: "Engine de Links", icon: Link2, path: "/link-engine" },
      { label: "Hubs / Rotas", icon: GitBranch, path: "/hubs" },
    ],
  },
  {
    title: "MARKETING E CONTEÚDO",
    items: [
      { label: "Calendário Editorial", icon: Calendar, path: "/calendario" },
      { label: "Conteúdos", icon: PenTool, path: "/conteudo" },
      { label: "Estratégia", icon: Lightbulb, path: "/estrategia" },
      { label: "Campanhas", icon: Megaphone, path: "/campanhas" },
    ],
  },
  {
    title: "MÉTRICAS E RASTREIO",
    items: [
      { label: "Analytics", icon: BarChart3, path: "/analytics" },
      { label: "Conversões", icon: ArrowRightLeft, path: "/conversoes" },
      { label: "UTMs / SubIDs", icon: Tag, path: "/utms" },
      { label: "Auditoria", icon: ClipboardList, path: "/auditoria" },
    ],
  },
  {
    title: "CONFIGURAÇÕES",
    items: [
      { label: "Config. Gerais", icon: Settings, path: "/configuracoes" },
      { label: "Regras Financeiras", icon: Scale, path: "/regras" },
      { label: "Permissões", icon: Lock, path: "/permissoes" },
      { label: "Integrações", icon: Plug, path: "/integracoes" },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────── */}
      <aside
        className={`fixed z-50 inset-y-0 left-0 bg-sidebar flex flex-col transition-all duration-300 ease-out md:translate-x-0 md:static md:shrink-0 border-r border-sidebar-border ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarCollapsed ? "w-[68px]" : "w-[270px]"}`}
      >
        {/* Logo */}
        <div className={`flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-6"} h-[60px] border-b border-sidebar-border shrink-0`}>
          {!sidebarCollapsed && <img src={logo} alt="PlayBet" className="h-8" />}
          {sidebarCollapsed && <img src={logo} alt="PlayBet" className="h-6 w-6 object-contain" />}
          <button className="md:hidden text-sidebar-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-1">
          {sections.map((section) => {
            const isCollapsed = collapsed[section.title];
            return (
              <div key={section.title}>
                {!sidebarCollapsed ? (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="sidebar-section-label w-full flex items-center justify-between pr-5 hover:text-foreground/50 transition-colors cursor-pointer"
                  >
                    <span>{section.title}</span>
                    <ChevronDown size={10} className={`transition-transform duration-200 opacity-50 ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                ) : (
                  <div className="h-px bg-sidebar-border mx-3 my-2" />
                )}
                {!isCollapsed && (
                  <div className={sidebarCollapsed ? "px-2 pb-1 space-y-px" : "px-3 pb-1 space-y-px"}>
                    {section.items.map((item) => {
                      const active = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={`group flex items-center ${sidebarCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"} rounded-md text-[13px] font-medium transition-all duration-150 ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <item.icon size={sidebarCollapsed ? 17 : 15} strokeWidth={active ? 2 : 1.6} className="shrink-0" />
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden md:flex px-3 py-2 border-t border-sidebar-border shrink-0">
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className={`flex items-center ${sidebarCollapsed ? "justify-center w-full" : "gap-2 w-full"} px-2 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors text-xs`}
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            {!sidebarCollapsed && <span>Recolher</span>}
          </button>
        </div>

        {/* User */}
        {!sidebarCollapsed && (
          <div className="px-4 py-4 border-t border-sidebar-border shrink-0">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold">A</div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-foreground/90 truncate">Admin PlayBet</p>
                <p className="text-[11px] text-muted-foreground truncate">Gestor Principal</p>
              </div>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="px-2 py-3 border-t border-sidebar-border shrink-0 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold cursor-pointer" title="Admin PlayBet">A</div>
          </div>
        )}
      </aside>

      {/* ── Main ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-[56px] border-b border-border flex items-center px-6 gap-4 bg-card/50 backdrop-blur-xl sticky top-0 z-30 shrink-0">
          <button className="md:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
          <div className="hidden md:flex items-center gap-2.5 bg-secondary/40 border border-border rounded-lg px-4 py-2 flex-1 max-w-sm">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input placeholder="Buscar módulo, influencer, jogo..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative p-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground">
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-destructive rounded-full" />
            </button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold">A</div>
              <span className="text-sm font-medium hidden sm:block text-foreground/80">Admin</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto main-scroll animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
