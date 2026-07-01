import { loadFont as loadDisplay } from "@remotion/google-fonts/Sora";
import { loadFont as loadBody } from "@remotion/google-fonts/Manrope";

export const { fontFamily: DISPLAY } = loadDisplay("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
});
export const { fontFamily: BODY } = loadBody("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// PlayBet Midnight Indigo palette (matches src/index.css tokens)
export const C = {
  bg: "#0A0B14",           // 240 32% 6%
  bg2: "#0D0E1A",
  surface: "#10111C",      // card 240 28% 9%
  elevated: "#171826",     // card-elevated
  border: "#24253A",       // 240 22% 15%
  borderSoft: "rgba(255,255,255,0.06)",
  text: "#EEEEF2",         // 240 8% 94%
  textDim: "#B4B4C1",
  muted: "#8083A0",        // 240 8% 56% brightened
  primary: "#5B4EE8",      // 244 75% 60%
  primaryGlow: "#8A7EF5",  // 248 85% 70%
  primaryDeep: "#3E33C7",
  violet: "#9B5EEC",       // gradient end
  success: "#31C88F",      // 158 60% 48%
  warning: "#F5A82E",      // 38 92% 58%
  info: "#4EA6F5",         // 210 90% 62%
  destructive: "#DB4B4B",
  sky: "#38BDF8",
  amber: "#F5A82E",
  slate: "#64748B",
  indigo: "#818CF8",
};

export const GRADIENT_PRIMARY = `linear-gradient(135deg, ${C.primary}, ${C.violet})`;
export const GRADIENT_AVATAR = `linear-gradient(135deg, ${C.primary}, ${C.primaryGlow})`;
