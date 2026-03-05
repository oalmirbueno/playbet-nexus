import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Activity, DollarSign, Wallet, PieChart, CreditCard,
  Users, UserCheck, ShieldCheck, Gamepad2, Monitor, Link2, FileText, GitBranch,
  Calendar, PenTool, Lightbulb, Megaphone, BarChart3, ArrowRightLeft, Tag, ClipboardList,
  Settings, Scale, Lock, Plug, Menu, X, Bell, Search, ChevronDown,
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed z-50 inset-y-0 left-0 w-[260px] bg-sidebar flex flex-col transition-transform duration-300 ease-out md:translate-x-0 md:static border-r border-sidebar-border ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-sidebar-border shrink-0">
          <img src={logo} alt="PlayBet" className="h-9" />
          <button className="md:hidden text-sidebar-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto sidebar-scroll py-2">
          {sections.map((section) => {
            const isCollapsed = collapsed[section.title];
            return (
              <div key={section.title}>
                <button
                  onClick={() => toggleSection(section.title)}
                  className="sidebar-section-label w-full flex items-center justify-between pr-4 hover:text-foreground/60 transition-colors cursor-pointer"
                >
                  <span>{section.title}</span>
                  <ChevronDown size={10} className={`transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                </button>
                {!isCollapsed && (
                  <div className="px-2 pb-1 space-y-0.5">
                    {section.items.map((item) => {
                      const active = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`group flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium transition-all duration-200 ${
                            active
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <item.icon size={15} strokeWidth={active ? 2.2 : 1.8} className={`shrink-0 transition-all duration-200 ${!active ? "group-hover:scale-105" : ""}`} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-accent text-[10px] font-bold ring-1 ring-primary/30">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-foreground truncate">Admin PlayBet</p>
              <p className="text-[10px] text-muted-foreground truncate">Gestor Principal</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-5 gap-3 bg-card/60 backdrop-blur-xl sticky top-0 z-30 shrink-0">
          <button className="md:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
          <div className="hidden md:flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input placeholder="Buscar módulo, influencer, jogo..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full animate-pulse-subtle" />
            </button>
            <div className="h-6 w-px bg-border mx-1" />
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold">A</div>
              <span className="text-xs font-medium hidden sm:block">Admin</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-5 lg:p-6 overflow-auto main-scroll animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
