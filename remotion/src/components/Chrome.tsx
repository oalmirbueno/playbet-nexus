import { C, DISPLAY, BODY, GRADIENT_AVATAR } from "../theme";

export const Dot: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
);

export const BrowserChrome: React.FC<{ url: string; children: React.ReactNode; scale?: number }> = ({
  url,
  children,
}) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      borderRadius: 20,
      background: C.surface,
      border: `1px solid ${C.border}`,
      boxShadow:
        "0 40px 120px -20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.03)",
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
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          color: C.muted,
          fontSize: 12,
          fontFamily: BODY,
        }}
      >
        <span style={{ color: C.primaryGlow, marginRight: 6 }}>◆</span>
        {url}
      </div>
    </div>
    <div style={{ flex: 1, position: "relative" }}>{children}</div>
  </div>
);

export const CaptionBar: React.FC<{
  eyebrow: string;
  title: string;
  sub?: string;
}> = ({ eyebrow, title, sub }) => (
  <div style={{ fontFamily: DISPLAY, color: C.text }}>
    <div
      style={{
        fontFamily: BODY,
        color: C.primaryGlow,
        letterSpacing: 4,
        fontSize: 13,
        fontWeight: 600,
        textTransform: "uppercase",
        marginBottom: 12,
      }}
    >
      {eyebrow}
    </div>
    <div
      style={{
        fontSize: 56,
        lineHeight: 1.05,
        fontWeight: 600,
        letterSpacing: -1.4,
      }}
    >
      {title}
    </div>
    {sub && (
      <div
        style={{
          fontFamily: BODY,
          color: C.muted,
          fontSize: 19,
          marginTop: 12,
          maxWidth: 780,
          lineHeight: 1.5,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

// Miniature avatar circle used inside pipeline cards
export const Avatar: React.FC<{ initials: string; size?: number }> = ({ initials, size = 28 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: GRADIENT_AVATAR,
      color: "#fff",
      fontFamily: BODY,
      fontWeight: 700,
      fontSize: size * 0.42,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 2px 8px -2px ${C.primary}88`,
      flexShrink: 0,
    }}
  >
    {initials}
  </div>
);

export const Cursor: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      pointerEvents: "none",
      zIndex: 50,
      transform: "translate(-4px, -2px)",
      filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.55))",
    }}
  >
    <svg width="26" height="30" viewBox="0 0 26 30">
      <path
        d="M2 2 L2 22 L7.5 17.5 L10.5 24.5 L13.5 23 L10.5 16 L18 16 Z"
        fill="#fff"
        stroke="#0A0B14"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);
