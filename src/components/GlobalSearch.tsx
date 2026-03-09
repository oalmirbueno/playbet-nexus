import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Gamepad2, Megaphone, Wallet, Monitor, FileText, Tag, PenTool, UserCheck, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useInfluencers, useGames, usePlatforms, useCampanhas, useSaques, useSocios, useConteudo, useLandingPages } from "@/hooks/useSupabaseQuery";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: React.ElementType;
  path: string;
}

export default function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: influencers } = useInfluencers();
  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();
  const { data: campanhas } = useCampanhas();
  const { data: saques } = useSaques();
  const { data: socios } = useSocios();
  const { data: conteudos } = useConteudo();
  const { data: landingPages } = useLandingPages();

  const allResults = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];
    influencers.forEach((i: any) => results.push({ id: i.id, title: i.name, subtitle: `@${i.instagram || i.slug} · ${i.is_active ? "Ativo" : "Inativo"}`, category: "Influencers", icon: Users, path: `/influencers/${i.id}` }));
    games.forEach((g: any) => results.push({ id: g.id, title: g.name, subtitle: `${g.category || "Sem categoria"} · ${g.is_active ? "Ativo" : "Inativo"}`, category: "Jogos", icon: Gamepad2, path: `/jogos/${g.id}` }));
    platforms.forEach((p: any) => results.push({ id: p.id, title: p.name, subtitle: `${p.commission_type || "—"} · ${p.is_active ? "Ativa" : "Inativa"}`, category: "Plataformas", icon: Monitor, path: `/plataformas/${p.id}` }));
    campanhas.forEach((c: any) => results.push({ id: c.id, title: c.nome, subtitle: `${c.status || "—"} · ${c.jogo || ""}`, category: "Campanhas", icon: Megaphone, path: `/campanhas/${c.id}` }));
    saques.forEach((s: any) => results.push({ id: s.id, title: `${s.nome} — R$ ${Number(s.valor || 0).toLocaleString()}`, subtitle: `${s.tipo} · ${s.status}`, category: "Saques", icon: Wallet, path: "/saques" }));
    socios.forEach((s: any) => results.push({ id: s.id, title: s.nome, subtitle: `${s.participacao}% · ${s.status}`, category: "Sócios", icon: UserCheck, path: `/socios/${s.id}` }));
    conteudos.forEach((c: any) => results.push({ id: c.id, title: c.tema, subtitle: `${c.tipo || "—"} · ${c.status || "—"}`, category: "Conteúdo", icon: PenTool, path: "/conteudo" }));
    landingPages.forEach((l: any) => results.push({ id: l.id, title: l.name, subtitle: `${l.route} · ${l.is_active ? "Ativa" : "Inativa"}`, category: "Landing Pages", icon: FileText, path: "/landing-pages" }));
    return results;
  }, [influencers, games, platforms, campanhas, saques, socios, conteudos, landingPages]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allResults.filter(r => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)).slice(0, 20);
  }, [query, allResults]);

  const grouped = useMemo(() => {
    const map: Record<string, SearchResult[]> = {};
    filtered.forEach(r => { (map[r.category] ??= []).push(r); });
    return map;
  }, [filtered]);

  useEffect(() => { setSelectedIdx(0); }, [query]);
  useEffect(() => { if (open) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  const goTo = useCallback((result: SearchResult) => {
    navigate(result.path);
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[selectedIdx]) { goTo(filtered[selectedIdx]); }
    if (e.key === "Escape") { onOpenChange(false); }
  };

  let flatIdx = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar influencer, jogo, campanha, saque..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] text-muted-foreground bg-secondary border border-border rounded px-1.5 py-0.5 font-mono">ESC</kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {!query.trim() ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">Digite para buscar em todas as entidades</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{allResults.length} registros indexados</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum resultado para "<strong>{query}</strong>"</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/30">{category}</div>
                {items.map(item => {
                  flatIdx++;
                  const idx = flatIdx;
                  return (
                    <div
                      key={item.id}
                      onClick={() => goTo(item)}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        selectedIdx === idx ? "bg-primary/10" : "hover:bg-secondary/50"
                      }`}
                    >
                      <item.icon size={14} className="text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
            <span>↑↓ navegar</span>
            <span>↵ abrir</span>
            <span>esc fechar</span>
            <span className="ml-auto">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
