import { ImageIcon } from "lucide-react";

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

  const initials = String(name || slug || "JG")
    .split(/\s+|-/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "JG";

  return (
    <div
      className={`${sizeClass[size]} rounded-md border border-border/60 bg-secondary/60 flex items-center justify-center shadow-sm overflow-hidden`}
      role="img"
      aria-label={name || "Jogo em alta sem imagem"}
    >
      <span className="flex flex-col items-center justify-center gap-0.5 leading-none text-muted-foreground">
        <ImageIcon size={size === "sm" ? 10 : 12} strokeWidth={1.7} />
        <span className="text-[8px] font-semibold tracking-normal">{initials}</span>
      </span>
    </div>
  );
}