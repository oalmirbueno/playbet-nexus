import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Copy, Check, CheckCircle2, AlertTriangle, Info, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  findPresetByName,
  buildPostbackUrlForEvent,
  validatePostbackUrl,
  MACRO_CATEGORY_LABELS,
  type PlatformPreset,
  type MacroCategory,
} from "@/config/platformPresets";

interface Props {
  platformName: string;
  trackingCode?: string;
  influencerId?: string;
  campanhaId?: string;
}

export default function PostbackEventBlocks({ platformName, trackingCode, influencerId, campanhaId }: Props) {
  const preset = findPresetByName(platformName);
  const { toast } = useToast();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showMacroLegend, setShowMacroLegend] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  if (!preset) {
    return (
      <div className="text-xs text-muted-foreground italic py-2">
        Nenhum preset encontrado para "{platformName}". Configure os postbacks manualmente na tela de Mapeamentos.
      </div>
    );
  }

  const cleanTrackingCode = trackingCode && !trackingCode.includes("(") && trackingCode !== "none" ? trackingCode : undefined;
  const cleanInfluencer = influencerId && influencerId !== "none" ? influencerId : undefined;
  const cleanCampanha = campanhaId && campanhaId !== "none" ? campanhaId : undefined;

  const allUrls = preset.events.map(evt =>
    buildPostbackUrlForEvent(preset, evt, cleanTrackingCode, cleanInfluencer, cleanCampanha, advancedMode)
  );
  const allValidations = allUrls.map(url =>
    validatePostbackUrl(preset, url, cleanTrackingCode)
  );
  const allValid = allValidations.every(v => v.valid);
  const hasWarnings = allValidations.some(v => v.warnings.length > 0);

  const copy = (url: string, idx: number, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedIdx(idx);
    toast({ title: `Postback de ${label} copiado!` });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Group macros by category
  const macrosByCategory = preset.supported_macros.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {} as Record<MacroCategory, typeof preset.supported_macros>);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-foreground">Postbacks por Evento</p>
          <Badge variant="secondary" className="text-[9px]">{preset.label}</Badge>
          {allValid && !hasWarnings ? (
            <Badge variant="outline" className="text-[9px] border-green-500/40 text-green-600">
              <CheckCircle2 size={9} className="mr-0.5" /> Pronto
            </Badge>
          ) : allValid && hasWarnings ? (
            <Badge variant="outline" className="text-[9px] border-yellow-500/40 text-yellow-600">
              <AlertTriangle size={9} className="mr-0.5" /> Parcial
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] border-destructive/40 text-destructive">
              <AlertTriangle size={9} className="mr-0.5" /> Inválido
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Settings2 size={10} className="text-muted-foreground" />
          <Label htmlFor="adv-mode" className="text-[10px] text-muted-foreground cursor-pointer">Avançado</Label>
          <Switch id="adv-mode" checked={advancedMode} onCheckedChange={setAdvancedMode} className="scale-75" />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mb-1">
        Cole cada URL no painel da {preset.label}, no evento correspondente.
        {advancedMode
          ? " Modo avançado: inclui macros de debug e reconciliação."
          : " Os macros entre { } são nativos da plataforma."}
      </p>

      {/* Macro legend toggle */}
      <button
        onClick={() => setShowMacroLegend(!showMacroLegend)}
        className="flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
      >
        <Info size={10} />
        {showMacroLegend ? "Ocultar" : "Ver"} macros da {preset.label} e seus significados
      </button>

      {showMacroLegend && (
        <div className="border rounded-md p-2.5 bg-muted/30 space-y-3">
          {(Object.keys(macrosByCategory) as MacroCategory[]).map(cat => (
            <div key={cat}>
              <p className="text-[10px] font-semibold text-foreground mb-1">
                {MACRO_CATEGORY_LABELS[cat]}
                {cat === "origin" && (
                  <Badge variant="outline" className="text-[7px] ml-1.5 h-3 px-1 border-muted-foreground/30">avançado</Badge>
                )}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {macrosByCategory[cat].map(m => (
                  <div key={m.native} className="flex items-center gap-1.5 text-[10px]">
                    <code className="font-mono text-primary bg-primary/10 rounded px-1">{`{${m.native}}`}</code>
                    <span className="text-muted-foreground">→</span>
                    <span>{m.description}</span>
                    {m.required && (
                      <Badge variant="outline" className="text-[7px] h-3 px-1 border-primary/30 text-primary">obr.</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event blocks */}
      {preset.events.map((evt, idx) => {
        const url = allUrls[idx];
        const validation = allValidations[idx];
        const isCopied = copiedIdx === idx;

        return (
          <div key={idx} className={`border rounded-md p-2.5 space-y-1 ${
            validation.valid ? "bg-muted/20" : "bg-destructive/5 border-destructive/20"
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] font-mono">{evt.raw_event_name}</Badge>
                <span className="text-[10px] text-muted-foreground">→</span>
                <span className="text-[10px] font-medium">{evt.label}</span>
                {validation.valid && (
                  <CheckCircle2 size={10} className="text-green-500" />
                )}
                {advancedMode && evt.advanced_macros.length > 0 && (
                  <Badge variant="outline" className="text-[7px] h-3 px-1 border-muted-foreground/30">+debug</Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2 shrink-0"
                onClick={() => copy(url, idx, evt.label)}
                disabled={!validation.valid}
              >
                {isCopied ? <Check size={10} className="mr-1 text-green-500" /> : <Copy size={10} className="mr-1" />}
                Copiar
              </Button>
            </div>
            <code className="block bg-secondary/50 rounded px-2 py-1.5 text-[10px] font-mono break-all leading-relaxed select-all">
              {url}
            </code>
            {validation.errors.length > 0 && (
              <div className="text-[9px] text-destructive space-y-0.5">
                {validation.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <AlertTriangle size={8} /> {err}
                  </div>
                ))}
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="text-[9px] text-yellow-600 space-y-0.5">
                {validation.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Info size={8} /> {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
