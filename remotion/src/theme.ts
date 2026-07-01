import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

export const { fontFamily: DISPLAY } = loadDisplay("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
});
export const { fontFamily: BODY } = loadBody("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const C = {
  bg: "#0A0E1A",
  bg2: "#111827",
  panel: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  text: "#F8FAFC",
  muted: "#94A3B8",
  primary: "#5B8CFF",
  primaryGlow: "#8FB1FF",
  emerald: "#22C55E",
  amber: "#F59E0B",
  violet: "#A78BFA",
  sky: "#38BDF8",
  slate: "#64748B",
  indigo: "#818CF8",
};
