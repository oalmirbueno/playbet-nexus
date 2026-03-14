import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlatformAccounts, usePlatformEventMappings, useTrackingLinks, useTrackingEvents } from "@/hooks/useTrackingData";
import { usePlatforms, useLandingPageInstances } from "@/hooks/useSupabaseQuery";
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
  const { data: lpInstances } = useLandingPageInstances();

  const hasPlatform = (platforms as any[]).some((p: any) => !p.is_demo);
  const hasAccount = accounts.some(a => !a.is_demo);
  const hasInstance = (lpInstances as any[]).some((i: any) => !i.is_demo);
  const hasMapping = mappings.some(m => !m.is_demo);
  const hasLink = links.some(l => !l.is_demo);
  const hasRealEvent = events.some(e => !e.is_demo && !e.click_id?.startsWith("{"));
  const hasValidEvent = events.some(e => !e.is_demo && !e.click_id?.startsWith("{") && e.canonical_event_name !== "{event}");
  const hasFtd = events.some(e => !e.is_demo && e.canonical_event_name === "ftd");

  const steps = useMemo((): Step[] => {
    const getStatus = (done: boolean, prevDone: boolean): "done" | "pending" | "current" =>
      done ? "done" : prevDone ? "current" : "pending";

    return [
      { label: "Cadastrar plataforma", description: "Registre a casa/plataforma de afiliado", status: getStatus(hasPlatform, true), path: "/plataformas" },
      { label: "Cadastrar conta", description: "Crie a conta com modelo de comissão", status: getStatus(hasAccount, hasPlatform), path: "/tracking/accounts" },
      { label: "Vincular instância/slug", description: "Conecte influencer à LP com affiliate link", status: getStatus(hasInstance, hasAccount), path: "/landing-pages" },
      { label: "Configurar mapeamento", description: "Traduza eventos raw para o schema canônico", status: getStatus(hasMapping, hasAccount), path: "/tracking/mappings" },
      { label: "Gerar tracking link", description: "Crie links rastreáveis com tracking_code", status: getStatus(hasLink, hasMapping), path: "/tracking/links" },
      { label: "Receber evento real", description: "Evento de postback recebido e processado", status: getStatus(hasRealEvent, hasLink), path: "/tracking/events" },
      { label: "Validar evento processado", description: "Evento mapeado corretamente no sistema", status: getStatus(hasValidEvent, hasRealEvent), path: "/tracking/events" },
      { label: "Primeiro FTD registrado", description: "Confirme conversão real no dashboard", status: getStatus(hasFtd, hasValidEvent), path: "/tracking" },
    ];
  }, [hasPlatform, hasAccount, hasInstance, hasMapping, hasLink, hasRealEvent, hasValidEvent, hasFtd]);

  const doneCount = steps.filter(s => s.status === "done").length;
  const progress = Math.round((doneCount / steps.length) * 100);

  // Hide completely when all done OR when 6+ steps done (infra is mostly ready)
  if (doneCount >= 6) return null;

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
          {steps.filter(s => s.status !== "done").map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                step.status === "current" ? "bg-primary/5 border border-primary/20" : "hover:bg-secondary/30"
              }`}
              onClick={() => navigate(step.path)}
            >
              <Circle size={16} className={`shrink-0 ${step.status === "current" ? "text-primary" : "text-muted-foreground/30"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{step.label}</p>
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
