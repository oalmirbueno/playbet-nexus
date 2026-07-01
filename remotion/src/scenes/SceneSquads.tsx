import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, BODY } from "../theme";
import { BrowserChrome, CaptionBar } from "../components/Chrome";

const SQUADS = [
  {
    name: "Squad Alpha",
    color: "#5B8CFF",
    managers: [
      { name: "João Vieira", influencers: 12 },
      { name: "Marina Cruz", influencers: 9 },
    ],
  },
  {
    name: "Squad Beta",
    color: "#A78BFA",
    managers: [
      { name: "Rafael Lins", influencers: 15 },
      { name: "Bianca Souto", influencers: 7 },
    ],
  },
  {
    name: "Squad Gamma",
    color: "#22C55E",
    managers: [
      { name: "Thiago Reis", influencers: 11 },
    ],
  },
];

export const SceneSquads: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chromeIn = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const captionIn = spring({ frame: frame - 4, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ padding: 90, gap: 40, flexDirection: "column" }}>
      <div style={{ opacity: captionIn, transform: `translateY(${interpolate(captionIn,[0,1],[16,0])}px)` }}>
        <CaptionBar
          eyebrow="Aba 02 · Squads & Gerentes"
          title="Times que recebem a demanda"
          sub="Cada squad tem seus gerentes. Quando um card é aprovado no pipeline, o influenciador cai automaticamente na fila do gerente com menos carga."
        />
      </div>

      <div
        style={{
          flex: 1,
          opacity: chromeIn,
          transform: `translateY(${interpolate(chromeIn,[0,1],[40,0])}px)`,
        }}
      >
        <BrowserChrome url="painelcentral.playbet.app.br/comercial/squads">
          <div style={{ padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, height: "100%", fontFamily: BODY }}>
            {SQUADS.map((sq, i) => {
              const cardIn = spring({ frame: frame - 18 - i * 8, fps, config: { damping: 22 } });
              return (
                <div
                  key={sq.name}
                  style={{
                    borderRadius: 16,
                    padding: 20,
                    background: `linear-gradient(180deg, ${sq.color}18, rgba(255,255,255,0.02) 70%)`,
                    border: `1px solid ${sq.color}40`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    opacity: cardIn,
                    transform: `translateY(${interpolate(cardIn,[0,1],[30,0])}px)`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 999, background: sq.color, boxShadow: `0 0 20px ${sq.color}` }} />
                    <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, color: C.text, flex: 1 }}>
                      {sq.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, padding: "3px 8px", borderRadius: 999, background: "rgba(255,255,255,0.05)" }}>
                      {sq.managers.length} gerentes
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sq.managers.map((m, j) => {
                      const mIn = spring({ frame: frame - 32 - i * 8 - j * 6, fps, config: { damping: 22 } });
                      return (
                        <div
                          key={m.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 14px",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.04)",
                            border: `1px solid ${C.border}`,
                            opacity: mIn,
                            transform: `translateX(${interpolate(mIn,[0,1],[-16,0])}px)`,
                          }}
                        >
                          <div
                            style={{
                              width: 34, height: 34, borderRadius: 999,
                              background: `linear-gradient(135deg, ${sq.color}, ${sq.color}80)`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#fff", fontWeight: 700, fontSize: 13,
                            }}
                          >
                            {m.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>gerente · {sq.name}</div>
                          </div>
                          <div
                            style={{
                              fontSize: 11, padding: "4px 10px", borderRadius: 999,
                              background: `${sq.color}20`, color: sq.color, fontWeight: 600,
                            }}
                          >
                            {m.influencers} infl.
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </BrowserChrome>
      </div>
    </AbsoluteFill>
  );
};
