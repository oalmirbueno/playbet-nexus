import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, BODY, GRADIENT_PRIMARY } from "../theme";
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

  const totalItems = GROUPS.reduce((n, g) => n + g.items.length, 0);
  const checkedCount = Math.max(0, Math.floor(interpolate(frame, [40, 110], [0, totalItems], { extrapolateRight: "clamp" })));
  let cursor = 0;

  return (
    <AbsoluteFill style={{ padding: 80, gap: 32, flexDirection: "column" }}>
      <div style={{ opacity: captionIn, transform: `translateY(${interpolate(captionIn, [0, 1], [16, 0])}px)` }}>
        <CaptionBar
          eyebrow="Aba 03 · Qualificação"
          title="O checklist que roda sozinho"
          sub="Este é o modelo que o pipeline usa. Você edita aqui uma vez e ele passa a valer para todo card que entra no estágio Checklist."
        />
      </div>

      <div style={{ flex: 1, opacity: chromeIn, transform: `translateY(${interpolate(chromeIn, [0, 1], [40, 0])}px)` }}>
        <BrowserChrome url="painelcentral.playbet.app.br/comercial/qualificacao">
          <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 16, height: "100%", fontFamily: BODY }}>
            {/* Active template header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: 16,
                borderRadius: 12,
                background: `linear-gradient(90deg, ${C.primary}18, transparent 70%)`,
                border: `1px solid ${C.primary}40`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `${C.primary}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.primaryGlow,
                  fontSize: 22,
                }}
              >
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: C.text }}>
                  Template padrão de qualificação
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  Versão 3 · mínimo 80% dos obrigatórios para avançar
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: `${C.success}22`,
                  color: C.success,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                ATIVO
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, flex: 1 }}>
              {GROUPS.map((g, gi) => {
                const gIn = spring({ frame: frame - 20 - gi * 6, fps, config: { damping: 22 } });
                return (
                  <div
                    key={g.title}
                    style={{
                      borderRadius: 12,
                      padding: 16,
                      background: C.elevated,
                      border: `1px solid ${C.border}`,
                      opacity: gIn,
                      transform: `translateY(${interpolate(gIn, [0, 1], [20, 0])}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        color: C.muted,
                        marginBottom: 10,
                      }}
                    >
                      {g.title}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {g.items.map((it) => {
                        const myIdx = cursor++;
                        const isChecked = myIdx < checkedCount;
                        return (
                          <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                border: `1.5px solid ${isChecked ? C.primary : C.border}`,
                                background: isChecked ? C.primary : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            >
                              {isChecked ? "✓" : ""}
                            </div>
                            <div style={{ fontSize: 13, color: isChecked ? C.text : C.textDim, flex: 1 }}>
                              {it.label}
                            </div>
                            {it.required && (
                              <div
                                style={{
                                  fontSize: 9,
                                  color: C.warning,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: `${C.warning}18`,
                                  fontWeight: 700,
                                  letterSpacing: 0.5,
                                }}
                              >
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
