import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Layers } from "lucide-react";
import type { PeriodKey } from "@/hooks/useFinanceiroData";

interface Props {
  period: PeriodKey;
  onPeriodChange: (v: PeriodKey) => void;
  platformId: string;
  onPlatformChange: (v: string) => void;
  platforms: Array<{ id: string; name: string }>;
}

export default function PeriodFilter({ period, onPeriodChange, platformId, onPlatformChange, platforms }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-md border border-border bg-card pl-3 pr-1 py-1">
        <Calendar size={14} className="text-muted-foreground" />
        <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodKey)}>
          <SelectTrigger className="border-0 shadow-none h-7 w-[160px] focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="mtd">Mês atual</SelectItem>
            <SelectItem value="ytd">Ano atual</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-card pl-3 pr-1 py-1">
        <Layers size={14} className="text-muted-foreground" />
        <Select value={platformId} onValueChange={onPlatformChange}>
          <SelectTrigger className="border-0 shadow-none h-7 w-[180px] focus:ring-0">
            <SelectValue placeholder="Todas as plataformas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as plataformas</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
