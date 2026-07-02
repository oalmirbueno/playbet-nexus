import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown, RefreshCw, ExternalLink, Loader2, Wand2 } from "lucide-react";
import { LP_MODE_LABELS, LP_MODE_HINTS, defaultLayoutConfig, type LpMode } from "@/lib/lpMode";
import GameArtwork from "@/components/tracking/GameArtwork";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  instanceId: string | null;
  publicUrl?: string | null;
}

type SectionDef = { id: string; label?: string; enabled: boolean };

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  features: "Benefícios",
  games: "Jogos",
  odds: "Odds/Partidas",
  cta: "CTA final",
  footer: "Rodapé",
};

export default function LpInstanceVisualEditor({ open, onOpenChange, instanceId, publicUrl }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [instance, setInstance] = useState<any>(null);
  const [mode, setMode] = useState<LpMode>("catalog");
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [copy, setCopy] = useState<{ title: string; subtitle: string; cta_label: string }>({
    title: "",
    subtitle: "",
    cta_label: "",
  });
  const [gameSlugs, setGameSlugs] = useState<string[]>([]);
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (!open || !instanceId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: inst } = await supabase
          .from("landing_page_instances")
          .select("*")
          .eq("id", instanceId)
          .maybeSingle();
        if (!inst) { toast({ title: "Instância não encontrada", variant: "destructive" }); return; }
        setInstance(inst);
        const m: LpMode = ((inst as any).lp_mode as LpMode) || "catalog";
        setMode(m);
        setGameSlugs(((inst as any).game_slugs as string[]) || []);
        const lc = (inst as any).layout_config;
        setSections(
          Array.isArray(lc?.sections) && lc.sections.length > 0
            ? lc.sections
            : defaultLayoutConfig(m).sections
        );
        const hc = (inst as any).hype_copy || {};
        setCopy({
          title: hc.title || "",
          subtitle: hc.subtitle || "",
          cta_label: hc.cta_label || "",
        });

        // Load available hyped games from platform linked via tracking_link
        const { data: tl } = await supabase
          .from("tracking_links")
          .select("platform_account_id, platform_accounts(platform_id)")
          .eq("landing_page_instance_id", instanceId)
          .limit(1)
          .maybeSingle();
        const platformId = (tl as any)?.platform_accounts?.platform_id;
        if (platformId) {
          const { data: games } = await supabase
            .from("platform_hyped_games")
            .select("id, game_slug, game_name, icon_url, priority")
            .eq("platform_id", platformId)
            .order("priority", { ascending: false });
          setAvailableGames(games || []);
        } else {
          setAvailableGames([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, instanceId]);

  const move = (idx: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return next;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const toggleSection = (idx: number, on: boolean) =>
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, enabled: on } : s)));

  const toggleGame = (slug: string) =>
    setGameSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const handleSave = async () => {
    if (!instanceId) return;
    setSaving(true);
    try {
      const layoutConfig = {
        mode,
        sections,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("landing_page_instances")
        .update({
          lp_mode: mode,
          game_slugs: gameSlugs,
          layout_config: layoutConfig,
          hype_copy: {
            title: copy.title || null,
            subtitle: copy.subtitle || null,
            cta_label: copy.cta_label || null,
          },
        } as any)
        .eq("id", instanceId);
      if (error) throw new Error(error.message);
      toast({ title: "LP salva", description: "Preview e link públicos atualizados." });
      setPreviewKey((k) => k + 1);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = useMemo(() => {
    if (!publicUrl) return null;
    const sep = publicUrl.includes("?") ? "&" : "?";
    return `${publicUrl}${sep}_preview=${previewKey}`;
  }, [publicUrl, previewKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 size={16} className="text-primary" />
            Editor visual da LP
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Modo, seções, copy e jogos ficam sincronizados com o link — preview ao lado atualiza ao salvar.
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[360px_1fr] overflow-hidden">
          <div className="overflow-y-auto border-r px-5 py-4 space-y-5">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" /> Carregando…
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Modo da LP</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as LpMode)}>
                    <SelectTrigger className="h-9 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(LP_MODE_LABELS) as LpMode[]).map((k) => (
                        <SelectItem key={k} value={k}>{LP_MODE_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">{LP_MODE_HINTS[mode]}</p>
                </div>

                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Copy</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    placeholder="Título (opcional)"
                    value={copy.title}
                    onChange={(e) => setCopy({ ...copy, title: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs mt-1"
                    placeholder="Subtítulo / motivo do hype"
                    value={copy.subtitle}
                    onChange={(e) => setCopy({ ...copy, subtitle: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs mt-1"
                    placeholder="Rótulo do CTA (ex: Jogar agora)"
                    value={copy.cta_label}
                    onChange={(e) => setCopy({ ...copy, cta_label: e.target.value })}
                  />
                </div>

                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Seções</Label>
                  <div className="space-y-1 mt-1">
                    {sections.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2 rounded border border-border/60 bg-background/40 px-2 py-1.5">
                        <span className="text-xs flex-1">{s.label || SECTION_LABELS[s.id] || s.id}</span>
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Subir"><ArrowUp size={11} /></button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Descer"><ArrowDown size={11} /></button>
                        <Switch checked={s.enabled} onCheckedChange={(v) => toggleSection(i, v)} />
                      </div>
                    ))}
                  </div>
                </div>

                {availableGames.length > 0 && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Jogos exibidos ({gameSlugs.length})
                    </Label>
                    <div className="invisible-scroll flex gap-1.5 overflow-x-auto pb-1 mt-1">
                      {availableGames.map((g: any) => {
                        const on = gameSlugs.includes(g.game_slug);
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => toggleGame(g.game_slug)}
                            className={`shrink-0 w-[72px] rounded-md border p-1.5 text-center transition ${on ? "border-primary bg-primary/10" : "border-border/50 bg-background/50 hover:border-primary/40"}`}
                            title={g.game_name}
                          >
                            <div className="flex justify-center mb-1">
                              <GameArtwork slug={g.game_slug} name={g.game_name} iconUrl={g.icon_url} size="md" />
                            </div>
                            <span className="block text-[9px] font-medium leading-tight truncate">{g.game_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col overflow-hidden bg-secondary/20">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background/60 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  title="Recarregar"
                >
                  <RefreshCw size={11} /> Reload
                </button>
                {publicUrl && (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Abrir <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              {previewSrc ? (
                <iframe
                  key={previewKey}
                  src={previewSrc}
                  className="w-full h-full border-0 bg-white"
                  title="LP preview"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">
                  Configure o domínio da LP para ver o preview.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Salvando…" : "Salvar LP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
