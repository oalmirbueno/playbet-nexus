import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, X, Wallet, CheckCircle2, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DBNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

export function PortalNotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DBNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as DBNotification[]);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    const interval = setInterval(load, 60_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = items.filter((n) => !n.read_at);

  const markAllRead = async () => {
    if (!user || unread.length === 0) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    load();
  };

  const openItem = async (n: DBNotification) => {
    if (!n.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    if (n.action_url) navigate(n.action_url);
    setOpen(false);
    load();
  };

  const iconFor = (t: string) => {
    if (t === "withdrawal_available") return { Icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    if (t === "withdrawal_incoming") return { Icon: Wallet, cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
    return { Icon: Info, cls: "bg-primary/10 text-primary border-primary/20" };
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notificações"
      >
        <Bell size={15} />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] bg-popover border border-border rounded-xl shadow-xl z-50 flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-muted-foreground" />
              <span className="text-sm font-semibold">Notificações</span>
              {unread.length > 0 && (
                <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">
                  {unread.length}
                </span>
              )}
            </div>
            {unread.length > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-muted-foreground hover:text-foreground">
                Marcar tudo como lido
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto invisible-scroll">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell size={26} className="text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Você será avisado por aqui.</p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {items.map((n) => {
                  const { Icon, cls } = iconFor(n.type);
                  return (
                    <button
                      key={n.id}
                      onClick={() => openItem(n)}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/40 transition-colors ${
                        !n.read_at ? "bg-secondary/20" : ""
                      }`}
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${cls}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                          <p className="text-[13px] font-medium leading-tight">{n.title}</p>
                        </div>
                        {n.body && <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
