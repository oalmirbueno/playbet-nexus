import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, BODY, GRADIENT_PRIMARY } from "../theme";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineIn = spring({ frame, fps, config: { damping: 20 } });
  const t1 = spring({ frame: frame - 8, fps, config: { damping: 22 } });
  const t2 = spring({ frame: frame - 20, fps, config: { damping: 22 } });
  const subIn = spring({ frame: frame - 32, fps, config: { damping: 22 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 140, textAlign: "center", fontFamily: DISPLAY }}>
      <div
        style={{
          width: interpolate(lineIn, [0, 1], [0, 220]),
          height: 2,
          background: `linear-gradient(90deg, transparent, ${C.primary}, transparent)`,
          marginBottom: 36,
        }}
      />
      <div
        style={{
          fontSize: 92,
          fontWeight: 600,
          letterSpacing: -2.4,
          color: C.text,
          lineHeight: 1,
          opacity: t1,
          transform: `translateY(${interpolate(t1, [0, 1], [24, 0])}px)`,
        }}
      >
        Pipeline · Squads · Qualificação
      </div>
      <div
        style={{
          fontSize: 92,
          fontWeight: 700,
          letterSpacing: -2.4,
          lineHeight: 1,
          marginTop: 8,
          backgroundImage: GRADIENT_PRIMARY,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          opacity: t2,
          transform: `translateY(${interpolate(t2, [0, 1], [24, 0])}px)`,
        }}
      >
        Trabalha por você.
      </div>
      <div
        style={{
          fontFamily: BODY,
          fontSize: 20,
          color: C.muted,
          marginTop: 32,
          maxWidth: 820,
          lineHeight: 1.55,
          opacity: subIn,
          transform: `translateY(${interpolate(subIn, [0, 1], [16, 0])}px)`,
        }}
      >
        Cada movimento no card gera o próximo passo. O sistema aplica o checklist, aprova o candidato e distribui para o squad automaticamente.
      </div>

      <div
        style={{
          fontFamily: BODY,
          marginTop: 52,
          padding: "12px 22px",
          borderRadius: 999,
          background: "rgba(91,78,232,0.12)",
          border: `1px solid ${C.primary}44`,
          color: C.primaryGlow,
          fontSize: 12,
          letterSpacing: 3,
          fontWeight: 700,
          textTransform: "uppercase",
          opacity: subIn,
        }}
      >
        PlayBet · painelcentral.playbet.app.br
      </div>
    </AbsoluteFill>
  );
};
