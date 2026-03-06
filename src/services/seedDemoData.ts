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

  // 9. Clicks (simulated)
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
}
