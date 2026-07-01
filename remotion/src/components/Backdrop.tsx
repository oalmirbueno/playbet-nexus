import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";

export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Radial glow matching body background */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(91,78,232,0.22), transparent 60%),
            radial-gradient(ellipse 60% 40% at 100% 100%, rgba(155,94,236,0.14), transparent 60%),
            radial-gradient(ellipse 40% 30% at 5% 50%, rgba(91,78,232,0.10), transparent 60%)
          `,
        }}
      />
      {/* Subtle grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 90%)",
          transform: `translateY(${Math.sin(t * Math.PI * 2) * 6}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
