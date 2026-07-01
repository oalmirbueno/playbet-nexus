import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, BODY, GRADIENT_PRIMARY } from "../theme";
import { BrowserChrome, Cursor, Avatar } from "../components/Chrome";
import { STAGES, KanbanColumn, KanbanCard, KCard } from "../components/Kanban";

const DRAG_CARD: KCard = {
  id: "drag",
  name: "Larissa Vieira",
  handle: "@lari.vieira",
  niche: "esportes",
  progress: 0,
  since: "6h",
};

const CHECKLIST_GROUPS = [
  {
    title: "Perfil do influenciador",
    items: [
      { label: "Nicho principal definido", required: true },
      { label: "Público-alvo validado", required: true },
      { label: "Presença em mais de um canal", required: false },
    ],
  },
  {
    title: "Documentação",
    items: [
      { label: "CPF/CNPJ enviado", required: true },
      { label: "Contrato assinado", required: true },
    ],
  },
  {
    title: "Compliance",
    items: [
      { label: "Sem menção a concorrentes", required: true },
      { label: "Aceita diretrizes de comunicação", required: true },
    ],
  },
];

/**
 * Scene: card is dragged from "Respondeu" to "Checklist" column,
 * then the Sheet slides in from the right showing the checklist
 * with items being progressively checked.
 * Duration: ~240 frames (8s)
 */
export const SceneChecklistDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chromeIn = spring({ frame, fps, config: { damping: 22 } });

  // Board is 7 columns. We need to know screen positions of source (Respondeu, col 1) and target (Checklist, col 2).
  // Board width ≈ 1760 (1920 - 80 padding * 2), 7 cols, 10px gap.
  // Column width ≈ (1760 - 60) / 7 ≈ 243. Columns start at x=80 padding + browser inner 18 padding.
  // We fake the drag over the top of the board with an overlay card whose x transitions.
  //
  // Timing:
  //  0-20: intro to scene, chrome slides up
  //  20-80: cursor moves toward card in "Respondeu"
  //  80-140: card being dragged toward "Checklist"
  //  140-160: dropped; card lands in Checklist
  //  160-220: Sheet slides in from right; items animate check
  //  220-240: hold end

  const cursorX = interpolate(frame, [10, 60, 130, 155], [1500, 640, 940, 940], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorY = interpolate(frame, [10, 60, 130, 155], [280, 620, 620, 620], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Card being dragged (overlay)
  const dragging = frame >= 60 && frame < 155;
  const dragX = interpolate(frame, [60, 140], [600, 895], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dragY = interpolate(frame, [60, 140], [590, 590], { extrapolateLeft: "clamp" });
  const dragRot = interpolate(frame, [60, 90, 140], [0, -3, -1]);

  // Sheet
  const sheetProgress = spring({ frame: frame - 160, fps, config: { damping: 22 } });
  const sheetX = interpolate(sheetProgress, [0, 1], [700, 0]);
  const dim = interpolate(sheetProgress, [0, 1], [0, 0.55]);

  // Progressive checking of items
  const totalItems = CHECKLIST_GROUPS.reduce((n, g) => n + g.items.length, 0);
  const checkedCount = Math.max(0, Math.floor(interpolate(frame, [180, 235], [0, totalItems], { extrapolateRight: "clamp" })));
  let cursor = 0;

  const checklistColIndex = 2; // 0-based
  const respondeuColIndex = 1;

  return (
    <AbsoluteFill style={{ padding: 80 }}>
      <div
        style={{
          height: "100%",
          opacity: chromeIn,
          transform: `translateY(${interpolate(chromeIn, [0, 1], [30, 0])}px)`,
          position: "relative",
        }}
      >
        <BrowserChrome url="painelcentral.playbet.app.br/comercial">
          <div style={{ padding: 18, display: "flex", gap: 10, height: "100%", fontFamily: BODY, position: "relative" }}>
            {STAGES.map((s, i) => {
              const hide = i === respondeuColIndex && dragging ? "drag-source" : undefined;
              const extra = i === checklistColIndex && frame >= 140 ? DRAG_CARD : undefined;
              const targetEmphasize = i === checklistColIndex && frame >= 90 && frame < 170;
              // For source column, inject DRAG_CARD before drag starts so it appears there
              const stage = i === respondeuColIndex
                ? { ...s, cards: [...s.cards, DRAG_CARD] }
                : s;
              return (
                <div key={s.id} style={{ flex: 1, minWidth: 0 }}>
                  <KanbanColumn
                    stage={stage}
                    emphasize={targetEmphasize}
                    extraCard={extra}
                    hideCardId={
                      i === respondeuColIndex && dragging ? DRAG_CARD.id : undefined
                    }
                  />
                </div>
              );
            })}

            {/* Overlay dragged card */}
            {dragging && (
              <div
                style={{
                  position: "absolute",
                  left: dragX,
                  top: dragY,
                  width: 230,
                  transform: `rotate(${dragRot}deg) scale(1.06)`,
                  transformOrigin: "top left",
                  boxShadow: `0 30px 60px -10px rgba(0,0,0,0.7), 0 0 0 2px ${C.violet}55`,
                  borderRadius: 12,
                  zIndex: 20,
                }}
              >
                <KanbanCard card={DRAG_CARD} accent={C.violet} highlight />
              </div>
            )}

            {/* Dim + Sheet overlay */}
            {sheetProgress > 0.001 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `rgba(5,6,14,${dim})`,
                  backdropFilter: "none",
                  zIndex: 25,
                }}
              />
            )}
            {sheetProgress > 0.001 && (
              <SheetChecklist
                translateX={sheetX}
                checkedCount={checkedCount}
                cursorRef={cursor}
              />
            )}
          </div>
        </BrowserChrome>

        {/* Cursor */}
        <Cursor x={cursorX} y={cursorY} />

        {/* Caption bottom-left */}
        <div
          style={{
            position: "absolute",
            left: 40,
            bottom: 30,
            fontFamily: DISPLAY,
            color: C.text,
            zIndex: 60,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: BODY,
              fontSize: 11,
              letterSpacing: 3,
              color: C.primaryGlow,
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {frame < 155 ? "Passo 1" : "Passo 2"}
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, maxWidth: 640 }}>
            {frame < 155
              ? "Arraste o card para “Checklist”…"
              : "…o painel abre e você marca os itens."}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ────────────────────────────────────────────────────────
const SheetChecklist: React.FC<{
  translateX: number;
  checkedCount: number;
  cursorRef: number;
}> = ({ translateX, checkedCount }) => {
  const totalRequired = CHECKLIST_GROUPS.reduce(
    (n, g) => n + g.items.filter((i) => i.required).length,
    0,
  );
  const done = Math.min(checkedCount, totalRequired);
  const pct = Math.round((done / totalRequired) * 100);

  let cursor = 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 640,
        transform: `translateX(${translateX}px)`,
        background: C.surface,
        borderLeft: `1px solid ${C.border}`,
        boxShadow: "-40px 0 80px -20px rgba(0,0,0,0.8)",
        zIndex: 30,
        padding: 28,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar initials="LV" size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: C.text, letterSpacing: -0.3 }}>
            Larissa Vieira
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>@lari.vieira · esportes · etapa: checklist</div>
        </div>
        <div
          style={{
            fontSize: 10,
            color: C.violet,
            padding: "3px 10px",
            borderRadius: 999,
            background: `${C.violet}22`,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          CHECKLIST
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          padding: 3,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 8,
          fontFamily: BODY,
          fontSize: 12,
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            background: C.elevated,
            color: C.text,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Checklist &amp; squad
        </div>
        <div style={{ padding: "8px 12px", color: C.muted, textAlign: "center" }}>Cadastro completo</div>
      </div>

      {/* Progress card */}
      <div style={{ padding: 14, borderRadius: 10, background: C.elevated, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 8 }}>
          <span>Progresso do checklist (obrigatórios)</span>
          <span style={{ color: C.text, fontWeight: 600 }}>
            {done} / {totalRequired} · {pct}%
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              backgroundImage: GRADIENT_PRIMARY,
              boxShadow: `0 0 12px ${C.primary}80`,
            }}
          />
        </div>
      </div>

      {/* Squad */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Squad</div>
          <div
            style={{
              padding: "9px 12px",
              borderRadius: 7,
              background: C.elevated,
              border: `1px solid ${C.border}`,
              color: C.text,
              fontSize: 13,
            }}
          >
            Squad Alpha
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Gerente atribuído</div>
          <div
            style={{
              padding: "9px 12px",
              borderRadius: 7,
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${C.border}`,
              color: C.muted,
              fontSize: 13,
              fontStyle: "italic",
            }}
          >
            Ao aprovar
          </div>
        </div>
      </div>

      {/* Groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, overflow: "hidden" }}>
        {CHECKLIST_GROUPS.map((g) => (
          <div key={g.title}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                color: C.muted,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {g.title}
            </div>
            <div
              style={{
                borderRadius: 10,
                background: C.elevated,
                border: `1px solid ${C.border}`,
                padding: "6px 12px",
              }}
            >
              {g.items.map((it) => {
                const myIdx = cursor++;
                const checked = myIdx < checkedCount;
                return (
                  <div
                    key={it.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 0",
                      borderTop: myIdx > 0 ? `1px solid ${C.borderSoft}` : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: `1.5px solid ${checked ? C.primary : C.border}`,
                        background: checked ? C.primary : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {checked ? "✓" : ""}
                    </div>
                    <div style={{ fontSize: 13, color: checked ? C.text : C.textDim, flex: 1 }}>
                      {it.label}
                      {it.required && <span style={{ color: C.destructive, marginLeft: 4 }}>*</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
