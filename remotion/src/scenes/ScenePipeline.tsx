import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, BODY } from "../theme";
import { BrowserChrome, CaptionBar } from "../components/Chrome";
import { STAGES, KanbanColumn } from "../components/Kanban";

export const ScenePipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chromeIn = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const captionIn = spring({ frame: frame - 4, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ padding: 80, gap: 32, flexDirection: "column" }}>
      <div style={{ opacity: captionIn, transform: `translateY(${interpolate(captionIn, [0, 1], [16, 0])}px)` }}>
        <CaptionBar
          eyebrow="Aba 01 · Pipeline"
          title="Sete estágios, um funil"
          sub="Cada card é um influenciador candidato. Você arrasta da esquerda para a direita conforme ele avança."
        />
      </div>

      <div
        style={{
          flex: 1,
          opacity: chromeIn,
          transform: `translateY(${interpolate(chromeIn, [0, 1], [40, 0])}px)`,
        }}
      >
        <BrowserChrome url="painelcentral.playbet.app.br/comercial">
          <div style={{ padding: 18, display: "flex", gap: 10, height: "100%", fontFamily: BODY }}>
            {STAGES.map((s, i) => {
              const colIn = spring({ frame: frame - 18 - i * 3, fps, config: { damping: 22 } });
              return (
                <div
                  key={s.id}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    opacity: colIn,
                    transform: `translateY(${interpolate(colIn, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <KanbanColumn stage={s} />
                </div>
              );
            })}
          </div>
        </BrowserChrome>
      </div>
    </AbsoluteFill>
  );
};
