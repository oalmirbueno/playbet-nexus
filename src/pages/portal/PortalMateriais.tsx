import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePanelSync } from "@/hooks/usePanelSync";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wand2, Download, Copy, Check, Search, Image as ImageIcon, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Material = {
  id: string;
  tracking_link_id: string | null;
  game_name: string | null;
  game_slug: string | null;
  format: string | null;
  style: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  status: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_META: Record<string, { label: string; tone: string; icon: any }> = {
  ready: { label: "Pronto", tone: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", icon: CheckCircle2 },
  done: { label: "Pronto", tone: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", icon: CheckCircle2 },
  processing: { label: "Gerando", tone: "text-primary border-primary/30 bg-primary/10", icon: Loader2 },
  pending: { label: "Na fila", tone: "text-amber-400 border-amber-500/30 bg-amber-500/10", icon: Loader2 },
  queued: { label: "Na fila", tone: "text-amber-400 border-amber-500/30 bg-amber-500/10", icon: Loader2 },
  error: { label: "Erro", tone: "text-destructive border-destructive/30 bg-destructive/10", icon: AlertCircle },
  failed: { label: "Erro", tone: "text-destructive border-destructive/30 bg-destructive/10", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string | null }) {
  const meta = STATUS_META[status ?? ""] ?? { label: status ?? "—", tone: "text-muted-foreground border-border/50 bg-secondary/40", icon: ImageIcon };
  const Icon = meta.icon;
  const spin = meta.label === "Gerando" || meta.label === "Na fila";
  return (
    <Badge variant="outline" className={`gap-1.5 font-normal ${meta.tone}`}>
      <Icon size={11} className={spin ? "animate-spin" : ""} />
      {meta.label}
    </Badge>
  );
}

export default function PortalMateriais() {
  const { user } = useAuth();
  const { revision, lastSyncedAt } = usePanelSync();
  const [infId, setInfId] = useState<string | null | undefined>(undefined);
  const [items, setItems] = useState<Material[] | null>(null);
  const [q, setQ] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("influencer_id").eq("id", user.id).maybeSingle();
      setInfId(data?.influencer_id ?? null);
    })();
  }, [user]);

  useEffect(() => {
    if (!infId) { if (infId === null) setItems([]); return; }
    (async () => {
      const { data } = await supabase
        .from("link_materials")
        .select("id, tracking_link_id, game_name, game_slug, format, style, image_url, thumbnail_url, status, error, created_at, updated_at")
        .eq("influencer_id", infId)
        .order("updated_at", { ascending: false })
        .limit(200);
      setItems((data as Material[]) ?? []);
    })();
  }, [infId, revision]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(m =>
      (m.game_name ?? "").toLowerCase().includes(term) ||
      (m.game_slug ?? "").toLowerCase().includes(term) ||
      (m.format ?? "").toLowerCase().includes(term) ||
      (m.style ?? "").toLowerCase().includes(term) ||
      (m.status ?? "").toLowerCase().includes(term)
    );
  }, [items, q]);

  const stats = useMemo(() => {
    const base = { total: 0, ready: 0, processing: 0, error: 0 };
    for (const m of items ?? []) {
      base.total++;
      const s = (m.status ?? "").toLowerCase();
      if (["ready", "done"].includes(s)) base.ready++;
      else if (["processing", "pending", "queued"].includes(s)) base.processing++;
      else if (["error", "failed"].includes(s)) base.error++;
    }
    return base;
  }, [items]);

  const copyUrl = async (id: string, url: string | null) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link do material copiado");
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (infId === undefined || items === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (infId === null) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Sua conta ainda não está vinculada a um influenciador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
            <Wand2 size={11} /> Materiais
          </p>
          <h1 className="page-header">Meus materiais</h1>
          <p className="page-subtitle">Criativos gerados pelo studio, sincronizados em tempo real.</p>
        </div>
        {lastSyncedAt && (
          <p className="text-[10px] text-muted-foreground">Atualizado {new Date(lastSyncedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Prontos", value: stats.ready, tone: "text-emerald-400" },
          { label: "Gerando", value: stats.processing, tone: "text-primary" },
          { label: "Com erro", value: stats.error, tone: "text-destructive" },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-semibold tabular-nums mt-1 ${s.tone ?? ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <div className="p-3 md:p-4 border-b border-border/50 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por jogo, formato, status…"
              className="pl-8 h-9 text-[13px]"
            />
          </div>
          <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">{filtered?.length ?? 0} itens</span>
        </div>

        {filtered && filtered.length === 0 ? (
          <div className="p-10 text-center">
            <ImageIcon size={22} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {q ? "Nenhum material corresponde à busca." : "Ainda sem materiais. Peça para o time gerar criativos para seus links."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-secondary/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-normal">Preview</th>
                    <th className="text-left px-2 py-2.5 font-normal">Jogo</th>
                    <th className="text-left px-2 py-2.5 font-normal">Formato</th>
                    <th className="text-left px-2 py-2.5 font-normal">Estilo</th>
                    <th className="text-left px-2 py-2.5 font-normal">Status</th>
                    <th className="text-left px-2 py-2.5 font-normal">Atualizado</th>
                    <th className="text-right px-4 py-2.5 font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered!.map(m => (
                    <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary/40 border border-border/40 flex items-center justify-center">
                          {m.thumbnail_url || m.image_url ? (
                            <img src={m.thumbnail_url ?? m.image_url!} alt={m.game_name ?? "material"} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={16} className="text-muted-foreground" />
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <p className="font-medium truncate max-w-[220px]">{m.game_name ?? m.game_slug ?? "—"}</p>
                        {m.error && <p className="text-[10px] text-destructive truncate max-w-[220px]">{m.error}</p>}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">{m.format ?? "—"}</td>
                      <td className="px-2 py-2.5 text-muted-foreground">{m.style ?? "—"}</td>
                      <td className="px-2 py-2.5"><StatusBadge status={m.status} /></td>
                      <td className="px-2 py-2.5 text-muted-foreground tabular-nums text-[12px]">
                        {new Date(m.updated_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2" disabled={!m.image_url} onClick={() => copyUrl(m.id, m.image_url)}>
                            {copiedId === m.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2" disabled={!m.image_url} asChild={!!m.image_url}>
                            {m.image_url ? (
                              <a href={m.image_url} target="_blank" rel="noreferrer" download>
                                <Download size={13} />
                              </a>
                            ) : <span><Download size={13} /></span>}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border/40">
              {filtered!.map(m => (
                <div key={m.id} className="p-3 flex gap-3">
                  <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-secondary/40 border border-border/40 flex items-center justify-center">
                    {m.thumbnail_url || m.image_url ? (
                      <img src={m.thumbnail_url ?? m.image_url!} alt={m.game_name ?? "material"} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={18} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium truncate">{m.game_name ?? m.game_slug ?? "—"}</p>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {(m.format ?? "—")} · {(m.style ?? "—")}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                      {new Date(m.updated_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {m.error && <p className="text-[10px] text-destructive mt-1 truncate">{m.error}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="outline" size="sm" className="h-8 px-2 text-[11px]" disabled={!m.image_url} onClick={() => copyUrl(m.id, m.image_url)}>
                        {copiedId === m.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span className="ml-1">Copiar</span>
                      </Button>
                      {m.image_url && (
                        <Button variant="outline" size="sm" className="h-8 px-2 text-[11px]" asChild>
                          <a href={m.image_url} target="_blank" rel="noreferrer" download>
                            <Download size={12} /> <span className="ml-1">Baixar</span>
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
