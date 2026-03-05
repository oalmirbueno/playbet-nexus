import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, DollarSign, Users, UserCheck, Gamepad2, Monitor,
  Link2, FileText, PenTool, BarChart3, Wallet, Settings, Menu, X,
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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed z-50 inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform md:translate-x-0 md:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <img src={logo} alt="PlayBet" className="h-8" />
          <button className="md:hidden text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card">
          <button className="md:hidden text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">A</div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
