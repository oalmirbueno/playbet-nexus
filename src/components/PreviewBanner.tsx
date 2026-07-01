import { Eye, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function PreviewBanner() {
  const { previewAs, setPreviewAs, isAdmin } = useAuth();
  const navigate = useNavigate();
  if (!isAdmin || !previewAs) return null;

  const label = previewAs === "influencer" ? "Portal do Influenciador" : "Painel do Gerente";

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent backdrop-blur-xl px-4 py-2 text-[12px]">
      <div className="flex items-center gap-2 text-foreground/90">
        <Eye size={13} className="text-primary" />
        <span>
          Visualizando como <b className="font-semibold">{label}</b>
          <span className="text-muted-foreground"> — modo pré-visualização</span>
        </span>
      </div>
      <button
        onClick={() => { setPreviewAs(null); navigate("/"); }}
        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 hover:bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <X size={11} /> Sair da pré-visualização
      </button>
    </div>
  );
}
