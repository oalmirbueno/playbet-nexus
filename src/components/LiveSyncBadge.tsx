import { Radio } from "lucide-react";

export default function LiveSyncBadge({ lastSyncedAt }: { lastSyncedAt: Date | null }) {
  const label = lastSyncedAt
    ? `Sincronizado às ${lastSyncedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : "Ao vivo";
  return (
    <span
      title={label}
      className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] px-2 py-1 rounded-full bg-success/10 text-success border border-success/20"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
      </span>
      <Radio size={10} /> Ao vivo
    </span>
  );
}
