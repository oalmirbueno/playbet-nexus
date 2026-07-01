import { Sparkles } from "lucide-react";

const GAME_VISUALS: Record<string, { label: string; mark: string }> = {
  "fortune-tiger": { label: "Fortune Tiger", mark: "🐯" },
  aviator: { label: "Aviator", mark: "✈️" },
  mines: { label: "Mines", mark: "💎" },
  "sweet-bonanza": { label: "Sweet Bonanza", mark: "🍬" },
  "gates-of-olympus": { label: "Gates of Olympus", mark: "⚡" },
  spaceman: { label: "Spaceman", mark: "🚀" },
  plinko: { label: "Plinko", mark: "●" },
  jetx: { label: "JetX", mark: "🛩️" },
};

const sizeClass = {
  sm: "w-8 h-8 text-base",
  md: "w-10 h-10 text-lg",
  lg: "w-12 h-12 text-xl",
};

export default function GameArtwork({
  slug,
  name,
  iconUrl,
  size = "md",
}: {
  slug?: string | null;
  name?: string | null;
  iconUrl?: string | null;
  size?: keyof typeof sizeClass;
}) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name || "Jogo em alta"}
        className={`${sizeClass[size]} rounded-md object-cover border border-border/40 bg-secondary/40`}
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  const visual = GAME_VISUALS[String(slug || "")] ?? null;
  return (
    <div
      className={`${sizeClass[size]} rounded-md border border-warning/30 bg-warning/10 flex items-center justify-center shadow-sm`}
      role="img"
      aria-label={name || visual?.label || "Jogo em alta"}
    >
      {visual ? <span className="leading-none">{visual.mark}</span> : <Sparkles size={size === "sm" ? 12 : 15} className="text-warning" />}
    </div>
  );
}