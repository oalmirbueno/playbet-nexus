import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { findPresetByName, buildPostbackUrlForEvent, EVENT_LABELS, type PlatformPreset } from "@/config/platformPresets";

interface Props {
  platformName: string;
  trackingCode: string;
  influencerId?: string;
  campanhaId?: string;
}

export default function PostbackEventBlocks({ platformName, trackingCode, influencerId, campanhaId }: Props) {
  const preset = findPresetByName(platformName);
  const { toast } = useToast();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!preset) {
    return (
      <div className="text-xs text-muted-foreground italic py-2">
        Nenhum preset encontrado para "{platformName}". Configure os postbacks manualmente na tela de Mapeamentos.
      </div>
    );
  }

  const copy = (url: string, idx: number, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedIdx(idx);
    toast({ title: `Postback de ${label} copiado!` });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-semibold text-foreground">Postbacks por Evento</p>
        <Badge variant="secondary" className="text-[9px]">{preset.label}</Badge>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">
        Cole cada URL no painel da plataforma, no evento correspondente. Os macros entre {"{ }"} serão substituídos automaticamente pela plataforma.
      </p>
      {preset.events.map((evt, idx) => {
        const url = buildPostbackUrlForEvent(preset, evt, trackingCode, influencerId, campanhaId);
        const label = EVENT_LABELS[evt.canonical_event_name] || evt.canonical_event_name;
        const isCopied = copiedIdx === idx;

        return (
          <div key={idx} className="border rounded-md p-2.5 space-y-1 bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] font-mono">{evt.raw_event_name}</Badge>
                <span className="text-[10px] text-muted-foreground">→</span>
                <span className="text-[10px] font-medium">{label}</span>
              </div>
              <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 shrink-0" onClick={() => copy(url, idx, label)}>
                {isCopied ? <Check size={10} className="mr-1 text-green-500" /> : <Copy size={10} className="mr-1" />}
                Copiar
              </Button>
            </div>
            <code className="block bg-secondary/50 rounded px-2 py-1.5 text-[10px] font-mono break-all leading-relaxed">
              {url}
            </code>
          </div>
        );
      })}
    </div>
  );
}
