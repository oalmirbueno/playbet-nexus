import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, BODY, GRADIENT_PRIMARY } from "../theme";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeIn = spring({ frame, fps, config: { damping: 18, stiffness: 160 } });
  const t1 = spring({ frame: frame - 8, fps, config: { damping: 22, stiffness: 130 } });
  const t2 = spring({ frame: frame - 16, fps, config: { damping: 22, stiffness: 130 } });
  const subIn = spring({ frame: frame - 26, fps, config: { damping: 22 } });

  const chips = ["01 · Pipeline", "02 · Squads & Gerentes", "03 · Qualificação"];

  return (
    <AbsoluteFill style={{ padding: "0 140px", justifyContent: "center", fontFamily: DISPLAY }}>
      <div
        style={{
          transform: `translateY(${interpolate(badgeIn, [0, 1], [24, 0])}px)`,
          opacity: badgeIn,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 16px",
          borderRadius: 999,
          background: "rgba(91,78,232,0.12)",
          border: `1px solid ${C.primary}40`,
          width: "fit-content",
          fontFamily: BODY,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: C.primaryGlow,
          marginBottom: 28,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: C.primary, boxShadow: `0 0 8px ${C.primary}` }} />
        PlayBet · Painel Comercial
      </div>

      <div
        style={{
          fontSize: 116,
          fontWeight: 600,
          letterSpacing: -3,
          color: C.text,
          lineHeight: 0.98,
          transform: `translateY(${interpolate(t1, [0, 1], [36, 0])}px)`,
          opacity: t1,
        }}
      >
        Como usar o
      </div>
      <div
        style={{
          fontSize: 116,
          fontWeight: 700,
          letterSpacing: -3,
          lineHeight: 0.98,
          backgroundImage: GRADIENT_PRIMARY,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          transform: `translateY(${interpolate(t2, [0, 1], [36, 0])}px)`,
          opacity: t2,
        }}
      >
        painel comercial
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 40,
          opacity: subIn,
          transform: `translateY(${interpolate(subIn, [0, 1], [16, 0])}px)`,
        }}
      >
        {chips.map((w, i) => {
          const c = spring({ frame: frame - 30 - i * 6, fps, config: { damping: 22 } });
          return (
            <div
              key={w}
              style={{
                fontFamily: BODY,
                fontSize: 15,
                fontWeight: 600,
                padding: "9px 18px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.border}`,
                color: C.text,
                opacity: c,
                transform: `translateY(${interpolate(c, [0, 1], [12, 0])}px)`,
              }}
            >
              {w}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
