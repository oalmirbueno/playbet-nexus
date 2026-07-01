import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, BODY, GRADIENT_PRIMARY } from "../theme";

const FLOW = [
  { n: "01", tag: "PIPELINE", title: "Prospectou", desc: "Você cadastra o candidato e move pelo funil.", color: C.violet },
  { n: "02", tag: "QUALIFICAÇÃO", title: "Qualificou", desc: "O checklist valida perfil, documentos e compliance.", color: C.primary },
  { n: "03", tag: "SQUAD", title: "Distribuiu", desc: "Ao aprovar, o influenciador entra no squad certo.", color: C.success },
];

export const SceneFluxo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyeIn = spring({ frame, fps, config: { damping: 20 } });
  const titleIn = spring({ frame: frame - 6, fps, config: { damping: 22 } });
  const lineProgress = interpolate(frame, [22, 90], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "0 140px", justifyContent: "center", fontFamily: DISPLAY }}>
      <div
        style={{
          fontFamily: BODY,
          color: C.primaryGlow,
          letterSpacing: 4,
          fontSize: 13,
          fontWeight: 600,
          textTransform: "uppercase",
          marginBottom: 14,
          opacity: eyeIn,
          transform: `translateY(${interpolate(eyeIn, [0, 1], [12, 0])}px)`,
        }}
      >
        Como tudo se conecta
      </div>
      <div
        style={{
          fontSize: 78,
          fontWeight: 600,
          letterSpacing: -2,
          color: C.text,
          lineHeight: 1.02,
          marginBottom: 60,
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [24, 0])}px)`,
        }}
      >
        Um fluxo, três abas,{" "}
        <span
          style={{
            backgroundImage: GRADIENT_PRIMARY,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          zero retrabalho.
        </span>
      </div>

      <div style={{ position: "relative", display: "flex", gap: 40 }}>
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 44,
            right: 44,
            height: 2,
            background: C.border,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 44,
            height: 2,
            width: `calc((100% - 88px) * ${lineProgress})`,
            background: `linear-gradient(90deg, ${C.violet}, ${C.primary}, ${C.success})`,
            boxShadow: `0 0 12px ${C.primary}`,
          }}
        />

        {FLOW.map((s, i) => {
          const stepIn = spring({ frame: frame - 20 - i * 14, fps, config: { damping: 22, stiffness: 140 } });
          return (
            <div
              key={s.n}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                opacity: stepIn,
                transform: `translateY(${interpolate(stepIn, [0, 1], [28, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 999,
                  background: `radial-gradient(circle at 30% 30%, ${s.color}, ${s.color}88)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.bg,
                  fontWeight: 700,
                  fontSize: 34,
                  fontFamily: DISPLAY,
                  letterSpacing: -1,
                  boxShadow: `0 0 40px ${s.color}66, inset 0 -4px 12px rgba(0,0,0,0.25)`,
                  position: "relative",
                  zIndex: 2,
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontFamily: BODY,
                  fontSize: 12,
                  letterSpacing: 3,
                  fontWeight: 700,
                  color: s.color,
                  textTransform: "uppercase",
                }}
              >
                {s.tag}
              </div>
              <div style={{ fontSize: 40, fontWeight: 600, color: C.text, letterSpacing: -1 }}>{s.title}</div>
              <div style={{ fontFamily: BODY, fontSize: 17, color: C.muted, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
