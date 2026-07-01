import { C, DISPLAY, BODY } from "../theme";

// Small reusable pieces
export const Dot: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
);

export const BrowserChrome: React.FC<{ url: string; children: React.ReactNode }> = ({
  url,
  children,
}) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      borderRadius: 22,
      background: "rgba(9,13,24,0.75)",
      border: `1px solid ${C.border}`,
      boxShadow:
        "0 40px 120px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      fontFamily: BODY,
    }}
  >
    <div
      style={{
        height: 42,
        background: "rgba(255,255,255,0.02)",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 16px",
      }}
    >
      <Dot color="#ff5f57" />
      <Dot color="#febc2e" />
      <Dot color="#28c840" />
      <div
        style={{
          marginLeft: 18,
          flex: 1,
          height: 24,
          borderRadius: 6,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          color: C.muted,
          fontSize: 12,
          fontFamily: BODY,
        }}
      >
        {url}
      </div>
    </div>
    <div style={{ flex: 1, position: "relative" }}>{children}</div>
  </div>
);

export const CaptionBar: React.FC<{ eyebrow: string; title: string; sub?: string }> = ({
  eyebrow,
  title,
  sub,
}) => (
  <div style={{ fontFamily: DISPLAY, color: C.text }}>
    <div
      style={{
        fontFamily: BODY,
        color: C.primaryGlow,
        letterSpacing: 4,
        fontSize: 14,
        fontWeight: 600,
        textTransform: "uppercase",
        marginBottom: 12,
      }}
    >
      {eyebrow}
    </div>
    <div style={{ fontSize: 62, lineHeight: 1.05, fontWeight: 600, letterSpacing: -1.2 }}>
      {title}
    </div>
    {sub && (
      <div
        style={{
          fontFamily: BODY,
          color: C.muted,
          fontSize: 20,
          marginTop: 14,
          maxWidth: 720,
          lineHeight: 1.45,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);
