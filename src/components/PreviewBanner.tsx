import { Eye, X } from "lucide-react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const ROLE_LABEL: Record<AppRole, string> = {
  admin_master: "Admin Master",
  socio: "Sócio",
  financeiro: "Financeiro",
  operacao: "Operação",
  conteudo: "Conteúdo",
  visualizacao: "Visualização",
  gerente: "Gerente",
  influencer: "Influenciador",
};

export default function PreviewBanner() {
  const { previewAs, previewTarget, setPreviewAs, isAdmin } = useAuth();
  const navigate = useNavigate();
  if (!isAdmin || !previewAs) return null;

  const roleLabel = ROLE_LABEL[previewAs] ?? previewAs;
  const name = previewTarget?.name;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent backdrop-blur-xl px-4 py-2 text-[12px]">
      <div className="flex items-center gap-2 text-foreground/90 min-w-0">
        <Eye size={13} className="text-primary shrink-0" />
        <span className="truncate">
          Visualizando como <b className="font-semibold">{roleLabel}</b>
          {name && <> — <span className="text-primary/90">{name}</span></>}
          <span className="text-muted-foreground"> · somente leitura</span>
        </span>
      </div>
      <button
        onClick={() => { setPreviewAs(null); navigate("/configuracoes"); }}
        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 hover:bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <X size={11} /> Sair da visualização
      </button>
    </div>
  );
}
