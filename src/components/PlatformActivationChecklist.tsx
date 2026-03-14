import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlatformAccounts, usePlatformEventMappings, useTrackingLinks, useTrackingEvents } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { CheckCircle2, Circle, ArrowRight, Rocket } from "lucide-react";

interface Step {
  label: string;
  description: string;
  status: "done" | "pending" | "current";
  path: string;
}

export default function PlatformActivationChecklist() {
  const navigate = useNavigate();
  const { data: platforms } = usePlatforms();
  const { data: accounts } = usePlatformAccounts();
  const { data: mappings } = usePlatformEventMappings();
  const { data: links } = useTrackingLinks();
  const { data: events } = useTrackingEvents();

  const realPlatforms = (platforms as any[]).filter((p: any) => !p.is_demo);
  const realAccounts = accounts.filter(a => !a.is_demo);
  const realMappings = mappings.filter(m => !m.is_demo);
  const realLinks = links.filter(l => !l.is_demo);
  const realEvents = events.filter(e => !e.is_demo);

  const steps = useMemo((): Step[] => {
    const hasPlatform = realPlatforms.length > 0;
    const hasAccount = realAccounts.length > 0;
    const hasMapping = realMappings.length > 0;
    const hasLink = realLinks.length > 0;
    const hasEvent = realEvents.length > 0;
    const hasFtd = realEvents.some(e => e.canonical_event_name === "ftd");

    const items: Step[] = [
      { label: "Cadastrar plataforma", description: "Registre a casa/plataforma de afiliado", status: hasPlatform ? "done" : "current", path: "/plataformas" },
      { label: "Cadastrar conta", description: "Crie a conta com modelo de comissão e dados do gerente", status: hasAccount ? "done" : hasPlatform ? "current" : "pending", path: "/tracking/accounts" },
      { label: "Configurar mapeamento", description: "Traduza eventos raw para o schema canônico", status: hasMapping ? "done" : hasAccount ? "current" : "pending", path: "/tracking/mappings" },
      { label: "Gerar tracking link", description: "Crie links rastreáveis com tracking_code", status: hasLink ? "done" : hasMapping ? "current" : "pending", path: "/tracking/links" },
      { label: "Configurar postback na plataforma", description: "Cole a URL de postback no painel da casa", status: hasEvent ? "done" : hasLink ? "current" : "pending", path: "/tracking/links" },
      { label: "Testar postback", description: "Envie um evento de teste e confira a chegada", status: hasEvent ? "done" : hasLink ? "current" : "pending", path: "/tracking/events" },
      { label: "Validar evento em /tracking/events", description: "Confira se o evento foi mapeado e processado", status: hasEvent ? "done" : "pending", path: "/tracking/events" },
      { label: "Conferir impacto no dashboard", description: "Verifique KPIs e funil no dashboard principal", status: hasFtd ? "done" : hasEvent ? "current" : "pending", path: "/tracking" },
    ];

    return items;
  }, [realPlatforms, realAccounts, realMappings, realLinks, realEvents]);

  const doneCount = steps.filter(s => s.status === "done").length;
  const progress = Math.round((doneCount / steps.length) * 100);

  if (doneCount === steps.length) return null; // All done, hide checklist

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket size={16} className="text-primary" />
            <CardTitle className="text-sm">Ativação da Plataforma Real</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">{doneCount}/{steps.length} concluídos</Badge>
        </div>
        <div className="w-full bg-secondary/50 rounded-full h-1.5 mt-2">
          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                step.status === "current" ? "bg-primary/5 border border-primary/20" : "hover:bg-secondary/30"
              }`}
              onClick={() => navigate(step.path)}
            >
              {step.status === "done" ? (
                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
              ) : (
                <Circle size={16} className={`shrink-0 ${step.status === "current" ? "text-primary" : "text-muted-foreground/30"}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${step.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>{step.label}</p>
                <p className="text-[10px] text-muted-foreground">{step.description}</p>
              </div>
              {step.status === "current" && <ArrowRight size={14} className="text-primary shrink-0" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
