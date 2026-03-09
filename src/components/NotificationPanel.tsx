import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Wallet, Megaphone, AlertTriangle, X, Clock } from "lucide-react";
import { useSaques, useCampanhas } from "@/hooks/useSupabaseQuery";

interface Notification {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  variant: "warning" | "danger" | "info";
  path: string;
  time: string;
}

export default function NotificationPanel() {
  const navigate = useNavigate();
  const { data: saques } = useSaques();
  const { data: campanhas } = useCampanhas();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("playbet_dismissed_notifs") || "[]"); } catch { return []; }
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Build notifications
  const notifications: Notification[] = [];

  // Saques pendentes
  const saquesPendentes = saques.filter((s: any) => s.status === "Pendente");
  if (saquesPendentes.length > 0) {
    const totalPendente = saquesPendentes.reduce((a: number, s: any) => a + Number(s.valor || 0), 0);
    notifications.push({
      id: `saques-pendentes-${saquesPendentes.length}`,
      title: `${saquesPendentes.length} saque${saquesPendentes.length > 1 ? "s" : ""} pendente${saquesPendentes.length > 1 ? "s" : ""}`,
      description: `Total: ${formatBRL(totalPendente)} aguardando aprovação`,
      icon: Wallet,
      variant: "warning",
      path: "/saques",
      time: "Agora",
    });

    // Individual high-value saques (> R$50k)
    saquesPendentes
      .filter((s: any) => Number(s.valor) >= 50000)
      .forEach((s: any) => {
        notifications.push({
          id: `saque-alto-${s.id}`,
          title: `Saque alto: ${s.nome}`,
          description: `${formatBRL(Number(s.valor))} via ${s.tipo} — requer atenção`,
          icon: AlertTriangle,
          variant: "danger",
          path: "/saques",
          time: s.data || "Recente",
        });
      });
  }

  // Campanhas próximas do fim (dentro de 7 dias)
  const today = new Date();
  const campanhasProximas = campanhas.filter((c: any) => {
    if (!c.fim || c.status === "Finalizada") return false;
    const fim = new Date(c.fim);
    const diff = (fim.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  campanhasProximas.forEach((c: any) => {
    const fim = new Date(c.fim);
    const diff = Math.ceil((fim.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    notifications.push({
      id: `campanha-fim-${c.id}`,
      title: `Campanha "${c.nome}" encerra em breve`,
      description: `${diff === 0 ? "Encerra hoje" : `Faltam ${diff} dia${diff > 1 ? "s" : ""}`} — ${c.status || "Ativa"}`,
      icon: Megaphone,
      variant: diff <= 2 ? "danger" : "info",
      path: "/campanhas",
      time: c.fim,
    });
  });

  // Campanhas já expiradas e ainda não finalizadas
  const campanhasExpiradas = campanhas.filter((c: any) => {
    if (!c.fim || c.status === "Finalizada") return false;
    const fim = new Date(c.fim);
    return fim.getTime() < today.getTime();
  });

  campanhasExpiradas.forEach((c: any) => {
    notifications.push({
      id: `campanha-expirada-${c.id}`,
      title: `Campanha "${c.nome}" expirou`,
      description: `Data fim: ${c.fim} — status ainda "${c.status}"`,
      icon: Clock,
      variant: "danger",
      path: "/campanhas",
      time: c.fim,
    });
  });

  const activeNotifs = notifications.filter(n => !dismissed.includes(n.id));
  const count = activeNotifs.length;

  const dismiss = (id: string) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem("playbet_dismissed_notifs", JSON.stringify(updated));
  };

  const dismissAll = () => {
    const updated = [...dismissed, ...activeNotifs.map(n => n.id)];
    setDismissed(updated);
    localStorage.setItem("playbet_dismissed_notifs", JSON.stringify(updated));
  };

  const variantStyles = {
    warning: "bg-warning/10 border-warning/20 text-warning",
    danger: "bg-destructive/10 border-destructive/20 text-destructive",
    info: "bg-primary/10 border-primary/20 text-primary",
  };

  const variantDot = {
    warning: "bg-warning",
    danger: "bg-destructive",
    info: "bg-primary",
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
      >
        <Bell size={15} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-popover border border-border rounded-xl shadow-xl z-50 flex flex-col animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-muted-foreground" />
              <span className="text-sm font-semibold">Notificações</span>
              {count > 0 && (
                <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">{count}</span>
              )}
            </div>
            {count > 0 && (
              <button onClick={dismissAll} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                Limpar tudo
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto invisible-scroll">
            {activeNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell size={28} className="text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tudo em dia! 🎉</p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {activeNotifs.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer group"
                    onClick={() => { navigate(n.path); setOpen(false); }}
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${variantStyles[n.variant]}`}>
                      <n.icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${variantDot[n.variant]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground leading-tight">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.description}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground/50 mt-1 ml-3.5">{n.time}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                      className="shrink-0 p-1 rounded hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
