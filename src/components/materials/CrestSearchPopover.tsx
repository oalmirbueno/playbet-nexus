import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { searchCrests, type CrestResult } from "@/lib/clubCrests";

interface Props {
  kind: "team" | "league";
  onPick: (url: string, label: string) => void;
  triggerLabel?: string;
  size?: "sm" | "xs";
}

/**
 * Botão que abre um popover com busca de brasões (clubes) ou logos (ligas).
 * Usado dentro do ApplyLayoutPanel para preencher slots team-crest-* e league-badge
 * sem o usuário precisar caçar PNG na internet.
 */
export function CrestSearchPopover({ kind, onPick, triggerLabel, size = "xs" }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CrestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) { setResults([]); setError(null); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      setLoading(true); setError(null);
      try {
        const r = await searchCrests(q, kind, ctrl.signal);
        if (!ctrl.signal.aborted) setResults(r);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, kind, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline"
          className={cn(
            size === "xs" ? "h-6 px-2 text-[10px]" : "h-7 px-2.5 text-[11px]",
            "gap-1 shrink-0",
          )}
        >
          <Search className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {triggerLabel || (kind === "team" ? "Buscar clube" : "Buscar liga")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2 space-y-2">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={kind === "team" ? "Ex: Palmeiras, Real Madrid" : "Ex: Brasileirão, Champions"}
            className="h-8 text-[12px] pl-7"
          />
        </div>
        <div className="min-h-[80px] max-h-[240px] overflow-y-auto scrollbar-thin">
          {loading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          {!loading && error && (
            <p className="text-[11px] text-destructive px-1 py-2">{error}</p>
          )}
          {!loading && !error && q.trim().length >= 2 && results.length === 0 && (
            <p className="text-[11px] text-muted-foreground px-1 py-2">Nenhum resultado.</p>
          )}
          {!loading && !error && q.trim().length < 2 && (
            <p className="text-[11px] text-muted-foreground px-1 py-2 flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Digite ao menos 2 letras.
            </p>
          )}
          <ul className="space-y-0.5">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => { onPick(r.badgeUrl, r.name); setOpen(false); setQ(""); }}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-secondary/60 text-left"
                >
                  <img
                    src={r.badgeUrl}
                    alt=""
                    className="w-7 h-7 object-contain shrink-0 bg-background/40 rounded"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate">{r.name}</div>
                    {r.subtitle && (
                      <div className="text-[9.5px] text-muted-foreground truncate">{r.subtitle}</div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[9.5px] text-muted-foreground px-1">
          Fonte: TheSportsDB · PNG transparente pronto pro criativo.
        </p>
      </PopoverContent>
    </Popover>
  );
}
