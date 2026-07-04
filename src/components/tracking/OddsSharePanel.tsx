import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Sigma } from "lucide-react";
import { computeTotalOdd, type OddsBetType, type OddsSelection } from "@/services/trackingLinkOddsService";

export interface OddsPanelValue {
  bet_type: OddsBetType;
  total_odd: number | null;
  stake_suggested: number | null;
  selections: OddsSelection[];
  bookmaker_share_url: string;
  event_label: string;
  event_starts_at: string;
  notes: string;
}

export const emptyOddsValue: OddsPanelValue = {
  bet_type: "single",
  total_odd: null,
  stake_suggested: null,
  selections: [{ event: "", market: "", pick: "", odd: 0 }],
  bookmaker_share_url: "",
  event_label: "",
  event_starts_at: "",
  notes: "",
};

interface Props {
  value: OddsPanelValue;
  onChange: (next: OddsPanelValue) => void;
  disabled?: boolean;
}

export default function OddsSharePanel({ value, onChange, disabled }: Props) {
  const [local, setLocal] = useState<OddsPanelValue>(value);
  useEffect(() => setLocal(value), [value]);

  const emit = (next: OddsPanelValue) => { setLocal(next); onChange(next); };

  const setField = <K extends keyof OddsPanelValue>(k: K, v: OddsPanelValue[K]) =>
    emit({ ...local, [k]: v });

  const setSel = (i: number, patch: Partial<OddsSelection>) => {
    const sels = local.selections.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    const auto = local.bet_type === "single" ? Number(sels[0]?.odd || 0) : computeTotalOdd(sels);
    emit({ ...local, selections: sels, total_odd: auto || local.total_odd });
  };
  const addSel = () => emit({ ...local, selections: [...local.selections, { event: "", market: "", pick: "", odd: 0 }] });
  const rmSel = (i: number) => {
    const sels = local.selections.filter((_, idx) => idx !== i);
    const auto = local.bet_type === "single" ? Number(sels[0]?.odd || 0) : computeTotalOdd(sels);
    emit({ ...local, selections: sels.length ? sels : [{ event: "", market: "", pick: "", odd: 0 }], total_odd: auto || null });
  };

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Sigma size={13} className="text-primary" />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">Aposta compartilhada</span>
        <span className="text-[10px] text-muted-foreground">Estes dados alimentam o relatório, o material e a LP.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Tipo de aposta</Label>
          <Select value={local.bet_type} onValueChange={v => setField("bet_type", v as OddsBetType)} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Simples</SelectItem>
              <SelectItem value="multipla">Múltipla</SelectItem>
              <SelectItem value="sistema">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Odd total</Label>
          <Input
            type="number" step="0.01" inputMode="decimal"
            className="h-8 text-xs font-mono"
            value={local.total_odd ?? ""}
            onChange={e => setField("total_odd", e.target.value === "" ? null : Number(e.target.value))}
            disabled={disabled}
            placeholder="Auto (produto das odds)"
          />
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Stake sugerida (R$)</Label>
          <Input
            type="number" step="0.01" inputMode="decimal"
            className="h-8 text-xs font-mono"
            value={local.stake_suggested ?? ""}
            onChange={e => setField("stake_suggested", e.target.value === "" ? null : Number(e.target.value))}
            disabled={disabled}
            placeholder="opcional"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">URL da odd compartilhada (bookmaker)</Label>
        <Input
          className="h-8 text-xs font-mono"
          value={local.bookmaker_share_url}
          onChange={e => setField("bookmaker_share_url", e.target.value)}
          disabled={disabled}
          placeholder="https://…/bet-share/…"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Evento principal</Label>
          <Input
            className="h-8 text-xs"
            value={local.event_label}
            onChange={e => setField("event_label", e.target.value)}
            disabled={disabled}
            placeholder="Ex: Flamengo x Palmeiras"
          />
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Início do evento</Label>
          <Input
            type="datetime-local"
            className="h-8 text-xs"
            value={local.event_starts_at}
            onChange={e => setField("event_starts_at", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Seleções ({local.selections.length})</Label>
          <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addSel} disabled={disabled}>
            <Plus size={10} /> Adicionar perna
          </Button>
        </div>
        {local.selections.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_80px_28px] gap-1.5 items-center">
            <Input className="h-8 text-xs" placeholder="Evento" value={s.event} onChange={e => setSel(i, { event: e.target.value })} disabled={disabled} />
            <Input className="h-8 text-xs" placeholder="Mercado" value={s.market} onChange={e => setSel(i, { market: e.target.value })} disabled={disabled} />
            <Input className="h-8 text-xs" placeholder="Seleção" value={s.pick} onChange={e => setSel(i, { pick: e.target.value })} disabled={disabled} />
            <Input className="h-8 text-xs font-mono" type="number" step="0.01" inputMode="decimal" placeholder="Odd" value={s.odd || ""} onChange={e => setSel(i, { odd: Number(e.target.value) || 0 })} disabled={disabled} />
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => rmSel(i)} disabled={disabled || local.selections.length <= 1}>
              <Trash2 size={12} />
            </Button>
          </div>
        ))}
        <div className="text-[10px] text-muted-foreground">
          Produto das odds: <span className="font-mono text-foreground">{computeTotalOdd(local.selections).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
