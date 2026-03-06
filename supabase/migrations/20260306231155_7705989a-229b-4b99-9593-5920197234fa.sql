
-- Campanhas table
CREATE TABLE public.campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  objetivo text,
  jogo text,
  plataforma text,
  influencer text,
  inicio date,
  fim date,
  status text DEFAULT 'Planejada',
  resultado text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage campanhas" ON public.campanhas FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read campanhas" ON public.campanhas FOR SELECT TO authenticated USING (true);

-- Socios table
CREATE TABLE public.socios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  participacao numeric NOT NULL DEFAULT 0,
  ganhos numeric NOT NULL DEFAULT 0,
  disponivel numeric NOT NULL DEFAULT 0,
  ultimo_saque text,
  status text DEFAULT 'Ativo',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage socios" ON public.socios FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read socios" ON public.socios FOR SELECT TO authenticated USING (true);

-- Saques table
CREATE TABLE public.saques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'Influencer',
  valor numeric NOT NULL DEFAULT 0,
  origem text,
  data date DEFAULT now(),
  conta text,
  status text DEFAULT 'Pendente',
  responsavel text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.saques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage saques" ON public.saques FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read saques" ON public.saques FOR SELECT TO authenticated USING (true);

-- Conteudo table
CREATE TABLE public.conteudo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tema text NOT NULL,
  tipo text,
  formato text,
  canal text,
  jogo text,
  influencer text,
  campanha text,
  lp text,
  status text DEFAULT 'Ideia',
  prioridade text DEFAULT 'Média',
  data date,
  data_publicacao date,
  responsavel text,
  cta text,
  roteiro text,
  objetivo text,
  observacoes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.conteudo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage conteudo" ON public.conteudo FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read conteudo" ON public.conteudo FOR SELECT TO authenticated USING (true);

-- Updated_at triggers
CREATE TRIGGER update_campanhas_updated_at BEFORE UPDATE ON public.campanhas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_socios_updated_at BEFORE UPDATE ON public.socios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saques_updated_at BEFORE UPDATE ON public.saques FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conteudo_updated_at BEFORE UPDATE ON public.conteudo FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
