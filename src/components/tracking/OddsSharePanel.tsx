import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Sigma, Wand2, ImagePlus, Loader2 } from "lucide-react";
import { computeTotalOdd, type OddsBetType, type OddsSelection } from "@/services/trackingLinkOddsService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OddsPanelValue {
  bet_type: OddsBetType;
  total_odd: number | null;
  stake_suggested: number | null;
  selections: OddsSelection[];
  bookmaker_share_url: string;
  screenshot_url: string;
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
  screenshot_url: "",
  event_label: "",
  event_starts_at: "",
  notes: "",
};

interface Props {
  value: OddsPanelValue;
  onChange: (next: OddsPanelValue) => void;
  disabled?: boolean;
}

// Merge inteligente: nunca sobrescreve campo já preenchido pelo usuário.
function smartMerge(prev: OddsPanelValue, draft: Partial<OddsPanelValue>): OddsPanelValue {
  const next: OddsPanelValue = { ...prev };
  if (draft.bookmaker_share_url && !prev.bookmaker_share_url) next.bookmaker_share_url = draft.bookmaker_share_url;
  if (draft.screenshot_url && !prev.screenshot_url) next.screenshot_url = draft.screenshot_url;
  if (draft.event_label && !prev.event_label) next.event_label = draft.event_label;
  if (draft.event_starts_at && !prev.event_starts_at) next.event_starts_at = draft.event_starts_at;
  if (draft.notes && !prev.notes) next.notes = draft.notes;
  if (draft.bet_type && prev.bet_type === "single" && draft.bet_type !== "single") next.bet_type = draft.bet_type;
  if (draft.total_odd && !prev.total_odd) next.total_odd = draft.total_odd;
  if (draft.stake_suggested && !prev.stake_suggested) next.stake_suggested = draft.stake_suggested;
  const hasUserSelections = prev.selections.some(s => (s.pick || s.event) && s.odd);
  if (draft.selections?.length && !hasUserSelections) next.selections = draft.selections;
  return next;
}

export default function OddsSharePanel({ value, onChange, disabled }: Props) {
  const [local, setLocal] = useState<OddsPanelValue>(value);
  const [smartInput, setSmartInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const runSmartParse = async (text?: string) => {
    const payloadText = (text ?? smartInput).trim();
    if (!payloadText) { toast.error("Cole o link, o texto do bilhete ou solte uma imagem"); return; }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-odds-share", {
        body: { text: payloadText },
      });
      if (error) throw error;
      const draft = (data as any)?.draft as Partial<OddsPanelValue> | undefined;
      if (!draft) throw new Error("resposta_invalida");
      const merged = smartMerge(local, draft);
      // Se veio selections novas, garante array não vazio no editor
      if (!merged.selections.length) merged.selections = [{ event: "", market: "", pick: "", odd: 0 }];
      emit(merged);
      const parts: string[] = [];
      if (draft.selections?.length) parts.push(`${draft.selections.length} seleção(ões)`);
      if (draft.total_odd) parts.push(`odd ${draft.total_odd}`);
      if (draft.event_label) parts.push(draft.event_label);
      toast.success(parts.length ? `Bilhete lido: ${parts.join(" · ")}` : "Nenhum dado novo extraído");
    } catch (e: any) {
      toast.error("Não consegui ler o bilhete", { description: e?.message ?? String(e) });
    } finally {
      setParsing(false);
    }
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Arquivo precisa ser uma imagem"); return; }
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(file);
      });
      emit({ ...local, screenshot_url: dataUrl });
      toast.success("Print do bilhete carregado");
    } catch (e: any) {
      toast.error("Falha ao ler imagem", { description: e?.message ?? String(e) });
    } finally {
      setUploadingImage(false);
    }
  };

  const onSmartPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Arquivo/imagem na área de transferência → vai pro screenshot; texto continua no textarea.
    const items = Array.from(e.clipboardData?.items ?? []);
    const imgItem = items.find(it => it.kind === "file" && it.type.startsWith("image/"));
    if (imgItem) {
      const file = imgItem.getAsFile();
      if (file) { e.preventDefault(); await handleImageFile(file); }
    }
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dropRef.current?.classList.remove("ring-2", "ring-primary");
    const dt = e.dataTransfer;
    const file = Array.from(dt.files).find(f => f.type.startsWith("image/"));
    if (file) { await handleImageFile(file); return; }
    const text = dt.getData("text");
    if (text) {
      setSmartInput(prev => (prev ? `${prev}\n${text}` : text));
      await runSmartParse(text);
    }
  };

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Sigma size={13} className="text-primary" />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">Aposta compartilhada</span>
        <span className="text-[10px] text-muted-foreground">Cole link + texto do bilhete e o painel preenche sozinho.</span>
      </div>

      {/* Smart paste engine */}
      <div
        ref={dropRef}
        onDragOver={e => { e.preventDefault(); dropRef.current?.classList.add("ring-2", "ring-primary"); }}
        onDragLeave={() => dropRef.current?.classList.remove("ring-2", "ring-primary")}
        onDrop={onDrop}
        className="rounded-md border border-dashed border-primary/40 bg-background/40 p-2 space-y-2 transition"
      >
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Wand2 size={11} className="text-primary" /> Colar bilhete (link + texto + imagem)
          </Label>
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleImageFile(f); e.currentTarget.value = ""; }}
            />
            <Button
              type="button" size="sm" variant="ghost"
              className="h-7 text-[10px] gap-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploadingImage}
            >
              {uploadingImage ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />}
              Imagem
            </Button>
            <Button
              type="button" size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={() => runSmartParse()}
              disabled={disabled || parsing || !smartInput.trim()}
            >
              {parsing ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
              Puxar automático
            </Button>
          </div>
        </div>
        <Textarea
          rows={3}
          className="text-xs font-mono resize-y"
          placeholder="Cole aqui: link do bilhete da casa + texto do palpite (ex: 'Flamengo x Palmeiras — Mais 2.5 gols @ 1.85') + arraste a imagem do print."
          value={smartInput}
          onPaste={onSmartPaste}
          onChange={e => setSmartInput(e.target.value)}
          disabled={disabled}
        />
        <p className="text-[9px] text-muted-foreground leading-snug">
          A engine separa link da casa, print e seleções automaticamente. Campos já preenchidos por você não são sobrescritos.
        </p>
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

      <div className="space-y-1.5">
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Print do bilhete (URL ou imagem)</span>
          {local.screenshot_url && (
            <button
              type="button"
              className="text-[9px] text-muted-foreground hover:text-destructive"
              onClick={() => setField("screenshot_url", "")}
              disabled={disabled}
            >
              limpar
            </button>
          )}
        </Label>
        <Input
          className="h-8 text-xs font-mono"
          value={local.screenshot_url}
          onChange={e => setField("screenshot_url", e.target.value)}
          disabled={disabled}
          placeholder="https://…/print-bilhete.png ou arraste a imagem acima"
        />
        {local.screenshot_url && (
          <div className="mt-1 rounded border border-border/60 bg-background/40 p-1">
            <img
              src={local.screenshot_url}
              alt="Print do bilhete"
              className="max-h-32 w-auto mx-auto object-contain"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
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
