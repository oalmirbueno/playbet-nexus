import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, BODY } from "../theme";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeIn = spring({ frame, fps, config: { damping: 18, stiffness: 160 } });
  const titleIn = spring({ frame: frame - 8, fps, config: { damping: 20, stiffness: 140 } });
  const subIn = spring({ frame: frame - 22, fps, config: { damping: 22, stiffness: 120 } });

  const words = ["Pipeline", "Squads", "Qualificação"];

  return (
    <AbsoluteFill style={{ padding: "0 140px", justifyContent: "center", fontFamily: DISPLAY }}>
      <div
        style={{
          transform: `translateY(${interpolate(badgeIn, [0, 1], [24, 0])}px)`,
          opacity: badgeIn,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px",
          borderRadius: 999,
          background: "rgba(91,140,255,0.12)",
          border: `1px solid ${C.primary}40`,
          width: "fit-content",
          fontFamily: BODY,
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: C.primaryGlow,
          marginBottom: 28,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: C.primary }} />
        PlayBet · Painel Comercial
      </div>

      <div
        style={{
          fontSize: 128,
          fontWeight: 600,
          letterSpacing: -3,
          color: C.text,
          lineHeight: 0.98,
          transform: `translateY(${interpolate(titleIn, [0, 1], [40, 0])}px)`,
          opacity: titleIn,
        }}
      >
        Tutorial rápido
      </div>
      <div
        style={{
          fontSize: 128,
          fontWeight: 700,
          letterSpacing: -3,
          lineHeight: 0.98,
          background: `linear-gradient(90deg, ${C.primary}, ${C.primaryGlow})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          transform: `translateY(${interpolate(titleIn, [0, 1], [40, 0])}px)`,
          opacity: titleIn,
        }}
      >
        Comercial
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 44,
          opacity: subIn,
          transform: `translateY(${interpolate(subIn, [0, 1], [20, 0])}px)`,
        }}
      >
        {words.map((w, i) => {
          const chipIn = spring({ frame: frame - 26 - i * 6, fps, config: { damping: 20 } });
          return (
            <div
              key={w}
              style={{
                fontFamily: BODY,
                fontSize: 18,
                fontWeight: 500,
                padding: "10px 20px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.border}`,
                color: C.text,
                opacity: chipIn,
                transform: `translateY(${interpolate(chipIn, [0, 1], [12, 0])}px)`,
              }}
            >
              0{i + 1} · {w}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
