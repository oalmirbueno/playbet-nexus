import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Search, ImageIcon, Wand2, Layers, Download, Pencil } from "lucide-react";
import { CreativeStudio, type CreativeStudioLink } from "@/components/materials/CreativeStudio";
import { LinkMaterialEditor } from "@/components/materials/LinkMaterialEditor";
import { toast } from "sonner";

interface Row {
  id: string;
  game_name: string | null;
  game_icon_url: string | null;
  game_slug: string | null;
  link_category: string | null;
  hype_reason: string | null;
  hype_priority: number | null;
  short_url: string | null;
  tracking_code: string | null;
  platform_account_id: string | null;
  influencer_id: string | null;
  created_at: string;
  platform_name?: string | null;
  influencer_name?: string | null;
}

interface Props {
  /** Filter to a single influencer (portal). If null → admin sees all. */
  influencerId?: string | null;
  /** Filter to a manager's team (gerente). */
  managerId?: string | null;
  /** Sub-header title. */
  title?: string;
  /** Whether to show the influencer column. */
  showInfluencer?: boolean;
  /** When true, editor opens in view-only mode (portal/gerente). */
  readOnly?: boolean;
}

export function MateriaisView({ influencerId, managerId, title = "Materiais", showInfluencer = false, readOnly = false }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [active, setActive] = useState<CreativeStudioLink | null>(null);
  const [open, setOpen] = useState(false);
  const [editorLinkId, setEditorLinkId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("tracking_links")
          .select(`
            id, game_name, game_icon_url, game_slug, link_category, hype_reason, hype_priority,
            short_url, tracking_code, platform_account_id, influencer_id, created_at
          `)
          .eq("is_demo", false)
          .order("hype_priority", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(200);

        if (influencerId) query = query.eq("influencer_id", influencerId);

        const { data: links, error } = await query;
        if (error) throw error;

        let rowsData = (links ?? []) as Row[];

        // Optional manager filter → join through influencers
        if (managerId && !influencerId) {
          const infIds = Array.from(new Set(rowsData.map(r => r.influencer_id).filter(Boolean))) as string[];
          if (infIds.length) {
            const { data: infs } = await supabase
              .from("influencers")
              .select("id, manager_id, name")
              .in("id", infIds);
            const mgrMap = new Map((infs ?? []).map((i: any) => [i.id, i.manager_id]));
            const nameMap = new Map((infs ?? []).map((i: any) => [i.id, i.name]));
            rowsData = rowsData
              .filter(r => r.influencer_id && mgrMap.get(r.influencer_id) === managerId)
              .map(r => ({ ...r, influencer_name: nameMap.get(r.influencer_id!) ?? null }));
          } else {
            rowsData = [];
          }
        } else if (showInfluencer) {
          const infIds = Array.from(new Set(rowsData.map(r => r.influencer_id).filter(Boolean))) as string[];
          if (infIds.length) {
            const { data: infs } = await supabase.from("influencers").select("id, name").in("id", infIds);
            const nameMap = new Map((infs ?? []).map((i: any) => [i.id, i.name]));
            rowsData = rowsData.map(r => ({ ...r, influencer_name: r.influencer_id ? nameMap.get(r.influencer_id) ?? null : null }));
          }
        }

        // Platforms lookup
        const accIds = Array.from(new Set(rowsData.map(r => r.platform_account_id).filter(Boolean))) as string[];
        if (accIds.length) {
          const { data: accs } = await supabase
            .from("platform_accounts")
            .select("id, platform_id, platforms(name)")
            .in("id", accIds);
          const accMap = new Map((accs ?? []).map((a: any) => [a.id, a.platforms?.name ?? null]));
          rowsData = rowsData.map(r => ({
            ...r,
            platform_name: r.platform_account_id ? accMap.get(r.platform_account_id) ?? null : null,
          }));
        }

        if (!cancelled) setRows(rowsData);
      } catch (e) {
        toast.error("Falha ao carregar materiais", { description: (e as Error).message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [influencerId, managerId, showInfluencer]);

  const platforms = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.platform_name) set.add(r.platform_name); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(r => {
      if (platformFilter !== "all" && r.platform_name !== platformFilter) return false;
      if (!needle) return true;
      return (
        (r.game_name ?? "").toLowerCase().includes(needle) ||
        (r.platform_name ?? "").toLowerCase().includes(needle) ||
        (r.link_category ?? "").toLowerCase().includes(needle) ||
        (r.influencer_name ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, platformFilter]);

  const withArt = filtered.filter(r => r.game_icon_url);
  const withoutArt = filtered.filter(r => !r.game_icon_url);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Cada link novo já vira criativo pronto — arte do jogo + logo Playbet, 4 formatos, exportação em PNG.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Layers className="w-4 h-4" />} label="Links elegíveis" value={rows.length} />
        <StatCard icon={<ImageIcon className="w-4 h-4" />} label="Com arte" value={withArt.length} accent />
        <StatCard icon={<Sparkles className="w-4 h-4" />} label="Em alta" value={rows.filter(r => r.hype_reason).length} />
        <StatCard icon={<Download className="w-4 h-4" />} label="Formatos por link" value={4} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por jogo, plataforma…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          <FilterChip active={platformFilter === "all"} onClick={() => setPlatformFilter("all")}>
            Todas ({rows.length})
          </FilterChip>
          {platforms.map(p => (
            <FilterChip key={p} active={platformFilter === p} onClick={() => setPlatformFilter(p)}>
              {p}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {withArt.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {withArt.map(r => (
                <CreativeCard key={r.id} row={r} showInfluencer={showInfluencer}
                  onOpen={() => { setActive(toStudioLink(r)); setOpen(true); }}
                  onEdit={() => { setEditorLinkId(r.id); setEditorOpen(true); }} />
              ))}
            </div>
          )}
          {withoutArt.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Sem arte do jogo ({withoutArt.length})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {withoutArt.map(r => (
                  <CreativeCard key={r.id} row={r} showInfluencer={showInfluencer}
                    onOpen={() => { setActive(toStudioLink(r)); setOpen(true); }}
                    onEdit={() => { setEditorLinkId(r.id); setEditorOpen(true); }} muted />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <CreativeStudio open={open} onOpenChange={setOpen} link={active} />
      <LinkMaterialEditor open={editorOpen} onOpenChange={setEditorOpen} trackingLinkId={editorLinkId} />
    </div>
  );
}

function toStudioLink(r: Row): CreativeStudioLink {
  return {
    id: r.id,
    influencerId: r.influencer_id,
    gameName: r.game_name,
    gameIconUrl: r.game_icon_url,
    platformName: r.platform_name,
    hypeReason: r.hype_reason,
    shortUrl: r.short_url,
  };
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent?: boolean }) {
  return (
    <Card className={`border-border/60 ${accent ? "bg-primary/5 border-primary/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] uppercase tracking-wider mb-1">
          {icon}<span>{label}</span>
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-xs px-3 h-9 rounded-md border transition-all ${
        active ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {children}
    </button>
  );
}

function CreativeCard({
  row, onOpen, onEdit, muted, showInfluencer,
}: { row: Row; onOpen: () => void; onEdit: () => void; muted?: boolean; showInfluencer?: boolean }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className={`group relative overflow-hidden rounded-lg border border-border/60 bg-card hover:border-primary/60 hover:shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 ${muted ? "opacity-75" : ""}`}
    >
      <div className="aspect-square relative bg-gradient-to-br from-secondary/30 to-secondary/5">
        {row.game_icon_url ? (
          <img src={row.game_icon_url} alt={row.game_name ?? ""} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-8 h-8 opacity-40" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
        {row.hype_reason && (
          <Badge className="absolute top-2 left-2 bg-primary/95 text-primary-foreground border-0 text-[10px] font-semibold max-w-[calc(100%-3.5rem)] truncate">
            <Sparkles className="w-2.5 h-2.5 mr-1 shrink-0" /><span className="truncate">{row.hype_reason}</span>
          </Badge>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3 pr-12 space-y-0.5 pointer-events-none">
          <div className="text-white font-semibold text-sm truncate drop-shadow">{row.game_name || "Sem título"}</div>
          <div className="text-white/70 text-[10px] uppercase tracking-wider truncate">
            {row.platform_name || "Plataforma"}
            {showInfluencer && row.influencer_name ? ` · ${row.influencer_name}` : ""}
          </div>
        </div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-md shadow-lg flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5" /> Abrir estúdio
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(); }}
        onPointerDown={(e) => e.stopPropagation()}
        title="Editar textos, arte e LP"
        aria-label="Editar material"
        className="absolute top-2 right-2 z-20 w-8 h-8 rounded-md bg-background/90 hover:bg-background border border-border/60 backdrop-blur-sm flex items-center justify-center text-foreground hover:text-primary transition-colors shadow-md"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed border-border/60">
      <CardContent className="py-16 text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-secondary/40 flex items-center justify-center">
          <Wand2 className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Nenhum link ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie um tracking link — o material aparece aqui automaticamente.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <a href="/tracking/links">Ir para Central de Links</a>
        </Button>
      </CardContent>
    </Card>
  );
}
