import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";

export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const gradAngle = 130 + Math.sin(t * Math.PI * 2) * 8;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradAngle}deg, ${C.bg} 0%, #0C1224 50%, ${C.bg2} 100%)`,
      }}
    >
      {/* Subtle radial glow */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(1200px 800px at 20% 15%, rgba(91,140,255,0.18), transparent 60%), radial-gradient(900px 700px at 85% 85%, rgba(167,139,250,0.12), transparent 60%)",
        }}
      />
      {/* Grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          transform: `translateY(${Math.sin(t * Math.PI * 2) * 8}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
