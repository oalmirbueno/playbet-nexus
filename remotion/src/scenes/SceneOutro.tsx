import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, BODY } from "../theme";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineIn = spring({ frame, fps, config: { damping: 20 } });
  const titleIn = spring({ frame: frame - 8, fps, config: { damping: 22 } });
  const subIn = spring({ frame: frame - 22, fps, config: { damping: 22 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 140, textAlign: "center", fontFamily: DISPLAY }}>
      <div
        style={{
          width: interpolate(lineIn, [0, 1], [0, 220]),
          height: 2,
          background: `linear-gradient(90deg, transparent, ${C.primary}, transparent)`,
          marginBottom: 40,
        }}
      />
      <div
        style={{
          fontSize: 104, fontWeight: 600, letterSpacing: -2.5, color: C.text, lineHeight: 1,
          opacity: titleIn, transform: `translateY(${interpolate(titleIn,[0,1],[24,0])}px)`,
        }}
      >
        Pronta para começar,
      </div>
      <div
        style={{
          fontSize: 104, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1, marginTop: 4,
          background: `linear-gradient(90deg, ${C.primary}, ${C.primaryGlow})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          opacity: titleIn, transform: `translateY(${interpolate(titleIn,[0,1],[24,0])}px)`,
        }}
      >
        Camile.
      </div>
      <div
        style={{
          fontFamily: BODY, fontSize: 22, color: C.muted, marginTop: 40, maxWidth: 780, lineHeight: 1.55,
          opacity: subIn, transform: `translateY(${interpolate(subIn,[0,1],[16,0])}px)`,
        }}
      >
        Qualquer dúvida, chama no grupo. O painel salva tudo automaticamente e a distribuição para o squad acontece sozinha.
      </div>

      <div
        style={{
          fontFamily: BODY,
          marginTop: 60,
          padding: "12px 22px",
          borderRadius: 999,
          background: "rgba(91,140,255,0.12)",
          border: `1px solid ${C.primary}40`,
          color: C.primaryGlow,
          fontSize: 13,
          letterSpacing: 3,
          fontWeight: 600,
          textTransform: "uppercase",
          opacity: subIn,
        }}
      >
        PlayBet · painelcentral.playbet.app.br
      </div>
    </AbsoluteFill>
  );
};
