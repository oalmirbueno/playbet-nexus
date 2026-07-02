import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Search, ImageIcon, Wand2, Layers, ExternalLink, Copy, Pencil, Globe } from "lucide-react";
import { toast } from "sonner";
import LpInstanceVisualEditor from "@/components/lp/LpInstanceVisualEditor";
import { LP_MODE_LABELS, type LpMode } from "@/lib/lpMode";

interface Row {
  id: string;
  game_name: string | null;
  game_icon_url: string | null;
  game_slug: string | null;
  link_category: string | null;
  hype_reason: string | null;
  hype_priority: number | null;
  short_url: string | null;
  base_url: string | null;
  tracking_code: string | null;
  platform_account_id: string | null;
  influencer_id: string | null;
  landing_page_instance_id: string | null;
  created_at: string;
  platform_name?: string | null;
  influencer_name?: string | null;
  lp_mode?: string | null;
  lp_slug?: string | null;
  lp_domain?: string | null;
  lp_name?: string | null;
}

interface Props {
  influencerId?: string | null;
  managerId?: string | null;
  title?: string;
  showInfluencer?: boolean;
}

function buildPublicUrl(domain: string | null | undefined, slug: string | null | undefined): string | null {
  if (!slug) return null;
  if (!domain) return `/?ref=${slug}`;
  let base = domain.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return `${base}/?ref=${slug}`;
}

export function LinkLpGrid({ influencerId, managerId, title = "LP por link", showInfluencer = false }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [editorInstanceId, setEditorInstanceId] = useState<string | null>(null);
  const [editorPublicUrl, setEditorPublicUrl] = useState<string | null>(null);
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
            short_url, base_url, tracking_code, platform_account_id, influencer_id,
            landing_page_instance_id, created_at
          `)
          .eq("is_demo", false)
          .not("landing_page_instance_id", "is", null)
          .order("hype_priority", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(200);
        if (influencerId) query = query.eq("influencer_id", influencerId);

        const { data: links, error } = await query;
        if (error) throw error;
        let rowsData = (links ?? []) as Row[];

        // Manager filter through influencers
        if (managerId && !influencerId) {
          const infIds = Array.from(new Set(rowsData.map(r => r.influencer_id).filter(Boolean))) as string[];
          if (infIds.length) {
            const { data: infs } = await supabase.from("influencers").select("id, manager_id, name").in("id", infIds);
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

        // Platforms
        const accIds = Array.from(new Set(rowsData.map(r => r.platform_account_id).filter(Boolean))) as string[];
        if (accIds.length) {
          const { data: accs } = await supabase.from("platform_accounts").select("id, platforms(name)").in("id", accIds);
          const accMap = new Map((accs ?? []).map((a: any) => [a.id, a.platforms?.name ?? null]));
          rowsData = rowsData.map(r => ({ ...r, platform_name: r.platform_account_id ? accMap.get(r.platform_account_id) ?? null : null }));
        }

        // LP instances → mode + slug + LP name/domain
        const lpiIds = Array.from(new Set(rowsData.map(r => r.landing_page_instance_id).filter(Boolean))) as string[];
        if (lpiIds.length) {
          const { data: lpis } = await supabase
            .from("landing_page_instances")
            .select("id, lp_mode, slug, landing_pages(name, domain)")
            .in("id", lpiIds);
          const lpiMap = new Map((lpis ?? []).map((l: any) => [l.id, l]));
          rowsData = rowsData.map(r => {
            const lpi = r.landing_page_instance_id ? lpiMap.get(r.landing_page_instance_id) : null;
            return {
              ...r,
              lp_mode: lpi?.lp_mode ?? null,
              lp_slug: lpi?.slug ?? null,
              lp_name: lpi?.landing_pages?.name ?? null,
              lp_domain: lpi?.landing_pages?.domain ?? null,
            };
          });
        }

        if (!cancelled) setRows(rowsData);
      } catch (e) {
        toast.error("Falha ao carregar LPs por link", { description: (e as Error).message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [influencerId, managerId, showInfluencer, reloadTick]);

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
        (r.influencer_name ?? "").toLowerCase().includes(needle) ||
        (r.tracking_code ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, platformFilter]);

  const openEditor = (r: Row) => {
    if (!r.landing_page_instance_id) return;
    setEditorInstanceId(r.landing_page_instance_id);
    setEditorPublicUrl(buildPublicUrl(r.lp_domain, r.lp_slug));
    setEditorOpen(true);
  };

  const copyLink = async (r: Row) => {
    const url = buildPublicUrl(r.lp_domain, r.lp_slug);
    if (!url) return toast.error("LP sem slug público");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link da LP copiado", { description: url });
    } catch {
      toast.error("Não consegui copiar");
    }
  };

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 md:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Wand2 className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <Badge variant="secondary" className="text-[10px]">automático</Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Cada tracking link ganha uma landing page pronta — hero, jogos, copy e destino sincronizados com o link.
              Clique em <strong>Editar LP</strong> para abrir o editor visual com preview em tempo real.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="w-3.5 h-3.5" /> {rows.length} link{rows.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por jogo, plataforma, código…"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border/60 rounded-lg p-8 text-center">
            <Globe className="w-8 h-8 mx-auto text-muted-foreground opacity-40 mb-2" />
            <p className="text-sm font-medium">Nenhum link com LP vinculada ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ao criar um tracking link com landing page, ele aparece aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(r => (
              <LinkLpCard key={r.id} row={r} showInfluencer={showInfluencer}
                onEdit={() => openEditor(r)} onCopy={() => copyLink(r)} />
            ))}
          </div>
        )}
      </CardContent>

      <LpInstanceVisualEditor
        open={editorOpen}
        onOpenChange={(v) => {
          setEditorOpen(v);
          if (!v) setReloadTick(t => t + 1);
        }}
        instanceId={editorInstanceId}
        publicUrl={editorPublicUrl}
      />
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

function LinkLpCard({
  row, onEdit, onCopy, showInfluencer,
}: { row: Row; onEdit: () => void; onCopy: () => void; showInfluencer?: boolean }) {
  const publicUrl = buildPublicUrl(row.lp_domain, row.lp_slug);
  const modeLabel = row.lp_mode ? (LP_MODE_LABELS[row.lp_mode as LpMode] || row.lp_mode) : "Auto";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(); } }}
      className="group relative overflow-hidden rounded-lg border border-border/60 bg-card hover:border-primary/60 hover:shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 flex flex-col"
    >
      {/* Cover */}
      <div className="aspect-[16/9] relative bg-gradient-to-br from-secondary/40 to-secondary/5">
        {row.game_icon_url ? (
          <img src={row.game_icon_url} alt={row.game_name ?? ""} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-8 h-8 opacity-40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        {row.hype_reason && (
          <Badge className="absolute top-2 left-2 bg-primary/95 text-primary-foreground border-0 text-[10px] font-semibold max-w-[calc(100%-1rem)] truncate">
            <Sparkles className="w-2.5 h-2.5 mr-1 shrink-0" /><span className="truncate">{row.hype_reason}</span>
          </Badge>
        )}
        <Badge variant="outline" className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-[10px] font-medium">
          {modeLabel}
        </Badge>
        <div className="absolute inset-x-0 bottom-0 p-3 space-y-0.5 pointer-events-none">
          <div className="text-white font-semibold text-sm truncate drop-shadow">{row.game_name || "Sem jogo"}</div>
          <div className="text-white/70 text-[10px] uppercase tracking-wider truncate">
            {row.platform_name || "Plataforma"}
            {showInfluencer && row.influencer_name ? ` · ${row.influencer_name}` : ""}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 py-2.5 flex items-center gap-1.5 border-t border-border/50 bg-card">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 h-8 text-xs"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          <Pencil className="w-3 h-3" /> Editar LP
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          title="Copiar link público"
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
        >
          <Copy className="w-3 h-3" />
        </Button>
        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
            title="Abrir LP pública"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
