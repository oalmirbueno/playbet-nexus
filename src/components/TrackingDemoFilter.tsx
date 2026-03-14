import { useDemoMode } from "@/contexts/DemoModeContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Layers } from "lucide-react";

/**
 * Compact toggle for showing/hiding demo data in tracking pages.
 * Defaults to "real" on first render if user hasn't explicitly chosen.
 */
export default function TrackingDemoFilter() {
  const { demoMode, setDemoMode } = useDemoMode();

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant={demoMode === "real" ? "default" : "outline"}
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => setDemoMode("real")}
      >
        <Eye size={12} /> Produção
      </Button>
      <Button
        variant={demoMode === "all" ? "default" : "outline"}
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => setDemoMode("all")}
      >
        <Layers size={12} /> Todos
      </Button>
      <Button
        variant={demoMode === "demo" ? "default" : "outline"}
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => setDemoMode("demo")}
      >
        <EyeOff size={12} /> Demo
      </Button>
      {demoMode === "demo" && (
        <Badge variant="secondary" className="text-[10px] bg-yellow-500/15 text-yellow-600 border-yellow-500/30">
          MODO DEMO
        </Badge>
      )}
      {demoMode === "all" && (
        <Badge variant="secondary" className="text-[10px] bg-orange-500/15 text-orange-600 border-orange-500/30">
          INCLUI DEMO
        </Badge>
      )}
    </div>
  );
}
