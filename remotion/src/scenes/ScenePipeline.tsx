import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, BODY } from "../theme";
import { BrowserChrome, CaptionBar } from "../components/Chrome";

const STAGES = [
  { id: "em_contato", label: "Em contato", color: C.slate, count: 12, sample: "Ana Reis" },
  { id: "respondeu", label: "Respondeu", color: C.sky, count: 8, sample: "Bruno M." },
  { id: "checklist", label: "Checklist", color: C.violet, count: 5, sample: "Camila S." },
  { id: "cadastro", label: "Cadastro", color: C.indigo, count: 4, sample: "Diego F." },
  { id: "analise", label: "Análise", color: C.amber, count: 3, sample: "Elis R." },
  { id: "aprovado", label: "Aprovado", color: C.emerald, count: 2, sample: "Felipe A." },
  { id: "concluido", label: "Concluído", color: C.primary, count: 6, sample: "Gabriela T." },
];

export const ScenePipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chromeIn = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const captionIn = spring({ frame: frame - 4, fps, config: { damping: 20 } });

  // Moving card animation across stages
  const move = interpolate(frame, [60, 140], [0, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 90, gap: 40, flexDirection: "column" }}>
      <div style={{ opacity: captionIn, transform: `translateY(${interpolate(captionIn, [0,1],[16,0])}px)` }}>
        <CaptionBar
          eyebrow="Aba 01 · Pipeline"
          title="Prospecção em 7 estágios"
          sub="Cada card é um influenciador candidato. Você move da esquerda para a direita conforme ele avança na jornada."
        />
      </div>

      <div
        style={{
          flex: 1,
          opacity: chromeIn,
          transform: `translateY(${interpolate(chromeIn, [0, 1], [40, 0])}px) scale(${interpolate(chromeIn,[0,1],[0.98,1])})`,
        }}
      >
        <BrowserChrome url="painelcentral.playbet.app.br/comercial">
          <div style={{ padding: 22, display: "flex", gap: 12, height: "100%", fontFamily: BODY }}>
            {STAGES.map((s, i) => {
              const colIn = spring({ frame: frame - 20 - i * 3, fps, config: { damping: 22 } });
              const isHere = Math.floor(move) === i;
              const nextIsHere = Math.floor(move) === i - 1 && (move % 1) > 0.5;
              return (
                <div
                  key={s.id}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    background: `linear-gradient(180deg, ${s.color}22, transparent 60%)`,
                    border: `1px solid ${s.color}30`,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    opacity: colIn,
                    transform: `translateY(${interpolate(colIn, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 999, background: s.color }} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, letterSpacing: 0.3 }}>{s.label}</div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>{s.count}</div>
                  </div>

                  {/* Sample card */}
                  <div
                    style={{
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${C.border}`,
                      padding: 10,
                      transform: isHere ? `scale(${interpolate(move % 1, [0, 0.5, 1], [1.03, 1.06, 1.03])})` : "scale(1)",
                      boxShadow: isHere ? `0 0 0 2px ${s.color}80, 0 12px 32px -8px ${s.color}60` : "none",
                      opacity: nextIsHere ? 0.35 : 1,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.sample}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>@{s.sample.split(" ")[0].toLowerCase()}_bet</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                      <div style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${s.color}20`, color: s.color }}>Instagram</div>
                    </div>
                  </div>

                  {/* Ghost cards */}
                  {Array.from({ length: Math.min(2, s.count - 1) }).map((_, k) => (
                    <div
                      key={k}
                      style={{
                        height: 44,
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.025)",
                        border: `1px dashed ${C.border}`,
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </BrowserChrome>
      </div>
    </AbsoluteFill>
  );
};
