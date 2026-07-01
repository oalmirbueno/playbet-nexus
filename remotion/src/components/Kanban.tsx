import { C, DISPLAY, BODY } from "../theme";
import { Avatar } from "./Chrome";

export interface KCard {
  id: string;
  name: string;
  handle: string;
  niche: string;
  progress: number;
  since: string;
  squad?: string;
}

export interface KStage {
  id: string;
  label: string;
  accent: string; // color
  cards: KCard[];
}

// Match the real palette from ComercialPipeline.tsx STAGES
export const STAGES: KStage[] = [
  {
    id: "em_contato",
    label: "Em contato",
    accent: C.slate,
    cards: [
      { id: "c1", name: "Ana Reis", handle: "@ana.reis", niche: "esportes", progress: 0, since: "2d" },
      { id: "c2", name: "Bruno Melo", handle: "@bruno_bet", niche: "cassino", progress: 0, since: "3d" },
      { id: "c3", name: "Camila Souza", handle: "@camisouza", niche: "lifestyle", progress: 0, since: "1d" },
    ],
  },
  {
    id: "respondeu",
    label: "Respondeu",
    accent: C.sky,
    cards: [
      { id: "r1", name: "Diego Fonseca", handle: "@diegof", niche: "esportes", progress: 0, since: "4h" },
      { id: "r2", name: "Elis Ramos", handle: "@elisramos", niche: "esportes", progress: 0, since: "1d" },
    ],
  },
  {
    id: "checklist",
    label: "Checklist",
    accent: C.violet,
    cards: [
      { id: "ck1", name: "Felipe Alves", handle: "@felipe_bet", niche: "cassino", progress: 60, since: "5h" },
    ],
  },
  {
    id: "cadastro",
    label: "Cadastro",
    accent: C.indigo,
    cards: [
      { id: "cd1", name: "Gabriela T.", handle: "@gabi_bet", niche: "esportes", progress: 100, since: "2h" },
    ],
  },
  {
    id: "analise",
    label: "Análise",
    accent: C.warning,
    cards: [
      { id: "an1", name: "Henrique L.", handle: "@henri_bet", niche: "cassino", progress: 100, since: "1h" },
    ],
  },
  {
    id: "aprovado",
    label: "Aprovado",
    accent: C.success,
    cards: [
      { id: "ap1", name: "Isabela M.", handle: "@isamora", niche: "lifestyle", progress: 100, since: "3h", squad: "Squad Alpha" },
    ],
  },
  {
    id: "concluido",
    label: "Concluído",
    accent: C.primary,
    cards: [
      { id: "co1", name: "João P.", handle: "@joaop_bet", niche: "esportes", progress: 100, since: "1d", squad: "Squad Beta" },
      { id: "co2", name: "Karla V.", handle: "@karlav", niche: "cassino", progress: 100, since: "5d", squad: "Squad Alpha" },
    ],
  },
];

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const KanbanCard: React.FC<{ card: KCard; accent: string; highlight?: boolean; ghost?: boolean }> = ({
  card,
  accent,
  highlight,
  ghost,
}) => (
  <div
    style={{
      borderRadius: 10,
      background: ghost ? "transparent" : C.surface,
      border: `1px solid ${highlight ? accent : C.border}`,
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      boxShadow: highlight
        ? `0 0 0 2px ${accent}55, 0 16px 40px -12px ${accent}66`
        : "0 1px 0 rgba(255,255,255,0.02) inset",
      opacity: ghost ? 0.35 : 1,
      fontFamily: BODY,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ color: C.muted, fontSize: 12, lineHeight: 0 }}>⋮⋮</div>
      <Avatar initials={initials(card.name)} size={26} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, lineHeight: 1.15 }}>
          {card.name}
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.2 }}>{card.handle}</div>
      </div>
    </div>

    {card.niche && (
      <div
        style={{
          alignSelf: "flex-start",
          fontSize: 9.5,
          color: C.textDim,
          padding: "2px 7px",
          borderRadius: 4,
          border: `1px solid ${C.border}`,
          background: "rgba(255,255,255,0.02)",
          textTransform: "lowercase",
        }}
      >
        {card.niche}
      </div>
    )}

    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.muted, marginBottom: 4 }}>
        <span>Checklist</span>
        <span>{card.progress}%</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${card.progress}%`, background: accent, boxShadow: `0 0 8px ${accent}` }} />
      </div>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.muted }}>
      <span>◷ {card.since}</span>
      {card.squad && <span style={{ color: accent }}>◆ {card.squad}</span>}
    </div>
  </div>
);

export const KanbanColumn: React.FC<{
  stage: KStage;
  scale?: number;
  emphasize?: boolean;
  extraCard?: KCard | null;
  hideCardId?: string;
}> = ({ stage, emphasize, extraCard, hideCardId }) => (
  <div
    style={{
      flex: 1,
      minWidth: 0,
      borderRadius: 12,
      background: `linear-gradient(180deg, ${stage.accent}12, transparent 40%)`,
      border: `1px solid ${emphasize ? stage.accent : C.border}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxShadow: emphasize ? `0 0 0 2px ${stage.accent}44, 0 20px 60px -16px ${stage.accent}55` : "none",
    }}
  >
    <div
      style={{
        padding: "8px 12px",
        background: `linear-gradient(180deg, ${stage.accent}22, transparent)`,
        borderBottom: `1px solid ${C.borderSoft}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: DISPLAY,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: 999, background: stage.accent, boxShadow: `0 0 8px ${stage.accent}` }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: C.text, letterSpacing: 0.6, textTransform: "uppercase" }}>
          {stage.label}
        </span>
      </div>
      <span
        style={{
          fontSize: 10,
          color: C.muted,
          padding: "1px 8px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.05)",
        }}
      >
        {stage.cards.filter((c) => c.id !== hideCardId).length + (extraCard ? 1 : 0)}
      </span>
    </div>
    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, minHeight: 100 }}>
      {stage.cards
        .filter((c) => c.id !== hideCardId)
        .map((c) => (
          <KanbanCard key={c.id} card={c} accent={stage.accent} />
        ))}
      {extraCard && <KanbanCard card={extraCard} accent={stage.accent} highlight />}
    </div>
  </div>
);
