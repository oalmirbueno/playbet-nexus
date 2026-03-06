// Types prepared for Supabase migration
// Each type mirrors a future database table

export interface Influencer {
  id: number;
  nome: string;
  slug: string;
  insta: string;
  seg: string;
  tipo: "Premium" | "Standard" | "Starter";
  perc: number;
  jogos: number;
  links: number;
  receita: number;
  saldo: number;
  ultimoSaque: string;
  status: "Ativo" | "Pausado" | "Novo" | "Inativo";
  affiliate_link: string;
  landing_template: string;
  observacoes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Jogo {
  id: number;
  nome: string;
  cat: string;
  status: "Ativo" | "Inativo";
  lp: string;
  plats: string;
  links: number;
  cliques: number;
  ctr: string;
  cadastros: number;
  receita: number;
}

export interface Plataforma {
  id: number;
  nome: string;
  tipo: string;
  revshare: string;
  cpa: string;
  moeda: string;
  pagamento: string;
  status: "Ativo" | "Pendente" | "Inativo";
  links: number;
  jogos: number;
}

export interface LinkAfiliado {
  id: number;
  nome: string;
  jogo: string;
  plat: string;
  influencer: string;
  uso: string;
  source: string;
  medium: string;
  campaign: string;
  subid: string;
  status: "Ativo" | "Inativo";
  ultimoClique: string;
  cliques: number;
}

export interface LandingPage {
  id: number;
  nome: string;
  rota: string;
  tipo: string;
  jogo: string;
  plats: string;
  cliques: number;
  ctr: string;
  saida: string;
  status: "Ativo" | "Revisão" | "Inativo";
}

export interface Campanha {
  id: number;
  nome: string;
  objetivo: string;
  jogo: string;
  plat: string;
  influencer: string;
  inicio: string;
  fim: string;
  status: "Ativa" | "Planejada" | "Finalizada";
  resultado: string;
}

export interface Saque {
  id: string;
  nome: string;
  tipo: "Influencer" | "Sócio";
  valor: number;
  origem: string;
  data: string;
  conta: string;
  status: "Pendente" | "Aprovado" | "Recusado";
  resp: string;
}

export interface Socio {
  id: number;
  nome: string;
  part: number;
  ganhos: number;
  disponivel: number;
  ultimoSaque: string;
  status: "Ativo" | "Inativo";
}

export interface LPTemplate {
  id: number;
  nome: string;
  rotaBase: string;
  tipo: string;
  jogoVinculado: string;
  status: "Ativo" | "Inativo";
  cliquesTotais: number;
  conversoesEstimadas: number;
}

export interface InfluencerLP {
  id: number;
  influencerId: number;
  influencerNome: string;
  slug: string;
  templateId: number;
  templateNome: string;
  affiliateLink: string;
  urlPublica: string;
  cliques: number;
  status: "Ativo" | "Inativo";
  ultimaAtividade: string;
}

export interface Click {
  id: number;
  influencer_id: number;
  clicked_at: string;
  ip_address: string;
  user_agent: string;
  referrer: string;
}

export interface ConteudoItem {
  id: number;
  tema: string;
  tipo: string;
  formato?: string;
  canal?: string;
  jogo: string;
  influencer: string;
  campanha: string;
  lp?: string;
  status: "Ideia" | "Roteiro" | "Produção" | "Revisão" | "Agendado" | "Publicado" | "Pausado";
  prioridade?: "Alta" | "Média" | "Baixa";
  data: string;
  dataPublicacao?: string;
  responsavel?: string;
  cta?: string;
  roteiro?: string;
  objetivo?: string;
  observacoes?: string;
}
