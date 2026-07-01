import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function GerenteInfluenciadores() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("manager_id").eq("id", user!.id).maybeSingle();
      if (!prof?.manager_id) { setLoading(false); return; }
      const { data: m } = await supabase.from("managers").select("squad_id").eq("id", prof.manager_id).maybeSingle();
      const { data } = await supabase
        .from("influencers")
        .select("id, name, slug, instagram, category, is_active")
        .eq("squad_id", m?.squad_id ?? "")
        .order("name");
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-header">Influenciadores</h1>
        <p className="page-subtitle">Todos os influenciadores do seu squad.</p>
      </div>
      {loading ? (
        <div className="glass-card p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm text-muted-foreground">Nenhum influenciador vinculado.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <Link key={r.id} to={`/influencers/${r.id}`} className="glass-card p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {r.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r.instagram ?? `@${r.slug}`}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-secondary/60">{r.category ?? "—"}</span>
                <span className={r.is_active ? "text-emerald-400" : "text-muted-foreground"}>{r.is_active ? "Ativo" : "Inativo"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
