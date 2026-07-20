import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { LayoutDashboard, Trophy, Users, Link2, Sparkles, Wallet, User, LogOut, Wand2, MoreHorizontal, DollarSign } from "lucide-react";
import { useAuth, usePreviewScope } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { usePortalRealtime } from "@/hooks/usePortalRealtime";
import PreviewBanner from "@/components/PreviewBanner";
import LiveSyncBadge from "@/components/LiveSyncBadge";
import { useManagerSync } from "@/hooks/useManagerSync";
import { PortalNotificationBell } from "@/components/PortalNotificationBell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo.png";

const primary = [
  { label: "Squad", icon: LayoutDashboard, path: "/gerente" },
  { label: "Time", icon: Users, path: "/gerente/influenciadores" },
  { label: "Links", icon: Link2, path: "/gerente/links" },
  { label: "Materiais", icon: Wand2, path: "/gerente/materiais" },
];
const secondary = [
  { label: "Ranking", icon: Trophy, path: "/gerente/ranking" },
  { label: "Ofertas", icon: Sparkles, path: "/gerente/oportunidades" },
  { label: "Ganhos", icon: Wallet, path: "/gerente/financeiro" },
  { label: "Saques", icon: DollarSign, path: "/gerente/saques" },
  { label: "Perfil", icon: User, path: "/gerente/perfil" },
];
const allDesktop = [...primary, ...secondary];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const scope = usePreviewScope();
  const { lastSyncedAt } = useManagerSync();
  const qc = useQueryClient();
  const [managerId, setManagerId] = useState<string | null>(scope.managerId ?? null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (scope.active) { setManagerId(scope.managerId ?? null); return; }
    if (!user?.id) return;
    supabase.from("profiles").select("manager_id").eq("id", user.id).maybeSingle()
      .then(({ data }) => setManagerId(data?.manager_id ?? null));
  }, [user?.id, scope.active, scope.managerId]);

  usePortalRealtime({ managerId }, () => qc.invalidateQueries());

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="safe-pt bg-background/95 backdrop-blur-xl" />
      <PreviewBanner />

      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 border-b border-border/60 bg-background/80 backdrop-blur-xl safe-x">
        <div className="flex items-center gap-3">
          <img src={logo} alt="PlayBet" className="h-8 w-auto opacity-95" />
          <span className="hidden sm:inline text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Painel do Gerente</span>
        </div>
        <div className="flex items-center gap-2">
          <LiveSyncBadge lastSyncedAt={lastSyncedAt} />
          <PortalNotificationBell />
          <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-secondary/40">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-[10px] font-semibold">
              {user?.email?.charAt(0).toUpperCase() || "G"}
            </div>
            <span className="text-[12px] text-foreground/80 truncate max-w-[140px]">{user?.email}</span>
          </div>
          <button onClick={signOut} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Sair">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <nav className="hidden md:flex sticky top-14 z-20 border-b border-border/50 bg-background/70 backdrop-blur-xl px-6 gap-1 overflow-x-auto">
        {allDesktop.map((it) => {
          const active = location.pathname === it.path;
          return (
            <Link key={it.path} to={it.path}
              className={`relative flex items-center gap-2 px-3 py-3 text-[13px] whitespace-nowrap transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground/90"}`}>
              <it.icon size={14} strokeWidth={active ? 2.25 : 1.6} className={active ? "text-primary" : ""} />
              {it.label}
              {active && <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-primary-glow to-primary" />}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 p-4 md:p-8 pb-tabbar md:pb-8 max-w-7xl w-full mx-auto animate-fade-in safe-x">{children}</main>

      {/* Mobile bottom tabs — 4 primárias + Mais (sheet com o restante) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-xl grid grid-cols-5 safe-pb safe-x">
        {primary.map((it) => {
          const active = location.pathname === it.path;
          return (
            <Link key={it.path} to={it.path} className={`relative flex flex-col items-center justify-center min-h-[56px] py-2 gap-0.5 text-[10px] transition-colors ${active ? "text-primary" : "text-muted-foreground active:text-foreground"}`}>
              {active && <span className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-primary-glow to-primary" />}
              <it.icon size={20} strokeWidth={active ? 2.25 : 1.6} />
              <span className="leading-tight">{it.label}</span>
            </Link>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className="relative flex flex-col items-center justify-center min-h-[56px] py-2 gap-0.5 text-[10px] text-muted-foreground active:text-foreground" aria-label="Mais">
              <MoreHorizontal size={20} strokeWidth={1.6} />
              <span className="leading-tight">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl safe-pb">
            <SheetHeader>
              <SheetTitle className="text-left">Atalhos do gerente</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-2 pt-3 pb-2">
              {secondary.map((it) => {
                const active = location.pathname === it.path;
                return (
                  <Link key={it.path} to={it.path} onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-[11px] transition-colors ${active ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 text-foreground/80 hover:border-primary/40 hover:bg-secondary/40"}`}>
                    <it.icon size={20} strokeWidth={1.8} />
                    <span className="leading-tight">{it.label}</span>
                  </Link>
                );
              })}
              <button onClick={() => { setMoreOpen(false); signOut(); }} className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 p-3 text-[11px] text-destructive hover:bg-destructive/10">
                <LogOut size={20} strokeWidth={1.8} />
                <span className="leading-tight">Sair</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
