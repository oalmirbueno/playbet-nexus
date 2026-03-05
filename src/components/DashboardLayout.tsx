import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, DollarSign, Users, UserCheck, Gamepad2, Monitor,
  Link2, FileText, PenTool, BarChart3, Wallet, Settings, Menu, X, Bell, Search,
} from "lucide-react";
import logo from "@/assets/logo.png";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Financeiro", icon: DollarSign, path: "/financeiro" },
  { label: "Influencers", icon: Users, path: "/influencers" },
  { label: "Sócios", icon: UserCheck, path: "/socios" },
  { label: "Jogos", icon: Gamepad2, path: "/jogos" },
  { label: "Plataformas", icon: Monitor, path: "/plataformas" },
  { label: "Links Afiliados", icon: Link2, path: "/links-afiliados" },
  { label: "Landing Pages", icon: FileText, path: "/landing-pages" },
  { label: "Conteúdo", icon: PenTool, path: "/conteudo" },
  { label: "Métricas", icon: BarChart3, path: "/metricas" },
  { label: "Saques", icon: Wallet, path: "/saques" },
  { label: "Configurações", icon: Settings, path: "/configuracoes" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed z-50 inset-y-0 left-0 w-[270px] bg-sidebar flex flex-col transition-transform duration-300 ease-out md:translate-x-0 md:static border-r border-sidebar-border ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <img src={logo} alt="PlayBet" className="h-10" />
          <button className="md:hidden text-sidebar-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Nav with custom thin scrollbar */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5 sidebar-scroll">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5"
                }`}
              >
                <item.icon size={17} className={`transition-transform duration-200 ${!active ? "group-hover:scale-110" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-accent text-xs font-bold ring-2 ring-primary/30">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">Admin</p>
              <p className="text-[10px] text-muted-foreground truncate">admin@playbet.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-5 gap-4 bg-card/50 backdrop-blur-md sticky top-0 z-30">
          <button className="md:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="hidden md:flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-1.5 flex-1 max-w-xs">
            <Search size={14} className="text-muted-foreground" />
            <input placeholder="Buscar..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold ring-2 ring-primary/30">A</div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto main-scroll">{children}</main>
      </div>
    </div>
  );
}
