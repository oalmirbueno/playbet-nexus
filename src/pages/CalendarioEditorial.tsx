import { useState } from "react";

const dias = Array.from({ length: 31 }, (_, i) => i + 1);
const conteudosPorDia: Record<number, { tipo: string; canal: string; tema: string; influencer: string; status: string }[]> = {
  3: [{ tipo: "Reels", canal: "Instagram", tema: "Fortune Tiger dicas", influencer: "Rafael M.", status: "Publicado" }],
  5: [{ tipo: "Story", canal: "Instagram", tema: "Bônus Bet365", influencer: "Carlos S.", status: "Agendado" }, { tipo: "Post", canal: "Telegram", tema: "Link exclusivo Aviator", influencer: "Pedro L.", status: "Agendado" }],
  7: [{ tipo: "Vídeo", canal: "YouTube", tema: "Top 5 jogos da semana", influencer: "Ana S.", status: "Produção" }],
  10: [{ tipo: "Reels", canal: "TikTok", tema: "Ganhos ao vivo Mines", influencer: "Rafael M.", status: "Roteiro" }],
  12: [{ tipo: "Story", canal: "Instagram", tema: "Promo Março Turbo", influencer: "Pedro L.", status: "Ideia" }],
  15: [{ tipo: "Post", canal: "Grupo WA", tema: "Link especial Gates", influencer: "Carlos S.", status: "Ideia" }],
};

const statusColors: Record<string, string> = { Publicado: "badge-success", Agendado: "badge-info", Produção: "badge-warning", Roteiro: "badge-accent", Ideia: "badge-neutral" };

export default function CalendarioEditorial() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Calendário Editorial</h1><p className="page-subtitle">Planejamento visual de conteúdo — Março 2026</p></div>
      <div className="grid grid-cols-7 gap-1">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground font-semibold uppercase tracking-wider py-2">{d}</div>
        ))}
        {/* offset for March 2026 starting on Sunday */}
        {dias.map((dia) => {
          const items = conteudosPorDia[dia];
          return (
            <div key={dia} className={`glass-card min-h-[80px] p-2 rounded-lg ${items ? "border-primary/20" : ""}`}>
              <span className="text-[10px] text-muted-foreground font-medium">{dia}</span>
              {items?.map((item, i) => (
                <div key={i} className="mt-1 p-1 rounded bg-secondary/60 text-[10px]">
                  <p className="font-medium truncate">{item.tema}</p>
                  <p className="text-muted-foreground">{item.tipo} · {item.canal}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
