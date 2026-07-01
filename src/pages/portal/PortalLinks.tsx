import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Copy, Link2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function PortalLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("influencer_id").eq("id", user!.id).maybeSingle();
      if (!prof?.influencer_id) { setLoading(false); return; }
      const { data } = await supabase
        .from("tracking_links")
        .select("id, short_url, final_url, created_at, platform_account_id")
        .eq("influencer_id", prof.influencer_id)
        .order("created_at", { ascending: false });
      setLinks(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado", description: url });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-header">Meus links</h1>
        <p className="page-subtitle">Copie e compartilhe. Cada clique é atribuído ao seu perfil.</p>
      </div>

      {loading ? (
        <div className="glass-card p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : links.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Link2 className="mx-auto mb-3 text-muted-foreground" size={22} />
          <p className="text-sm font-medium">Você ainda não tem links ativos</p>
          <p className="text-xs text-muted-foreground mt-1">Fale com sua gerência para gerar seus links de afiliado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((l) => {
            const url = l.short_url || l.full_url;
            return (
              <div key={l.id} className="glass-card p-3 md:p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{url}</p>
                  <p className="text-[11px] text-muted-foreground">Criado em {new Date(l.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <button onClick={() => copy(url)} className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground" title="Copiar">
                  <Copy size={14} />
                </button>
                <a href={url} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground" title="Abrir">
                  <ExternalLink size={14} />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
