import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationPanel from "@/components/NotificationPanel";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Activity, DollarSign, Wallet, PieChart, CreditCard,
  Users, UserCheck, ShieldCheck, Gamepad2, Monitor, Link2, FileText, GitBranch,
  Calendar, PenTool, Lightbulb, Megaphone, BarChart3, ArrowRightLeft, Tag, ClipboardList,
  Settings, Scale, Lock, Plug, Menu, X, Bell, Search, ChevronDown, PanelLeftClose, PanelLeft,
  Command, LogOut, Code2,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface MenuItem { label: string; icon: React.ElementType; path: string; }
interface MenuSection { title: string; items: MenuItem[]; }

const sections: MenuSection[] = [
  {
    title: "VISÃO GERAL",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Operacional", icon: Activity, path: "/operacional" },
    ],
  },
  {
    title: "LINKS DE AFILIADOS",
    items: [
      { label: "Links Afiliados", icon: Link2, path: "/tracking/links" },
      { label: "Distribuição LPs", icon: GitBranch, path: "/lp-instances" },
      { label: "Landing Pages", icon: FileText, path: "/landing-pages" },
      { label: "Plataformas", icon: Monitor, path: "/plataformas" },
    ],
  },
  {
    title: "PESSOAS",
    items: [
      { label: "Pessoas", icon: Users, path: "/pessoas" },
    ],
  },
  {
    title: "TRACKING",
    items: [
      { label: "Tracking Hub", icon: BarChart3, path: "/tracking" },
      { label: "Eventos", icon: Activity, path: "/tracking/events" },
    ],
  },
  {
    title: "MARKETING",
    items: [
      { label: "Campanhas", icon: Megaphone, path: "/campanhas" },
      { label: "Conteúdos", icon: PenTool, path: "/conteudo" },
    ],
  },
  {
    title: "FINANCEIRO",
    items: [
      { label: "Financeiro", icon: DollarSign, path: "/financeiro" },
      { label: "Saques", icon: Wallet, path: "/saques" },
      { label: "Comissões", icon: PieChart, path: "/comissoes" },
      { label: "Asaas", icon: CreditCard, path: "/asaas" },
    ],
  },
  {
    title: "CONFIGURAÇÕES",
    items: [
      { label: "Geral", icon: Settings, path: "/configuracoes" },
      { label: "Integrações", icon: Plug, path: "/integracoes" },
      { label: "Regras Financeiras", icon: Scale, path: "/regras" },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, role, signOut } = useAuth();

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
        } ${sidebarCollapsed ? "w-[64px]" : "w-[260px]"}`}
      >
        {/* Logo */}
        <div className={`flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-5"} h-[60px] border-b border-sidebar-border shrink-0`}>
          {!sidebarCollapsed && <img src={logo} alt="PlayBet" className="h-24 opacity-90" />}
          {sidebarCollapsed && <img src={logo} alt="PlayBet" className="h-12 w-12 object-contain opacity-90" />}
          <button className="md:hidden text-sidebar-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto invisible-scroll sidebar-scroll py-1.5">
          {sections.map((section) => {
            const isCollapsed = collapsed[section.title];
            return (
              <div key={section.title}>
                {!sidebarCollapsed ? (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="sidebar-section-label w-full flex items-center justify-between pr-5 hover:text-foreground/40 transition-colors cursor-pointer"
                  >
                    <span>{section.title}</span>
                    <ChevronDown size={9} className={`transition-transform duration-200 opacity-40 ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                ) : (
                  <div className="h-px bg-sidebar-border mx-3 my-3" />
                )}
                {!isCollapsed && (
                  <div className={sidebarCollapsed ? "px-2 pb-1 space-y-0.5" : "px-3 pb-1.5 space-y-0.5"}>
                    {section.items.map((item) => {
                      const active = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={`group flex items-center ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-[9px]"} rounded-md text-[13px] transition-all duration-150 ${
                            active
                              ? "bg-primary/12 text-foreground font-medium"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-normal"
                          }`}
                        >
                          <item.icon size={sidebarCollapsed ? 16 : 14} strokeWidth={active ? 2 : 1.5} className={`shrink-0 ${active ? "text-primary" : ""}`} />
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
            className={`flex items-center ${sidebarCollapsed ? "justify-center w-full" : "gap-2 w-full"} px-2 py-1.5 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors text-[11px]`}
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {sidebarCollapsed ? <PanelLeft size={13} /> : <PanelLeftClose size={13} />}
            {!sidebarCollapsed && <span>Recolher</span>}
          </button>
        </div>

        {/* User */}
        {!sidebarCollapsed && (
          <div className="px-3 py-3.5 border-t border-sidebar-border shrink-0">
            <div className="flex items-center gap-3 px-2.5 py-2 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-semibold">A</div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-foreground/85 truncate">Admin PlayBet</p>
                <p className="text-[10.5px] text-muted-foreground truncate">Gestor Principal</p>
              </div>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="px-2 py-3 border-t border-sidebar-border shrink-0 flex justify-center">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-semibold cursor-pointer" title="Admin PlayBet">A</div>
          </div>
        )}
      </aside>

      {/* ── Main ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-[52px] border-b border-border flex items-center px-6 gap-4 bg-background sticky top-0 z-30 shrink-0">
          <button className="md:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu size={17} />
          </button>
          <div className="hidden md:flex items-center gap-2.5 bg-secondary/50 border border-border rounded-md px-3.5 py-[7px] flex-1 max-w-sm cursor-pointer" onClick={() => setSearchOpen(true)}>
            <Search size={13} className="text-muted-foreground shrink-0" />
            <span className="text-[13px] text-muted-foreground flex-1">Buscar módulo, influencer, jogo...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5 font-mono">
              <Command size={9} />K
            </kbd>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <NotificationPanel />
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/30 transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-semibold">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-[13px] font-medium hidden sm:block text-foreground/75">{role || "user"}</span>
            </div>
            <button onClick={signOut} className="p-2 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Sair">
              <LogOut size={15} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto invisible-scroll main-scroll animate-fade-in">{children}</main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
