import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { LayoutDashboard, Link2, Wallet, DollarSign, User, LogOut, Wand2 } from "lucide-react";
import { useAuth, usePreviewScope } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { usePortalRealtime } from "@/hooks/usePortalRealtime";
import { usePanelSync } from "@/hooks/usePanelSync";
import PreviewBanner from "@/components/PreviewBanner";
import LiveSyncBadge from "@/components/LiveSyncBadge";
import { PortalNotificationBell } from "@/components/PortalNotificationBell";
import logo from "@/assets/logo.png";

const items = [
  { label: "Painel", icon: LayoutDashboard, path: "/portal" },
  { label: "Meus links", icon: Link2, path: "/portal/links" },
  { label: "Materiais", icon: Wand2, path: "/portal/materiais" },
  { label: "Financeiro", icon: DollarSign, path: "/portal/financeiro" },
  { label: "Saques", icon: Wallet, path: "/portal/saques" },
  { label: "Perfil", icon: User, path: "/portal/perfil" },
];

export default function InfluencerPortalLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const scope = usePreviewScope();
  const qc = useQueryClient();
  const { lastSyncedAt } = usePanelSync();
  const [influencerId, setInfluencerId] = useState<string | null>(scope.influencerId ?? null);

  useEffect(() => {
    if (scope.active) { setInfluencerId(scope.influencerId ?? null); return; }
    if (!user?.id) return;
    supabase.from("profiles").select("influencer_id").eq("id", user.id).maybeSingle()
      .then(({ data }) => setInfluencerId(data?.influencer_id ?? null));
  }, [user?.id, scope.active, scope.influencerId]);

  usePortalRealtime({ influencerId }, () => qc.invalidateQueries());



  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="safe-pt bg-background/95 backdrop-blur-xl" />
      <PreviewBanner />

      {/* Top bar (desktop + mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 border-b border-border/60 bg-background/80 backdrop-blur-xl safe-x">

        <div className="flex items-center gap-3">
          <img src={logo} alt="PlayBet" className="h-8 w-auto opacity-95" />
          <span className="hidden sm:inline text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Portal Influenciador</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LiveSyncBadge lastSyncedAt={lastSyncedAt} />
          <PortalNotificationBell />
          <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-secondary/40">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-[10px] font-semibold">
              {user?.email?.charAt(0).toUpperCase() || "I"}
            </div>
            <span className="text-[12px] text-foreground/80 truncate max-w-[140px]">{user?.email}</span>
          </div>
          <button onClick={signOut} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Sair">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Desktop nav */}
      <nav className="hidden md:flex sticky top-14 z-20 border-b border-border/50 bg-background/70 backdrop-blur-xl px-6 gap-1">
        {items.map((it) => {
          const active = location.pathname === it.path;
          return (
            <Link
              key={it.path}
              to={it.path}
              className={`relative flex items-center gap-2 px-3 py-3 text-[13px] transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground/90"}`}
            >
              <it.icon size={14} strokeWidth={active ? 2.25 : 1.6} className={active ? "text-primary" : ""} />
              {it.label}
              {active && <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-primary-glow to-primary" />}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 p-4 md:p-8 pb-tabbar md:pb-8 max-w-6xl w-full mx-auto animate-fade-in safe-x">{children}</main>

      {/* Mobile bottom tabs — elevated above home indicator, generous touch targets */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-xl grid grid-cols-6 safe-pb safe-x">

        {items.map((it) => {
          const active = location.pathname === it.path;
          return (
            <Link key={it.path} to={it.path} className={`relative flex flex-col items-center justify-center min-h-[56px] py-2 gap-0.5 text-[10px] transition-colors ${active ? "text-primary" : "text-muted-foreground active:text-foreground"}`}>
              {active && <span className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-primary-glow to-primary" />}
              <it.icon size={20} strokeWidth={active ? 2.25 : 1.6} />
              <span className="leading-tight">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
