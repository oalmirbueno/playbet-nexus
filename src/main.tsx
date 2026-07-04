import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const PANEL_HOSTS = ["painelcentral.playbet.app.br", "localhost", "127.0.0.1"];
const PANEL_HOST_SUFFIXES = [".lovable.app", ".lovableproject.com", ".lovable.dev"];

function isPanelHost(host: string): boolean {
  const h = host.split(":")[0].toLowerCase();
  return PANEL_HOSTS.includes(h) || PANEL_HOST_SUFFIXES.some((suf) => h.endsWith(suf));
}

if (typeof window !== "undefined" && isPanelHost(window.location.hostname)) {
  void Promise.all([
    import("@fontsource/sora/400.css"),
    import("@fontsource/sora/500.css"),
    import("@fontsource/sora/600.css"),
    import("@fontsource/sora/700.css"),
    import("@fontsource/manrope/300.css"),
    import("@fontsource/manrope/400.css"),
    import("@fontsource/manrope/500.css"),
    import("@fontsource/manrope/600.css"),
    import("@fontsource/manrope/700.css"),
  ]);
  void import("./lib/brandFonts").then(({ installBrandFonts }) => installBrandFonts());
}


createRoot(document.getElementById("root")!).render(<App />);
