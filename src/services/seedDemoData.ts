import { supabase } from "@/integrations/supabase/client";

export async function seedDemoData() {
  // 1. Platforms
  const platforms = [
    { name: "Bet365", commission_type: "CPA + RevShare", revshare: 30, cpa: 50, currency: "BRL", payout_method: "Mensal", is_active: true, is_demo: true },
    { name: "Betano", commission_type: "Revenue Share", revshare: 25, cpa: null, currency: "BRL", payout_method: "Quinzenal", is_active: true, is_demo: true },
    { name: "Sportingbet", commission_type: "CPA", revshare: null, cpa: 45, currency: "BRL", payout_method: "Mensal", is_active: true, is_demo: true },
    { name: "Pixbet", commission_type: "Revenue Share", revshare: 22, cpa: null, currency: "BRL", payout_method: "Semanal", is_active: true, is_demo: true },
    { name: "KTO", commission_type: "Hybrid", revshare: 20, cpa: 35, currency: "BRL", payout_method: "Mensal", hybrid: true, is_active: true, is_demo: true },
  ];
  const { data: platData, error: platErr } = await supabase.from("platforms").insert(platforms).select();
  if (platErr) throw platErr;

  // 2. Games
  const games = [
    { name: "Fortune Tiger", category: "Slot", is_active: true, trend_status: "Em alta", is_demo: true },
    { name: "Aviator", category: "Crash", is_active: true, trend_status: "Estável", is_demo: true },
    { name: "Gates of Olympus", category: "Slot", is_active: true, trend_status: "Em alta", is_demo: true },
    { name: "Mines", category: "Casual", is_active: true, trend_status: "Estável", is_demo: true },
    { name: "Spaceman", category: "Crash", is_active: false, trend_status: "Em queda", is_demo: true },
  ];
  const { data: gameData, error: gameErr } = await supabase.from("games").insert(games).select();
  if (gameErr) throw gameErr;

  // 3. Game-Platform relationships
  const gpLinks = [];
  for (const g of gameData!) {
    const shuffled = [...platData!].sort(() => 0.5 - Math.random());
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count && i < shuffled.length; i++) {
      gpLinks.push({ game_id: g.id, platform_id: shuffled[i].id, is_demo: true });
    }
  }
  await supabase.from("game_platforms").insert(gpLinks);

  // 4. Influencers
  const influencers = [
    { name: "Rafael Mendes", slug: "rafael-mendes", instagram: "@rafa.bet", followers: 410000, commission_percent: 20, is_active: true, notes: "Influencer premium, foco em slots", is_demo: true },
    { name: "Pedro Lima", slug: "pedro-lima", instagram: "@pedro.apostas", followers: 320000, commission_percent: 18, is_active: true, notes: "Especialista em crash games", is_demo: true },
    { name: "Carlos Silva", slug: "carlos-silva", instagram: "@carlos.bet", followers: 250000, commission_percent: 15, is_active: true, is_demo: true },
    { name: "Ana Souza", slug: "ana-souza", instagram: "@ana.plays", followers: 180000, commission_percent: 12, is_active: true, is_demo: true },
    { name: "Julia Costa", slug: "julia-costa", instagram: "@ju.games", followers: 95000, commission_percent: 10, is_active: false, notes: "Em pausa temporária", is_demo: true },
    { name: "Marcos Oliveira", slug: "marcos-oliveira", instagram: "@marcos.bet", followers: 520000, commission_percent: 22, is_active: true, notes: "Recém cadastrado, alto potencial", is_demo: true },
  ];
  const { data: infData, error: infErr } = await supabase.from("influencers").insert(influencers).select();
  if (infErr) throw infErr;

  // 5. Templates
  const templates = [
    { name: "Fortune Tiger LP", type: "Jogo", main_game: "Fortune Tiger", is_active: true, is_demo: true },
    { name: "Aviator Promo", type: "Promoção", main_game: "Aviator", is_active: true, is_demo: true },
    { name: "Cadastro Geral", type: "Geral", main_game: null, is_active: true, is_demo: true },
    { name: "Mines Special", type: "Jogo", main_game: "Mines", is_active: false, is_demo: true },
  ];
  const { data: tplData, error: tplErr } = await supabase.from("templates").insert(templates).select();
  if (tplErr) throw tplErr;

  // 6. Landing Pages
  const landingPages = [
    { name: "Fortune Tiger LP", slug: "fortune-tiger", route: "/fortune-tiger", type: "Jogo", domain: "https://oportunidades.playbet.app.br", game_id: gameData![0].id, platform_id: platData![0].id, template_id: tplData![0].id, is_active: true, is_demo: true },
    { name: "Aviator Promo", slug: "aviator-promo", route: "/aviator-promo", type: "Promoção", domain: "https://promo.playbet.app.br", game_id: gameData![1].id, platform_id: platData![0].id, template_id: tplData![1].id, is_active: true, is_demo: true },
    { name: "Cadastro Geral", slug: "cadastro", route: "/cadastro", type: "Geral", domain: "https://cadastro.playbet.app.br", game_id: null, platform_id: null, template_id: tplData![2].id, is_active: true, is_demo: true },
    { name: "Mines Special", slug: "mines-special", route: "/mines-special", type: "Jogo", domain: "https://mines.playbet.app.br", game_id: gameData![3].id, platform_id: platData![2].id, template_id: tplData![3].id, is_active: false, is_demo: true },
  ];
  const { data: lpData, error: lpErr } = await supabase.from("landing_pages").insert(landingPages).select();
  if (lpErr) throw lpErr;

  // 7. Landing Page Instances
  const instances = [
    { landing_page_id: lpData![0].id, influencer_id: infData![0].id, slug: "rafael-mendes", affiliate_link: "https://bet365.com?ref=rafa", is_active: true, is_demo: true },
    { landing_page_id: lpData![1].id, influencer_id: infData![1].id, slug: "pedro-lima", affiliate_link: "https://pixbet.com?ref=pedro", is_active: true, is_demo: true },
    { landing_page_id: lpData![0].id, influencer_id: infData![2].id, slug: "carlos-silva", affiliate_link: "https://betano.com?ref=carlos", is_active: true, is_demo: true },
    { landing_page_id: lpData![2].id, influencer_id: infData![3].id, slug: "ana-souza", affiliate_link: "https://bet365.com?ref=ana", is_active: true, is_demo: true },
    { landing_page_id: lpData![1].id, influencer_id: infData![4].id, slug: "julia-costa", affiliate_link: "https://pixbet.com?ref=julia", is_active: false, is_demo: true },
    { landing_page_id: lpData![0].id, influencer_id: infData![5].id, slug: "marcos-oliveira", affiliate_link: "https://bet365.com?ref=marcos", is_active: true, is_demo: true },
  ];
  await supabase.from("landing_page_instances").insert(instances);

  // 8. UTMs
  const utms = [
    { utm_source: "playbet", utm_medium: "telegram", utm_campaign: "marco-turbo", subid: "rafa001", influencer_id: infData![0].id, game_id: gameData![0].id, platform_id: platData![0].id, landing_page_id: lpData![0].id, template_id: tplData![0].id, is_active: true, is_demo: true },
    { utm_source: "playbet", utm_medium: "instagram", utm_campaign: "aviator-promo", subid: "pedro001", influencer_id: infData![1].id, game_id: gameData![1].id, platform_id: platData![0].id, landing_page_id: lpData![1].id, template_id: tplData![1].id, is_active: true, is_demo: true },
    { utm_source: "playbet", utm_medium: "whatsapp", utm_campaign: "mines-vip", subid: "carlos001", influencer_id: infData![2].id, game_id: gameData![3].id, platform_id: platData![1].id, landing_page_id: lpData![0].id, template_id: tplData![0].id, is_active: true, is_demo: true },
    { utm_source: "playbet", utm_medium: "bio", utm_campaign: "geral", subid: "ana001", influencer_id: infData![3].id, game_id: gameData![2].id, platform_id: platData![0].id, landing_page_id: lpData![2].id, template_id: tplData![2].id, is_active: true, is_demo: true },
    { utm_source: "playbet", utm_medium: "telegram", utm_campaign: "spaceman", subid: "julia001", influencer_id: infData![4].id, game_id: gameData![4].id, platform_id: platData![3].id, landing_page_id: lpData![1].id, template_id: tplData![1].id, is_active: false, is_demo: true },
  ];
  await supabase.from("utms").insert(utms);

  // 9. Clicks (simulated — 50 clicks over 30 days)
  const clicks = [];
  const now = new Date();
  for (let i = 0; i < 50; i++) {
    const randInf = infData![Math.floor(Math.random() * infData!.length)];
    const randLp = lpData![Math.floor(Math.random() * lpData!.length)];
    const randTpl = tplData![Math.floor(Math.random() * tplData!.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const clickDate = new Date(now.getTime() - daysAgo * 86400000);
    clicks.push({
      influencer_id: randInf.id,
      landing_page_id: randLp.id,
      template_id: randTpl.id,
      route: randLp.route,
      source: "demo",
      clicked_at: clickDate.toISOString(),
      is_demo: true,
    });
  }
  await supabase.from("clicks").insert(clicks);

  // 10. Campanhas
  const campanhas = [
    { nome: "Março Turbo", objetivo: "Aumentar cadastros em 30%", jogo: "Fortune Tiger", plataforma: "Bet365", influencer: "Rafael M.", inicio: "2026-03-01", fim: "2026-03-31", status: "Ativa", resultado: "+18% cadastros", is_demo: true },
    { nome: "Aviator Week", objetivo: "Promover Aviator em todas plataformas", jogo: "Aviator", plataforma: "Todas", influencer: "Pedro L.", inicio: "2026-03-10", fim: "2026-03-17", status: "Planejada", resultado: "—", is_demo: true },
    { nome: "Bônus Fev", objetivo: "Divulgar bônus de cadastro", jogo: "Vários", plataforma: "Betano", influencer: "Carlos S.", inicio: "2026-02-01", fim: "2026-02-28", status: "Finalizada", resultado: "+420 cadastros", is_demo: true },
    { nome: "VIP Mines", objetivo: "Campanha exclusiva grupo VIP", jogo: "Mines", plataforma: "Sportingbet", influencer: "Ana S.", inicio: "2026-02-15", fim: "2026-03-01", status: "Finalizada", resultado: "+180 depósitos", is_demo: true },
  ];
  await supabase.from("campanhas").insert(campanhas);

  // 11. Sócios
  const socios = [
    { nome: "Ricardo Almeida", participacao: 40, ganhos: 68340, disponivel: 16200, ultimo_saque: "01/03/2026", status: "Ativo", is_demo: true },
    { nome: "Fernanda Rocha", participacao: 35, ganhos: 59797, disponivel: 14175, ultimo_saque: "28/02/2026", status: "Ativo", is_demo: true },
    { nome: "Lucas Martins", participacao: 25, ganhos: 42712, disponivel: 10125, ultimo_saque: "25/02/2026", status: "Ativo", is_demo: true },
  ];
  await supabase.from("socios").insert(socios);

  // 12. Saques
  const saques = [
    { codigo: "SAQ-001", nome: "Rafael Mendes", tipo: "Influencer", valor: 8500, origem: "Comissão afiliado", data: "2026-03-05", conta: "PIX •••4521", status: "Pendente", responsavel: "—", is_demo: true },
    { codigo: "SAQ-002", nome: "Ricardo Almeida", tipo: "Sócio", valor: 12000, origem: "Divisão societária", data: "2026-03-04", conta: "PIX •••8832", status: "Pendente", responsavel: "—", is_demo: true },
    { codigo: "SAQ-003", nome: "Ana Souza", tipo: "Influencer", valor: 2800, origem: "Comissão afiliado", data: "2026-03-03", conta: "PIX •••1199", status: "Aprovado", responsavel: "Admin", is_demo: true },
    { codigo: "SAQ-004", nome: "Fernanda Rocha", tipo: "Sócio", valor: 10500, origem: "Divisão societária", data: "2026-03-02", conta: "PIX •••7744", status: "Aprovado", responsavel: "Admin", is_demo: true },
    { codigo: "SAQ-005", nome: "Pedro Lima", tipo: "Influencer", valor: 6100, origem: "Comissão afiliado", data: "2026-03-01", conta: "PIX •••2266", status: "Recusado", responsavel: "Admin", is_demo: true },
    { codigo: "SAQ-006", nome: "Carlos Silva", tipo: "Influencer", valor: 3500, origem: "Comissão afiliado", data: "2026-02-28", conta: "PIX •••3388", status: "Aprovado", responsavel: "Admin", is_demo: true },
  ];
  await supabase.from("saques").insert(saques);

  // 13. Conteúdo / Calendário Editorial
  const conteudo = [
    { tema: "Compilação top crashes", tipo: "Reels", formato: "Vertical 9:16", canal: "Instagram", jogo: "Aviator", influencer: "Pedro L.", campanha: "Aviator Week", lp: "Aviator Promo", status: "Ideia", prioridade: "Alta", data: "2026-03-10", responsavel: "Equipe", cta: "Link na bio", objetivo: "Engajamento e cliques", is_demo: true },
    { tema: "Link especial Gates of Olympus", tipo: "Post", formato: "Texto + imagem", canal: "WhatsApp", jogo: "Gates", influencer: "Carlos S.", campanha: "—", lp: "—", status: "Ideia", prioridade: "Média", data: "2026-03-11", responsavel: "Carlos", is_demo: true },
    { tema: "Ganhos ao vivo Mines", tipo: "Reels", formato: "Vertical 9:16", canal: "TikTok", jogo: "Mines", influencer: "Rafael M.", campanha: "VIP Mines", lp: "Mines Special", status: "Roteiro", prioridade: "Alta", data: "2026-03-08", responsavel: "Rafael", cta: "Cadastre-se agora", roteiro: "Abrir com print de ganho alto. Mostrar gameplay de 30s. CTA no final.", is_demo: true },
    { tema: "Top 5 jogos da semana", tipo: "Vídeo", formato: "Horizontal 16:9", canal: "YouTube", jogo: "Vários", influencer: "Ana S.", campanha: "—", lp: "Cadastro Geral", status: "Produção", prioridade: "Média", data: "2026-03-07", responsavel: "Ana", cta: "Link na descrição", is_demo: true },
    { tema: "Bônus Bet365 cadastro", tipo: "Story", formato: "Vertical 9:16", canal: "Instagram", jogo: "Fortune Tiger", influencer: "Carlos S.", campanha: "Março Turbo", lp: "Fortune Tiger LP", status: "Agendado", prioridade: "Alta", data: "2026-03-06", responsavel: "Carlos", cta: "Arrasta pra cima", is_demo: true },
    { tema: "Link exclusivo Aviator", tipo: "Post", formato: "Texto + link", canal: "Telegram", jogo: "Aviator", influencer: "Pedro L.", campanha: "Aviator Week", lp: "Aviator Promo", status: "Agendado", prioridade: "Alta", data: "2026-03-09", responsavel: "Pedro", cta: "Clique e jogue", is_demo: true },
    { tema: "Fortune Tiger dicas", tipo: "Reels", formato: "Vertical 9:16", canal: "Instagram", jogo: "Fortune Tiger", influencer: "Rafael M.", campanha: "Março Turbo", lp: "Fortune Tiger LP", status: "Publicado", prioridade: "Alta", data: "2026-03-04", data_publicacao: "2026-03-04", responsavel: "Rafael", cta: "Bio link", is_demo: true },
    { tema: "Prova social depósitos", tipo: "Story", formato: "Vertical 9:16", canal: "Instagram", jogo: "Fortune Tiger", influencer: "Rafael M.", campanha: "Março Turbo", lp: "Fortune Tiger LP", status: "Produção", prioridade: "Média", data: "2026-03-12", responsavel: "Equipe", cta: "Link na bio", is_demo: true },
    { tema: "Live tirada de dúvidas", tipo: "Live", formato: "Vertical", canal: "Instagram", jogo: "Vários", influencer: "Ana S.", campanha: "—", lp: "Cadastro Geral", status: "Ideia", prioridade: "Baixa", data: "2026-03-14", responsavel: "Ana", observacoes: "Confirmar horário", is_demo: true },
    { tema: "Teaser novo jogo Spaceman", tipo: "Reels", formato: "Vertical 9:16", canal: "TikTok", jogo: "Spaceman", influencer: "Pedro L.", campanha: "—", lp: "—", status: "Pausado", prioridade: "Baixa", data: "2026-03-15", responsavel: "Pedro", observacoes: "Jogo inativo, aguardar reativação", is_demo: true },
  ];
  await supabase.from("conteudo").insert(conteudo);
}

export async function clearDemoData() {
  // Delete only demo records, in FK order
  await supabase.from("clicks").delete().eq("is_demo", true);
  await supabase.from("utms").delete().eq("is_demo", true);
  await supabase.from("landing_page_instances").delete().eq("is_demo", true);
  await supabase.from("landing_pages").delete().eq("is_demo", true);
  await supabase.from("templates").delete().eq("is_demo", true);
  await supabase.from("game_platforms").delete().eq("is_demo", true);
  await supabase.from("games").delete().eq("is_demo", true);
  await supabase.from("platforms").delete().eq("is_demo", true);
  await supabase.from("influencers").delete().eq("is_demo", true);
  await supabase.from("conteudo").delete().eq("is_demo", true);
  await supabase.from("campanhas").delete().eq("is_demo", true);
  await supabase.from("saques").delete().eq("is_demo", true);
  await supabase.from("socios").delete().eq("is_demo", true);
}
