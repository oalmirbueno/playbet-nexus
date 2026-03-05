// Mock data layer — prepared for Supabase migration
// Replace these with Supabase queries when integrating

import type {
  Influencer, Jogo, Plataforma, LinkAfiliado, LandingPage,
  Campanha, Saque, Socio, LPTemplate, InfluencerLP, ConteudoItem
} from "@/types";

export const initialInfluencers: Influencer[] = [
  { id: 1, nome: "Rafael Mendes", slug: "rafa", insta: "@rafa.bet", seg: "410K", tipo: "Premium", perc: 20, jogos: 5, links: 8, receita: 42100, saldo: 8500, ultimoSaque: "01/03/2026", status: "Ativo", affiliate_link: "https://bet365.com?ref=rafa", landing_template: "Fortune Tiger LP", observacoes: "", is_active: true, created_at: "2025-12-01", updated_at: "2026-03-05" },
  { id: 2, nome: "Pedro Lima", slug: "pedro", insta: "@pedro.apostas", seg: "320K", tipo: "Premium", perc: 18, jogos: 4, links: 6, receita: 35700, saldo: 6100, ultimoSaque: "28/02/2026", status: "Ativo", affiliate_link: "https://pixbet.com?ref=pedro", landing_template: "Aviator Promo", observacoes: "", is_active: true, created_at: "2025-12-15", updated_at: "2026-03-04" },
  { id: 3, nome: "Carlos Silva", slug: "carlos", insta: "@carlos.bet", seg: "250K", tipo: "Standard", perc: 15, jogos: 3, links: 5, receita: 28500, saldo: 4200, ultimoSaque: "25/02/2026", status: "Ativo", affiliate_link: "https://betano.com?ref=carlos", landing_template: "Fortune Tiger LP", observacoes: "", is_active: true, created_at: "2026-01-10", updated_at: "2026-03-03" },
  { id: 4, nome: "Ana Souza", slug: "ana", insta: "@ana.plays", seg: "180K", tipo: "Standard", perc: 12, jogos: 3, links: 4, receita: 18200, saldo: 2800, ultimoSaque: "20/02/2026", status: "Ativo", affiliate_link: "https://bet365.com?ref=ana", landing_template: "Cadastro Geral", observacoes: "", is_active: true, created_at: "2026-01-20", updated_at: "2026-03-01" },
  { id: 5, nome: "Julia Costa", slug: "julia", insta: "@ju.games", seg: "95K", tipo: "Starter", perc: 10, jogos: 2, links: 2, receita: 8400, saldo: 1200, ultimoSaque: "15/02/2026", status: "Pausado", affiliate_link: "https://pixbet.com?ref=julia", landing_template: "Aviator Promo", observacoes: "Em pausa temporária", is_active: false, created_at: "2026-02-01", updated_at: "2026-02-28" },
  { id: 6, nome: "Marcos Oliveira", slug: "marcos", insta: "@marcos.bet", seg: "520K", tipo: "Premium", perc: 22, jogos: 5, links: 9, receita: 0, saldo: 0, ultimoSaque: "—", status: "Novo", affiliate_link: "", landing_template: "", observacoes: "Recém cadastrado", is_active: true, created_at: "2026-03-05", updated_at: "2026-03-05" },
];

export const initialJogos: Jogo[] = [
  { id: 1, nome: "Fortune Tiger", cat: "Slot", status: "Ativo", lp: "Fortune Tiger LP", plats: "Bet365, Betano, Sportingbet", links: 12, cliques: 18400, ctr: "14.2%", cadastros: 1245, receita: 32500 },
  { id: 2, nome: "Aviator", cat: "Crash", status: "Ativo", lp: "Aviator Promo", plats: "Bet365, Pixbet", links: 8, cliques: 12300, ctr: "11.8%", cadastros: 890, receita: 28100 },
  { id: 3, nome: "Gates of Olympus", cat: "Slot", status: "Ativo", lp: "—", plats: "Bet365, Betano, Sportingbet", links: 6, cliques: 8500, ctr: "9.4%", cadastros: 620, receita: 19800 },
  { id: 4, nome: "Mines", cat: "Casual", status: "Ativo", lp: "Mines Special", plats: "Sportingbet, Betano", links: 5, cliques: 6200, ctr: "8.1%", cadastros: 445, receita: 15200 },
  { id: 5, nome: "Spaceman", cat: "Crash", status: "Inativo", lp: "—", plats: "Pixbet", links: 2, cliques: 1800, ctr: "4.2%", cadastros: 120, receita: 3200 },
];

export const initialPlataformas: Plataforma[] = [
  { id: 1, nome: "Bet365", tipo: "CPA + RevShare", revshare: "30%", cpa: "R$ 50", moeda: "BRL", pagamento: "Mensal", status: "Ativo", links: 15, jogos: 5 },
  { id: 2, nome: "Betano", tipo: "Revenue Share", revshare: "25%", cpa: "—", moeda: "BRL", pagamento: "Quinzenal", status: "Ativo", links: 12, jogos: 4 },
  { id: 3, nome: "Sportingbet", tipo: "CPA", revshare: "—", cpa: "R$ 45", moeda: "BRL", pagamento: "Mensal", status: "Ativo", links: 8, jogos: 3 },
  { id: 4, nome: "Pixbet", tipo: "Revenue Share", revshare: "22%", cpa: "—", moeda: "BRL", pagamento: "Semanal", status: "Pendente", links: 5, jogos: 2 },
  { id: 5, nome: "KTO", tipo: "Hybrid", revshare: "20%", cpa: "R$ 35", moeda: "BRL", pagamento: "Mensal", status: "Ativo", links: 4, jogos: 3 },
];

export const initialLinks: LinkAfiliado[] = [
  { id: 1, nome: "FT-Bet365-Rafa", jogo: "Fortune Tiger", plat: "Bet365", influencer: "Rafael M.", uso: "Telegram", source: "playbet", medium: "telegram", campaign: "marco-turbo", subid: "rafa001", status: "Ativo", ultimoClique: "05/03 14:32", cliques: 4520 },
  { id: 2, nome: "AV-Pixbet-Pedro", jogo: "Aviator", plat: "Pixbet", influencer: "Pedro L.", uso: "Instagram", source: "playbet", medium: "instagram", campaign: "aviator-promo", subid: "pedro001", status: "Ativo", ultimoClique: "05/03 13:18", cliques: 3200 },
  { id: 3, nome: "MN-Betano-Carlos", jogo: "Mines", plat: "Betano", influencer: "Carlos S.", uso: "Grupo WA", source: "playbet", medium: "whatsapp", campaign: "mines-vip", subid: "carlos001", status: "Ativo", ultimoClique: "05/03 11:45", cliques: 2100 },
  { id: 4, nome: "GO-Bet365-Ana", jogo: "Gates of Olympus", plat: "Bet365", influencer: "Ana S.", uso: "Bio Link", source: "playbet", medium: "bio", campaign: "geral", subid: "ana001", status: "Ativo", ultimoClique: "04/03 22:10", cliques: 1800 },
  { id: 5, nome: "SP-Pixbet-Julia", jogo: "Spaceman", plat: "Pixbet", influencer: "Julia C.", uso: "Telegram", source: "playbet", medium: "telegram", campaign: "spaceman", subid: "julia001", status: "Inativo", ultimoClique: "28/02 15:30", cliques: 450 },
];

export const initialLandingPages: LandingPage[] = [
  { id: 1, nome: "Fortune Tiger LP", rota: "/fortune-tiger", tipo: "Jogo", jogo: "Fortune Tiger", plats: "Bet365, Betano", cliques: 12450, ctr: "14.2%", saida: "32%", status: "Ativo" },
  { id: 2, nome: "Aviator Promo", rota: "/aviator-promo", tipo: "Promoção", jogo: "Aviator", plats: "Bet365, Pixbet", cliques: 8320, ctr: "11.8%", saida: "28%", status: "Ativo" },
  { id: 3, nome: "Cadastro Geral", rota: "/cadastro", tipo: "Geral", jogo: "—", plats: "Todas", cliques: 15780, ctr: "9.6%", saida: "45%", status: "Ativo" },
  { id: 4, nome: "Mines Special", rota: "/mines-special", tipo: "Jogo", jogo: "Mines", plats: "Sportingbet", cliques: 5600, ctr: "2.8%", saida: "58%", status: "Revisão" },
];

export const initialCampanhas: Campanha[] = [
  { id: 1, nome: "Março Turbo", objetivo: "Aumentar cadastros em 30%", jogo: "Fortune Tiger", plat: "Bet365", influencer: "Rafael M.", inicio: "01/03", fim: "31/03", status: "Ativa", resultado: "+18% cadastros" },
  { id: 2, nome: "Aviator Week", objetivo: "Promover Aviator em todas plataformas", jogo: "Aviator", plat: "Todas", influencer: "Pedro L.", inicio: "10/03", fim: "17/03", status: "Planejada", resultado: "—" },
  { id: 3, nome: "Bônus Fev", objetivo: "Divulgar bônus de cadastro", jogo: "Vários", plat: "Betano", influencer: "Carlos S.", inicio: "01/02", fim: "28/02", status: "Finalizada", resultado: "+420 cadastros" },
  { id: 4, nome: "VIP Mines", objetivo: "Campanha exclusiva grupo VIP", jogo: "Mines", plat: "Sportingbet", influencer: "Ana S.", inicio: "15/02", fim: "01/03", status: "Finalizada", resultado: "+180 depósitos" },
];

export const initialSaques: Saque[] = [
  { id: "SAQ-001", nome: "Rafael Mendes", tipo: "Influencer", valor: 8500, origem: "Comissão afiliado", data: "05/03/2026", conta: "PIX •••4521", status: "Pendente", resp: "—" },
  { id: "SAQ-002", nome: "Ricardo Almeida", tipo: "Sócio", valor: 12000, origem: "Divisão societária", data: "04/03/2026", conta: "PIX •••8832", status: "Pendente", resp: "—" },
  { id: "SAQ-003", nome: "Ana Souza", tipo: "Influencer", valor: 2800, origem: "Comissão afiliado", data: "03/03/2026", conta: "PIX •••1199", status: "Aprovado", resp: "Admin" },
  { id: "SAQ-004", nome: "Fernanda Rocha", tipo: "Sócio", valor: 10500, origem: "Divisão societária", data: "02/03/2026", conta: "PIX •••7744", status: "Aprovado", resp: "Admin" },
  { id: "SAQ-005", nome: "Pedro Lima", tipo: "Influencer", valor: 6100, origem: "Comissão afiliado", data: "01/03/2026", conta: "PIX •••2266", status: "Recusado", resp: "Admin" },
  { id: "SAQ-006", nome: "Carlos Silva", tipo: "Influencer", valor: 3500, origem: "Comissão afiliado", data: "28/02/2026", conta: "PIX •••3388", status: "Aprovado", resp: "Admin" },
];

export const initialSocios: Socio[] = [
  { id: 1, nome: "Ricardo Almeida", part: 40, ganhos: 68340, disponivel: 16200, ultimoSaque: "01/03/2026", status: "Ativo" },
  { id: 2, nome: "Fernanda Rocha", part: 35, ganhos: 59797, disponivel: 14175, ultimoSaque: "28/02/2026", status: "Ativo" },
  { id: 3, nome: "Lucas Martins", part: 25, ganhos: 42712, disponivel: 10125, ultimoSaque: "25/02/2026", status: "Ativo" },
];

export const initialLPTemplates: LPTemplate[] = [
  { id: 1, nome: "Fortune Tiger LP", rotaBase: "/fortune-tiger", tipo: "Jogo", jogoVinculado: "Fortune Tiger", status: "Ativo", cliquesTotais: 12450, conversoesEstimadas: 1245 },
  { id: 2, nome: "Aviator Promo", rotaBase: "/aviator-promo", tipo: "Promoção", jogoVinculado: "Aviator", status: "Ativo", cliquesTotais: 8320, conversoesEstimadas: 890 },
  { id: 3, nome: "Cadastro Geral", rotaBase: "/cadastro", tipo: "Geral", jogoVinculado: "—", status: "Ativo", cliquesTotais: 15780, conversoesEstimadas: 1580 },
  { id: 4, nome: "Mines Special", rotaBase: "/mines-special", tipo: "Jogo", jogoVinculado: "Mines", status: "Inativo", cliquesTotais: 5600, conversoesEstimadas: 445 },
];

export const initialInfluencerLPs: InfluencerLP[] = [
  { id: 1, influencerId: 1, influencerNome: "Rafael Mendes", slug: "rafa", templateId: 1, templateNome: "Fortune Tiger LP", affiliateLink: "https://bet365.com?ref=rafa", urlPublica: "/i/rafa", cliques: 4520, status: "Ativo", ultimaAtividade: "05/03/2026 14:32" },
  { id: 2, influencerId: 2, influencerNome: "Pedro Lima", slug: "pedro", templateId: 2, templateNome: "Aviator Promo", affiliateLink: "https://pixbet.com?ref=pedro", urlPublica: "/i/pedro", cliques: 3200, status: "Ativo", ultimaAtividade: "05/03/2026 13:18" },
  { id: 3, influencerId: 3, influencerNome: "Carlos Silva", slug: "carlos", templateId: 1, templateNome: "Fortune Tiger LP", affiliateLink: "https://betano.com?ref=carlos", urlPublica: "/i/carlos", cliques: 2100, status: "Ativo", ultimaAtividade: "05/03/2026 11:45" },
  { id: 4, influencerId: 4, influencerNome: "Ana Souza", slug: "ana", templateId: 3, templateNome: "Cadastro Geral", affiliateLink: "https://bet365.com?ref=ana", urlPublica: "/i/ana", cliques: 1800, status: "Ativo", ultimaAtividade: "04/03/2026 22:10" },
  { id: 5, influencerId: 5, influencerNome: "Julia Costa", slug: "julia", templateId: 2, templateNome: "Aviator Promo", affiliateLink: "https://pixbet.com?ref=julia", urlPublica: "/i/julia", cliques: 450, status: "Inativo", ultimaAtividade: "28/02/2026 15:30" },
];

export const initialConteudos: ConteudoItem[] = [
  { id: 1, tema: "Compilação top crashes", tipo: "Reels", jogo: "Aviator", influencer: "Pedro L.", campanha: "Aviator Week", status: "Ideia", data: "10/03" },
  { id: 2, tema: "Link especial Gates of Olympus", tipo: "Post WA", jogo: "Gates", influencer: "Carlos S.", campanha: "—", status: "Ideia", data: "11/03" },
  { id: 3, tema: "Ganhos ao vivo Mines", tipo: "Reels", jogo: "Mines", influencer: "Rafael M.", campanha: "VIP Mines", status: "Roteiro", data: "08/03" },
  { id: 4, tema: "Top 5 jogos da semana", tipo: "Vídeo", jogo: "Vários", influencer: "Ana S.", campanha: "—", status: "Produção", data: "07/03" },
  { id: 5, tema: "Bônus Bet365 cadastro", tipo: "Story", jogo: "Fortune Tiger", influencer: "Carlos S.", campanha: "Março Turbo", status: "Agendado", data: "06/03" },
  { id: 6, tema: "Link exclusivo Aviator", tipo: "Post Telegram", jogo: "Aviator", influencer: "Pedro L.", campanha: "Aviator Week", status: "Agendado", data: "09/03" },
  { id: 7, tema: "Fortune Tiger dicas", tipo: "Reels", jogo: "Fortune Tiger", influencer: "Rafael M.", campanha: "Março Turbo", status: "Publicado", data: "04/03" },
];
