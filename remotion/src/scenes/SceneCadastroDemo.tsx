import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, BODY, GRADIENT_PRIMARY } from "../theme";
import { BrowserChrome, Cursor, Avatar } from "../components/Chrome";
import { STAGES, KanbanColumn, KanbanCard, KCard } from "../components/Kanban";

const DRAG_CARD: KCard = {
  id: "drag2",
  name: "Larissa Vieira",
  handle: "@lari.vieira",
  niche: "esportes",
  progress: 85,
  since: "6h",
};

/**
 * Scene: card is dragged from Checklist → Cadastro, then the Sheet
 * slides in showing the full registration form with a cursor typing
 * into one field.
 * Duration ~ 260 frames
 */
export const SceneCadastroDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chromeIn = spring({ frame, fps, config: { damping: 22 } });

  const checklistColIndex = 2;
  const cadastroColIndex = 3;

  // Cursor: 0-50 approaches card in Checklist column; 50-120 drags to Cadastro
  const cursorX = interpolate(frame, [0, 50, 120, 150], [1400, 900, 1180, 1180], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorY = interpolate(frame, [0, 50, 120, 150], [200, 620, 620, 620], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dragging = frame >= 50 && frame < 145;
  const dragX = interpolate(frame, [50, 120], [880, 1140]);
  const dragY = 590;
  const dragRot = interpolate(frame, [50, 85, 120], [0, -3, -1]);

  const sheetProgress = spring({ frame: frame - 150, fps, config: { damping: 22 } });
  const sheetX = interpolate(sheetProgress, [0, 1], [780, 0]);
  const dim = interpolate(sheetProgress, [0, 1], [0, 0.6]);

  // Typing animation into "Nome completo" field
  const nameText = "Larissa Vieira";
  const typedLen = Math.max(0, Math.min(nameText.length, Math.floor(interpolate(frame, [185, 220], [0, nameText.length], { extrapolateRight: "clamp" }))));
  const typed = nameText.slice(0, typedLen);
  const caretBlink = Math.floor((frame - 185) / 5) % 2 === 0;

  return (
    <AbsoluteFill style={{ padding: 80 }}>
      <div
        style={{
          height: "100%",
          opacity: chromeIn,
          transform: `translateY(${interpolate(chromeIn, [0, 1], [30, 0])}px)`,
          position: "relative",
        }}
      >
        <BrowserChrome url="painelcentral.playbet.app.br/comercial">
          <div style={{ padding: 18, display: "flex", gap: 10, height: "100%", fontFamily: BODY, position: "relative" }}>
            {STAGES.map((s, i) => {
              const stage = i === checklistColIndex
                ? { ...s, cards: [...s.cards, DRAG_CARD] }
                : s;
              const targetEmphasize = i === cadastroColIndex && frame >= 80 && frame < 160;
              const extra = i === cadastroColIndex && frame >= 130 ? DRAG_CARD : undefined;
              return (
                <div key={s.id} style={{ flex: 1, minWidth: 0 }}>
                  <KanbanColumn
                    stage={stage}
                    emphasize={targetEmphasize}
                    extraCard={extra}
                    hideCardId={i === checklistColIndex && dragging ? DRAG_CARD.id : undefined}
                  />
                </div>
              );
            })}

            {dragging && (
              <div
                style={{
                  position: "absolute",
                  left: dragX,
                  top: dragY,
                  width: 230,
                  transform: `rotate(${dragRot}deg) scale(1.06)`,
                  transformOrigin: "top left",
                  boxShadow: `0 30px 60px -10px rgba(0,0,0,0.7), 0 0 0 2px ${C.indigo}55`,
                  borderRadius: 12,
                  zIndex: 20,
                }}
              >
                <KanbanCard card={DRAG_CARD} accent={C.indigo} highlight />
              </div>
            )}

            {sheetProgress > 0.001 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `rgba(5,6,14,${dim})`,
                  zIndex: 25,
                }}
              />
            )}
            {sheetProgress > 0.001 && (
              <SheetCadastro
                translateX={sheetX}
                typed={typed}
                showCaret={caretBlink && typedLen > 0 && frame < 225}
              />
            )}
          </div>
        </BrowserChrome>

        <Cursor x={cursorX} y={cursorY} />

        <div
          style={{
            position: "absolute",
            left: 40,
            bottom: 30,
            fontFamily: DISPLAY,
            color: C.text,
            zIndex: 60,
          }}
        >
          <div
            style={{
              fontFamily: BODY,
              fontSize: 11,
              letterSpacing: 3,
              color: C.primaryGlow,
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Passo 3
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, maxWidth: 700 }}>
            {frame < 145
              ? "Arraste para “Cadastro”…"
              : "…complete o formulário e envie para análise."}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────
const SheetCadastro: React.FC<{ translateX: number; typed: string; showCaret: boolean }> = ({
  translateX,
  typed,
  showCaret,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 720,
        transform: `translateX(${translateX}px)`,
        background: C.surface,
        borderLeft: `1px solid ${C.border}`,
        boxShadow: "-40px 0 80px -20px rgba(0,0,0,0.8)",
        zIndex: 30,
        padding: 28,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: BODY,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar initials="LV" size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: C.text, letterSpacing: -0.3 }}>
            Cadastro completo
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>@lari.vieira · etapa: cadastro</div>
        </div>
        <div
          style={{
            fontSize: 10,
            color: C.indigo,
            padding: "3px 10px",
            borderRadius: 999,
            background: `${C.indigo}22`,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          CADASTRO
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          padding: 3,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 8,
          fontSize: 12,
        }}
      >
        <div style={{ padding: "8px 12px", color: C.muted, textAlign: "center" }}>Checklist &amp; squad</div>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            background: C.elevated,
            color: C.text,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Cadastro completo
        </div>
      </div>

      {/* Section: Dados básicos */}
      <FormSection title="Dados básicos" subtitle="Identificação do candidato">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Nome completo *" active>
            <span>{typed}</span>
            {showCaret && (
              <span style={{ display: "inline-block", width: 2, height: 14, background: C.primary, marginLeft: 1, verticalAlign: "middle" }} />
            )}
          </Field>
          <Field label="E-mail *">
            <span style={{ color: C.muted }}>larissa@email.com</span>
          </Field>
          <Field label="WhatsApp *">
            <span style={{ color: C.muted }}>(11) 99999-1234</span>
          </Field>
          <Field label="CPF / CNPJ *">
            <span style={{ color: C.muted }}>000.000.000-00</span>
          </Field>
          <Field label="Cidade *">
            <span style={{ color: C.muted }}>São Paulo</span>
          </Field>
          <Field label="UF *">
            <span style={{ color: C.muted }}>SP</span>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Redes e audiência" subtitle="Pelo menos uma rede principal">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "90px 1fr 100px 90px",
            gap: 8,
            padding: 10,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            background: C.elevated,
            alignItems: "center",
            fontSize: 12,
          }}
        >
          <SmallField label="Rede">Instagram</SmallField>
          <SmallField label="Handle">@lari.vieira</SmallField>
          <SmallField label="Seguidores">248 k</SmallField>
          <SmallField label="Eng %">4,2</SmallField>
        </div>
      </FormSection>

      <FormSection title="Comercial e financeiro">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Modelo de remuneração *">
            <PillGroup active="Híbrido" options={["CPA", "RevShare", "Híbrido"]} />
          </Field>
          <Field label="Contrato *">
            <PillGroup active="Enviado" options={["Pendente", "Enviado", "Assinado"]} />
          </Field>
          <Field label="Chave PIX *">
            <span style={{ color: C.text }}>lari.vieira@pix.com</span>
          </Field>
          <Field label="Tipo de chave">
            <span style={{ color: C.muted }}>E-mail</span>
          </Field>
        </div>
      </FormSection>

      {/* Footer */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 14,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 999,
            background: `${C.success}22`,
            color: C.success,
            fontWeight: 600,
          }}
        >
          ✓ Formulário válido
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              color: C.textDim,
              fontSize: 12,
            }}
          >
            Salvar rascunho
          </div>
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              backgroundImage: GRADIENT_PRIMARY,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              boxShadow: `0 8px 20px -6px ${C.primary}70`,
            }}
          >
            ➤ Enviar para análise
          </div>
        </div>
      </div>
    </div>
  );
};

const FormSection: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
        {title}
      </div>
      {subtitle && <div style={{ fontSize: 10, color: C.muted, opacity: 0.7, marginTop: 1 }}>{subtitle}</div>}
    </div>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode; active?: boolean }> = ({
  label,
  children,
  active,
}) => (
  <div>
    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
    <div
      style={{
        padding: "9px 12px",
        borderRadius: 7,
        background: C.elevated,
        border: `1px solid ${active ? C.primary : C.border}`,
        boxShadow: active ? `0 0 0 3px ${C.primary}22` : "none",
        fontSize: 13,
        color: C.text,
        minHeight: 34,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
    </div>
  </div>
);

const SmallField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>{label}</div>
    <div style={{ color: C.text, fontSize: 12 }}>{children}</div>
  </div>
);

const PillGroup: React.FC<{ options: string[]; active: string }> = ({ options, active }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {options.map((o) => (
      <div
        key={o}
        style={{
          fontSize: 10.5,
          padding: "3px 8px",
          borderRadius: 6,
          background: o === active ? `${C.primary}25` : "transparent",
          border: `1px solid ${o === active ? C.primary : C.border}`,
          color: o === active ? C.primaryGlow : C.muted,
          fontWeight: o === active ? 600 : 400,
        }}
      >
        {o}
      </div>
    ))}
  </div>
);
