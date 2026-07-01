import { useMemo, useState } from "react";
import { CheckCircle, XCircle, ImageOff, RefreshCw, Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface HypedCandidate { url: string; score: number; matches_slug: boolean; }
export interface HypedPreviewGame {
  game_name: string;
  game_slug: string;
  category: string;
  hype_reason: string;
  priority: number;
  provider_hint?: string | null;
  suggested_url: string | null;
  candidates: HypedCandidate[];
}
export interface HypedPreviewPlatform {
  platform_id: string;
  platform_name: string;
  games: HypedPreviewGame[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preview: HypedPreviewPlatform[];
  onApplied?: () => void;
}

type SelectionMap = Record<string, Record<string, string | null | "reject">>; // platform_id → slug → url | null | "reject"

export default function HypedGamesPreviewDialog({ open, onOpenChange, preview, onApplied }: Props) {
  const [selections, setSelections] = useState<SelectionMap>(() => seed(preview));
  const [applying, setApplying] = useState(false);

  // Reset seed whenever a new preview arrives
  const seedKey = useMemo(() => preview.map(p => p.platform_id + p.games.length).join("|"), [preview]);
  useMemo(() => setSelections(seed(preview)), [seedKey]);

  const stats = useMemo(() => {
    let total = 0, withImg = 0, matched = 0, rejected = 0;
    for (const p of preview) for (const g of p.games) {
      total++;
      const pick = selections[p.platform_id]?.[g.game_slug];
      if (pick === "reject") { rejected++; continue; }
      if (pick) withImg++;
      const cand = g.candidates.find(c => c.url === pick);
      if (cand?.matches_slug) matched++;
    }
    return { total, withImg, matched, rejected };
  }, [preview, selections]);

  const setPick = (platformId: string, slug: string, val: string | null | "reject") => {
    setSelections(prev => ({
      ...prev,
      [platformId]: { ...(prev[platformId] || {}), [slug]: val },
    }));
  };

  const handleConfirm = async () => {
    setApplying(true);
    try {
      const payload = preview.map(p => ({
        platform_id: p.platform_id,
        games: p.games
          .filter(g => selections[p.platform_id]?.[g.game_slug] !== "reject")
          .map(g => {
            const pick = selections[p.platform_id]?.[g.game_slug];
            return {
              game_name: g.game_name,
              game_slug: g.game_slug,
              category: g.category,
              hype_reason: g.hype_reason,
              priority: g.priority,
              icon_url: pick && pick !== "reject" ? pick : null,
            };
          }),
      }));
      const { data, error } = await supabase.functions.invoke("hyped-games-refresh", {
        body: { confirm: true, selections: payload },
      });
      if (error) throw error;
      toast({ title: "Jogos atualizados", description: `${data?.updated ?? 0} plataforma(s) sincronizada(s).` });
      onApplied?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao aplicar", description: e?.message || "Falha ao gravar seleção", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-warning" /> Revisar jogos hypados
          </DialogTitle>
          <DialogDescription>
            Escolha a imagem certa para cada jogo (as marcadas com <span className="text-success font-medium">slug match</span> tendem a ser as reais). Rejeite os que não conferem — só o que você confirmar é gravado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 text-xs text-muted-foreground border-y border-border py-2">
          <span><b className="text-foreground">{stats.total}</b> jogos</span>
          <span><b className="text-foreground">{stats.withImg}</b> com imagem</span>
          <span className="text-success"><b>{stats.matched}</b> match slug</span>
          <span className="text-destructive"><b>{stats.rejected}</b> rejeitados</span>
        </div>

        <div className="overflow-y-auto flex-1 -mx-2 px-2 space-y-6">
          {preview.map(platform => (
            <section key={platform.platform_id}>
              <h3 className="text-sm font-semibold mb-2 sticky top-0 bg-card py-1.5 z-10">{platform.platform_name}</h3>
              <div className="space-y-3">
                {platform.games.map(game => {
                  const pick = selections[platform.platform_id]?.[game.game_slug];
                  const rejected = pick === "reject";
                  return (
                    <div key={game.game_slug} className={`glass-card p-3 ${rejected ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-warning/15 text-warning">#{game.priority}</span>
                            <span className="text-sm font-medium">{game.game_name}</span>
                            <span className="text-[10px] text-muted-foreground">/{game.game_slug}</span>
                            {game.provider_hint && <span className="text-[10px] text-muted-foreground">· {game.provider_hint}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{game.hype_reason}</p>
                        </div>
                        <button
                          onClick={() => setPick(platform.platform_id, game.game_slug, rejected ? (game.candidates[0]?.url ?? null) : "reject")}
                          className={`text-[10px] px-2 py-1 rounded border transition-colors ${rejected ? "border-success/40 text-success hover:bg-success/10" : "border-destructive/40 text-destructive hover:bg-destructive/10"}`}
                        >
                          {rejected ? "Restaurar" : "Rejeitar"}
                        </button>
                      </div>

                      {!rejected && (
                        <div className="flex gap-2 overflow-x-auto invisible-scroll pb-1">
                          <button
                            onClick={() => setPick(platform.platform_id, game.game_slug, null)}
                            className={`shrink-0 w-20 h-20 rounded-md border-2 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors ${pick === null ? "border-accent bg-accent/10 text-accent" : "border-border/50 text-muted-foreground hover:border-border"}`}
                          >
                            <ImageOff size={16} /> Sem imagem
                          </button>
                          {game.candidates.length === 0 && (
                            <div className="text-xs text-muted-foreground italic self-center pl-2">
                              Nenhum candidato encontrado no Firecrawl.
                            </div>
                          )}
                          {game.candidates.map(c => {
                            const selected = pick === c.url;
                            return (
                              <button
                                key={c.url}
                                onClick={() => setPick(platform.platform_id, game.game_slug, c.url)}
                                className={`shrink-0 relative w-20 h-20 rounded-md border-2 overflow-hidden group ${selected ? "border-accent" : "border-border/50 hover:border-border"}`}
                                title={c.url}
                              >
                                <img
                                  src={c.url} alt={game.game_name} loading="lazy"
                                  className="w-full h-full object-cover bg-secondary/40"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.15"; }}
                                />
                                {c.matches_slug && (
                                  <span className="absolute top-0.5 left-0.5 text-[8px] px-1 py-px rounded bg-success text-success-foreground font-semibold">MATCH</span>
                                )}
                                {selected && (
                                  <span className="absolute inset-0 flex items-center justify-center bg-accent/25">
                                    <Check size={22} className="text-accent drop-shadow" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {preview.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10">Nenhum preview disponível.</div>
          )}
        </div>

        <DialogFooter>
          <button className="btn-ghost" onClick={() => onOpenChange(false)} disabled={applying}>
            <XCircle size={13} /> Cancelar
          </button>
          <button className="btn-primary" onClick={handleConfirm} disabled={applying || preview.length === 0}>
            {applying ? <><RefreshCw size={13} className="animate-spin" /> Aplicando…</> : <><CheckCircle size={13} /> Confirmar seleção</>}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function seed(preview: HypedPreviewPlatform[]): SelectionMap {
  const out: SelectionMap = {};
  for (const p of preview) {
    out[p.platform_id] = {};
    for (const g of p.games) {
      // Pré-seleciona o match de slug quando existir; senão o primeiro; senão null
      const match = g.candidates.find(c => c.matches_slug);
      out[p.platform_id][g.game_slug] = match?.url ?? g.suggested_url ?? g.candidates[0]?.url ?? null;
    }
  }
  return out;
}
