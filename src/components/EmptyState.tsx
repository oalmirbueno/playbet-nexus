import { LucideIcon, Plus } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  compact?: boolean;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction, secondaryLabel, onSecondary, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-12 px-6" : "py-20 px-8"}`}>
      <div className="w-14 h-14 rounded-2xl bg-secondary/60 border border-border flex items-center justify-center mb-5">
        <Icon size={24} className="text-muted-foreground/50" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">{description}</p>
      {(actionLabel || secondaryLabel) && (
        <div className="flex items-center gap-3 mt-5">
          {actionLabel && onAction && (
            <button className="btn-primary text-xs" onClick={onAction}>
              <Plus size={13} /> {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button className="btn-ghost text-xs" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
