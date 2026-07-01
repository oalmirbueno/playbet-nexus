import { Eye, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function PreviewBanner() {
  const { previewAs, previewTarget, setPreviewAs, isAdmin } = useAuth();
  const navigate = useNavigate();
  if (!isAdmin || !previewAs) return null;

  const roleLabel = previewAs === "influencer" ? "Influenciador" : "Gerente";
  const name = previewTarget?.name;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent backdrop-blur-xl px-4 py-2 text-[12px]">
      <div className="flex items-center gap-2 text-foreground/90 min-w-0">
        <Eye size={13} className="text-primary shrink-0" />
        <span className="truncate">
          Visualizando como <b className="font-semibold">{roleLabel}</b>
          {name && <> — <span className="text-primary/90">{name}</span></>}
          <span className="text-muted-foreground"> · pré-visualização</span>
        </span>
      </div>
      <button
        onClick={() => { setPreviewAs(null); navigate("/"); }}
        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 hover:bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <X size={11} /> Sair
      </button>
    </div>
  );
}
