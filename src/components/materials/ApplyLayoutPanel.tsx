import { useMemo, useState } from "react";
import { Layers, ChevronDown, ChevronRight, Wand2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CREATIVE_REFERENCES,
  applyReference,
  type CreativeReference,
  type ReferenceCategory,
  type ReferenceSlotFill,
  type ApplyReferenceCtx,
} from "@/lib/creativeReferences";
import type { Layer, CreativeFormat } from "@/lib/creativeStudio";
import { CrestSearchPopover } from "@/components/materials/CrestSearchPopover";

const CATS: { id: ReferenceCategory | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "odds", label: "Odds" },
  { id: "aposta-compartilhada", label: "Bilhetes" },
  { id: "slots", label: "Slots" },
  { id: "cassino", label: "Cassino" },
  { id: "bonus", label: "Bônus" },
  { id: "cashback", label: "Cashback" },
];

const ROLE_LABEL: Record<string, string> = {
  "hero-art": "Arte principal (screenshot/foto)",
  "game-logo": "Logo do jogo/slot",
  "team-crest-home": "Brasão mandante",
  "team-crest-away": "Brasão visitante",
  "league-badge": "Logo da liga",
  "odd-value": "Valor da odd",
  "odd-label": "Rótulo da odd",
  "vs-divider": "Divisor central (VS)",
  "match-info": "Info do jogo (data · local)",
  "headline": "Manchete",
  "subhead": "Subtítulo",
  "cta": "Call to action",
};

const IMAGE_ROLES = new Set(["hero-art", "game-logo", "team-crest-home", "team-crest-away", "league-badge"]);
const CREST_ROLES = new Set(["team-crest-home", "team-crest-away"]);
const LEAGUE_ROLES = new Set(["league-badge"]);


interface Props {
  format: CreativeFormat;
  ctx: Omit<ApplyReferenceCtx, "format" | "fills">;
  onApply: (layers: Layer[]) => void;
}

export function ApplyLayoutPanel({ format, ctx, onApply }: Props) {
  const [cat, setCat] = useState<ReferenceCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [fills, setFills] = useState<Record<string, Record<string, ReferenceSlotFill>>>({});

  const list = useMemo(() => {
    return CREATIVE_REFERENCES.filter((r) => {
      if (!r.formats.includes(format)) return false;
      if (cat !== "all" && r.category !== cat) return false;
      return true;
    });
  }, [cat, format]);

  const updateFill = (refId: string, role: string, patch: Partial<ReferenceSlotFill>) => {
    setFills((prev) => {
      const cur = prev[refId] || {};
      const existing = cur[role] || { role: role as ReferenceSlotFill["role"] };
      return { ...prev, [refId]: { ...cur, [role]: { ...existing, ...patch } } };
    });
  };

  const apply = (ref: CreativeReference) => {
    const slotFills = Object.values(fills[ref.id] || {});
    const layers = applyReference(ref, { ...ctx, format, fills: slotFills });
    onApply(layers);
    toast.success(`Layout aplicado: ${ref.label}`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="w-3 h-3" /> Aplicar layout
        </Label>
        <span className="text-[10px] text-muted-foreground">{list.length} p/ {format}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border transition-all",
              cat === c.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin -mx-1 px-1">
        {list.length === 0 && (
          <p className="text-[11px] text-muted-foreground px-2 py-3 text-center">
            Nenhum preset para este formato/categoria.
          </p>
        )}
        {list.map((ref) => {
          const isOpen = openId === ref.id;
          const refFills = fills[ref.id] || {};
          return (
            <div key={ref.id} className="border border-border/60 rounded-md overflow-hidden bg-secondary/20">
              <button
                onClick={() => setOpenId(isOpen ? null : ref.id)}
                className="w-full text-left px-2 py-1.5 flex items-start gap-1.5 hover:bg-secondary/40"
              >
                {isOpen ? <ChevronDown className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                        : <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-foreground truncate">{ref.label}</div>
                  <div className="text-[9.5px] text-muted-foreground leading-tight line-clamp-2">
                    {ref.description}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="px-2 pb-2 pt-1 space-y-1.5 border-t border-border/40">
                  {ref.sourceHint && (
                    <div className="text-[10px] text-muted-foreground flex items-start gap-1 bg-background/60 rounded px-1.5 py-1">
                      <Info className="w-3 h-3 mt-0.5 shrink-0 text-primary/80" />
                      <span>{ref.sourceHint}</span>
                    </div>
                  )}
                  {ref.slots.map((s) => {
                    const isImg = IMAGE_ROLES.has(s.role);
                    const fill = refFills[s.role];
                    // Skip UI for slots that will resolve automatically from link
                    const autoFromLink =
                      (s.role === "hero-art" || s.role === "game-logo") && !!ctx.link?.gameIconUrl;
                    return (
                      <div key={s.role + s.xPct} className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {ROLE_LABEL[s.role] || s.role}
                          {autoFromLink && !fill?.imageUrl && (
                            <span className="text-[9px] text-primary/80">(auto: link)</span>
                          )}
                        </Label>
                        <Input
                          value={(isImg ? fill?.imageUrl : fill?.text) || ""}
                          onChange={(e) =>
                            updateFill(ref.id, s.role, isImg ? { imageUrl: e.target.value } : { text: e.target.value })
                          }
                          placeholder={
                            isImg
                              ? autoFromLink ? "Sobrescrever com URL (opcional)" : "https://... (PNG transparente)"
                              : s.role === "odd-value" ? "2.15" : s.role === "cta" ? "APOSTAR AGORA →" : "Digite..."
                          }
                          className="h-7 text-[11px]"
                        />
                      </div>
                    );
                  })}
                  <Button
                    onClick={() => apply(ref)}
                    size="sm"
                    className="w-full h-7 text-[11px] mt-1"
                  >
                    <Wand2 className="w-3 h-3 mr-1.5" /> Aplicar {ref.label}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
