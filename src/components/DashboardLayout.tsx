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
  Command, LogOut, Code2, Sparkles, Briefcase, KanbanSquare, CheckSquare, Wand2, Radio, MoreHorizontal,
} from "lucide-react";
import logo from "@/assets/logo.png";
import PreviewBanner from "@/components/PreviewBanner";


interface MenuItem { label: string; icon: React.ElementType; path: string; }
interface MenuSection { title: string; items: MenuItem[]; }

const sections: MenuSection[] = [
  {
    title: "OPERAÇÃO",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Tracking", icon: BarChart3, path: "/tracking" },
      { label: "Status Postback", icon: Radio, path: "/tracking/status" },
      { label: "Pessoas", icon: Users, path: "/pessoas" },
    ],
  },
  {
    title: "COMERCIAL",
    items: [
      { label: "Pipeline", icon: KanbanSquare, path: "/comercial" },
      { label: "Squads & Gerentes", icon: Briefcase, path: "/comercial/squads" },
      { label: "Qualificação", icon: CheckSquare, path: "/comercial/qualificacao" },
    ],
  },
  {
    title: "AFILIADOS",
    items: [
      { label: "Links", icon: Link2, path: "/tracking/links" },
      { label: "Materiais", icon: Wand2, path: "/materiais" },
      { label: "Landing Pages", icon: FileText, path: "/landing-pages" },
      { label: "Oportunidades LP", icon: Sparkles, path: "/lp-opportunities" },
      { label: "Plataformas", icon: Monitor, path: "/plataformas" },
    ],
  },
  {
    title: "GROWTH",
    items: [
      { label: "Campanhas", icon: Megaphone, path: "/campanhas" },
      { label: "Conteúdos", icon: PenTool, path: "/conteudo" },
    ],
  },
  {
    title: "FINANCEIRO",
    items: [
      { label: "Financeiro", icon: DollarSign, path: "/financeiro" },
      { label: "Asaas", icon: CreditCard, path: "/asaas" },
    ],
  },
  {
    title: "SISTEMA",
    items: [
      { label: "Usuários", icon: UserCheck, path: "/usuarios" },
      { label: "Configurações", icon: Settings, path: "/configuracoes" },
      { label: "Integrações", icon: Plug, path: "/integracoes" },
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
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm xl:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────── */}
      <aside
          className={`group/sidebar fixed z-50 inset-y-0 left-0 flex flex-col transition-[width,transform] duration-300 ease-out xl:translate-x-0 xl:static xl:shrink-0 border-r border-sidebar-border/70 backdrop-blur-xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarCollapsed ? "w-[68px]" : "w-[248px]"}`}
        style={{
          background:
            "linear-gradient(180deg, hsl(240 40% 6% / 0.96) 0%, hsl(240 38% 4% / 0.98) 100%)",
        }}
      >
        {/* Floating collapse pill (desktop) */}
        <button
          onClick={() => setSidebarCollapsed((c) => !c)}
          className="hidden xl:flex absolute -right-3 top-[24px] z-50 h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-card text-muted-foreground hover:text-primary hover:border-primary/50 hover:shadow-[0_0_0_4px_hsl(var(--primary)/0.14)] transition-all duration-200"
          title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {sidebarCollapsed ? <PanelLeft size={12} /> : <PanelLeftClose size={12} />}
        </button>

        {/* Logo */}
        <div className={`flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-5"} h-[64px] border-b border-sidebar-border/60 shrink-0`}>
          {!sidebarCollapsed && <img src={logo} alt="PlayBet" className="h-20 opacity-95" />}
          {sidebarCollapsed && <img src={logo} alt="PlayBet" className="h-10 w-10 object-contain opacity-95" />}
          <button className="xl:hidden text-sidebar-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(false)}>
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
                          className={`group relative flex items-center ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-[9px]"} rounded-lg text-[13px] transition-all duration-200 ${
                            active
                              ? "text-foreground font-medium bg-gradient-to-r from-primary/15 via-primary/8 to-transparent shadow-[inset_0_1px_0_hsl(var(--primary)/0.12)]"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground font-normal"
                          }`}
                        >
                          {active && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-gradient-to-b from-primary-glow to-primary shadow-[0_0_8px_hsl(var(--primary)/0.55)]" />
                          )}
                          <item.icon size={sidebarCollapsed ? 16 : 14} strokeWidth={active ? 2.25 : 1.6} className={`shrink-0 transition-colors ${active ? "text-primary" : "group-hover:text-foreground/90"}`} />
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
        {/* User */}
        {!sidebarCollapsed && (
          <div className="px-3 py-3 border-t border-sidebar-border/60 shrink-0">
            <div className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent/60 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-[12px] font-semibold shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.4)]">A</div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-foreground/90 truncate">Admin PlayBet</p>
                <p className="text-[10.5px] text-muted-foreground truncate">Gestor Principal</p>
              </div>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="px-2 py-3 border-t border-sidebar-border/60 shrink-0 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-[12px] font-semibold shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.4)] cursor-pointer" title="Admin PlayBet">A</div>
          </div>
        )}
      </aside>


      {/* ── Main ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <PreviewBanner />
        <header className="h-[56px] border-b border-border/60 flex items-center px-3 sm:px-4 xl:px-6 gap-2 sm:gap-3 xl:gap-4 bg-background/70 backdrop-blur-xl sticky top-0 z-30 shrink-0 safe-pt">

          <button className="xl:hidden text-muted-foreground hover:text-foreground transition-colors p-1.5 -ml-1 rounded-lg hover:bg-secondary/60" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <Menu size={18} />
          </button>
          <div className="hidden xl:flex items-center gap-2.5 bg-secondary/40 hover:bg-secondary/60 border border-border/60 hover:border-primary/30 rounded-lg px-3.5 py-[7px] flex-1 max-w-sm cursor-pointer transition-all duration-200" onClick={() => setSearchOpen(true)}>
            <Search size={13} className="text-muted-foreground shrink-0" />
            <span className="text-[13px] text-muted-foreground flex-1">Buscar módulo, influencer, jogo...</span>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-background/80 border border-border rounded px-1.5 py-0.5 font-mono">
              <Command size={9} />K
            </kbd>
          </div>
          <button
            className="xl:hidden ml-auto p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar"
            title="Buscar (⌘K)"
          >
            <Search size={15} />
          </button>
          <div className="ml-auto xl:ml-0 flex items-center gap-2">
            <NotificationPanel />
            <div className="h-5 w-px bg-border/60 mx-1 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-[11px] font-semibold shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.5)]">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-[12.5px] font-medium hidden md:block text-foreground/80 capitalize">{role || "user"}</span>
            </div>
            <button onClick={signOut} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Sair">
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-5 xl:p-8 pb-tabbar xl:pb-8 overflow-y-auto invisible-scroll main-scroll animate-fade-in safe-x">{children}</main>

        {/* Mobile / tablet quick bottom bar — app-like shortcuts + menu */}
        <nav className="xl:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl safe-pb safe-x">
          <div className="grid grid-cols-5">
            {[
              { label: "Menu", icon: Menu, action: () => setSidebarOpen(true) },
              { label: "Pipeline", icon: KanbanSquare, path: "/comercial" },
              { label: "Links", icon: Link2, path: "/tracking/links" },
              { label: "Materiais", icon: Wand2, path: "/materiais" },
              { label: "Squad", icon: Briefcase, path: "/comercial/squads" },
            ].map((it) => {
              const active = it.path && location.pathname === it.path;
              const inner = (
                <>
                  {active && <span className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-primary-glow to-primary" />}
                  <it.icon size={19} strokeWidth={active ? 2.25 : 1.6} />
                  <span className="leading-tight">{it.label}</span>
                </>
              );
              const cls = `relative flex flex-col items-center justify-center min-h-[56px] py-2 gap-0.5 text-[10px] transition-colors ${active ? "text-primary" : "text-muted-foreground active:text-foreground"}`;
              return it.path ? (
                <Link key={it.label} to={it.path} className={cls}>{inner}</Link>
              ) : (
                <button key={it.label} type="button" onClick={it.action} className={cls} aria-label={it.label}>{inner}</button>
              );
            })}
          </div>
        </nav>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
