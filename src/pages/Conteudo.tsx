const kanbanCols = [
  { title: "Ideia", color: "border-t-muted-foreground", items: [
    { tema: "Compilação top crashes", tipo: "Reels", jogo: "Aviator", influencer: "Pedro L." },
    { tema: "Link especial Gates of Olympus", tipo: "Post WA", jogo: "Gates", influencer: "Carlos S." },
  ]},
  { title: "Roteiro", color: "border-t-accent", items: [
    { tema: "Ganhos ao vivo Mines", tipo: "Reels", jogo: "Mines", influencer: "Rafael M." },
  ]},
  { title: "Produção", color: "border-t-info", items: [
    { tema: "Top 5 jogos da semana", tipo: "Vídeo", jogo: "Vários", influencer: "Ana S." },
  ]},
  { title: "Revisão", color: "border-t-warning", items: [] },
  { title: "Agendado", color: "border-t-primary", items: [
    { tema: "Bônus Bet365 cadastro", tipo: "Story", jogo: "Fortune Tiger", influencer: "Carlos S." },
    { tema: "Link exclusivo Aviator", tipo: "Post Telegram", jogo: "Aviator", influencer: "Pedro L." },
  ]},
  { title: "Publicado", color: "border-t-success", items: [
    { tema: "Fortune Tiger dicas", tipo: "Reels", jogo: "Fortune Tiger", influencer: "Rafael M." },
  ]},
];

export default function Conteudo() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Conteúdos</h1><p className="page-subtitle">Central editorial — quadro kanban de produção de conteúdo</p></div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {kanbanCols.map((col) => (
          <div key={col.title} className={`kanban-col border-t-2 ${col.color} min-w-[240px]`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">{col.title}</span>
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{col.items.length}</span>
            </div>
            <div className="space-y-2">
              {col.items.map((item, i) => (
                <div key={i} className="kanban-item">
                  <p className="text-xs font-medium mb-1">{item.tema}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="badge-neutral">{item.tipo}</span>
                    <span className="badge-accent">{item.jogo}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{item.influencer}</p>
                </div>
              ))}
              {col.items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Vazio</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
