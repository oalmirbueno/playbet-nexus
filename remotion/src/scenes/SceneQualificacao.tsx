import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, BODY } from "../theme";
import { BrowserChrome, CaptionBar } from "../components/Chrome";

const GROUPS = [
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
      { label: "Dados bancários (PIX)", required: true },
      { label: "Contrato assinado", required: true },
    ],
  },
  {
    title: "Performance mínima",
    items: [
      { label: "Engajamento acima de 2%", required: true },
      { label: "Histórico de conversão", required: false },
    ],
  },
  {
    title: "Compliance",
    items: [
      { label: "Sem menção a plataformas concorrentes", required: true },
      { label: "Aceita diretrizes de comunicação", required: true },
    ],
  },
];

export const SceneQualificacao: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chromeIn = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const captionIn = spring({ frame: frame - 4, fps, config: { damping: 20 } });

  // Progressive check animation
  const totalItems = GROUPS.reduce((n, g) => n + g.items.length, 0);
  const checkedCount = Math.max(0, Math.floor(interpolate(frame, [50, 130], [0, totalItems], { extrapolateRight: "clamp" })));

  let cursor = 0;

  return (
    <AbsoluteFill style={{ padding: 90, gap: 40, flexDirection: "column" }}>
      <div style={{ opacity: captionIn, transform: `translateY(${interpolate(captionIn,[0,1],[16,0])}px)` }}>
        <CaptionBar
          eyebrow="Aba 03 · Qualificação"
          title="Checklist automático"
          sub="Ao entrar no estágio Checklist, o card recebe este modelo. Só avança para Cadastro quem atinge o mínimo dos itens obrigatórios."
        />
      </div>

      <div
        style={{
          flex: 1,
          opacity: chromeIn,
          transform: `translateY(${interpolate(chromeIn,[0,1],[40,0])}px)`,
        }}
      >
        <BrowserChrome url="painelcentral.playbet.app.br/comercial/qualificacao">
          <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18, height: "100%", fontFamily: BODY }}>
            {/* Header template card */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: 16, borderRadius: 14,
                background: `linear-gradient(90deg, ${C.primary}18, transparent 70%)`,
                border: `1px solid ${C.primary}40`,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: `${C.primary}25`, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>✓</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: C.text }}>
                  Template padrão de qualificação
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  Versão 3 · mínimo 80% dos obrigatórios para avançar
                </div>
              </div>
              <div style={{
                fontSize: 11, padding: "5px 12px", borderRadius: 999,
                background: `${C.emerald}20`, color: C.emerald, fontWeight: 600,
              }}>ATIVO</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1 }}>
              {GROUPS.map((g, gi) => {
                const gIn = spring({ frame: frame - 20 - gi * 6, fps, config: { damping: 22 } });
                return (
                  <div
                    key={g.title}
                    style={{
                      borderRadius: 12, padding: 16,
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${C.border}`,
                      opacity: gIn,
                      transform: `translateY(${interpolate(gIn,[0,1],[20,0])}px)`,
                    }}
                  >
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 2,
                      textTransform: "uppercase", color: C.muted, marginBottom: 12,
                    }}>{g.title}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {g.items.map((it) => {
                        const myIdx = cursor++;
                        const isChecked = myIdx < checkedCount;
                        return (
                          <div
                            key={it.label}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "6px 4px",
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: 5,
                              border: `1.5px solid ${isChecked ? C.emerald : C.border}`,
                              background: isChecked ? C.emerald : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#0A0E1A", fontSize: 12, fontWeight: 900,
                              transition: "none",
                            }}>{isChecked ? "✓" : ""}</div>
                            <div style={{ fontSize: 13, color: isChecked ? C.text : C.muted, flex: 1 }}>
                              {it.label}
                            </div>
                            {it.required && (
                              <div style={{ fontSize: 9, color: C.amber, padding: "2px 6px", borderRadius: 4, background: `${C.amber}18`, fontWeight: 600 }}>
                                OBRIG.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </BrowserChrome>
      </div>
    </AbsoluteFill>
  );
};
