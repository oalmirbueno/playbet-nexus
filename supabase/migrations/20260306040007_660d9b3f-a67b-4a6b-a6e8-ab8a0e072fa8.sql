
-- 1. Create roles enum
CREATE TYPE public.app_role AS ENUM ('admin_master', 'socio', 'financeiro', 'operacao', 'conteudo', 'visualizacao');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user has any admin-level role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin_master', 'socio')
  )
$$;

-- RLS for user_roles
CREATE POLICY "Authenticated users can read roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- 4. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  -- First user gets admin_master role
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin_master');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'visualizacao');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 6. Platforms table
CREATE TABLE public.platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  commission_type TEXT,
  revshare NUMERIC,
  cpa NUMERIC,
  hybrid BOOLEAN DEFAULT false,
  currency TEXT DEFAULT 'BRL',
  payout_method TEXT,
  affiliate_manager TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read platforms" ON public.platforms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage platforms" ON public.platforms FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE ON public.platforms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Games table
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  trend_status TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read games" ON public.games FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage games" ON public.games FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Influencers table
CREATE TABLE public.influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  instagram TEXT,
  followers INTEGER,
  slug TEXT UNIQUE NOT NULL,
  affiliate_link TEXT,
  commission_percent NUMERIC DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read influencers" ON public.influencers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage influencers" ON public.influencers FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON public.influencers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Templates table
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  main_game TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read templates" ON public.templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage templates" ON public.templates FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Landing Pages table
CREATE TABLE public.landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  route TEXT UNIQUE NOT NULL,
  type TEXT,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  platform_id UUID REFERENCES public.platforms(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read landing_pages" ON public.landing_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can read active landing pages" ON public.landing_pages FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Admins can manage landing_pages" ON public.landing_pages FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER update_landing_pages_updated_at BEFORE UPDATE ON public.landing_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. UTMs table
CREATE TABLE public.utms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  subid TEXT,
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE SET NULL,
  landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  platform_id UUID REFERENCES public.platforms(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.utms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read utms" ON public.utms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage utms" ON public.utms FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER update_utms_updated_at BEFORE UPDATE ON public.utms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Clicks table
CREATE TABLE public.clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE CASCADE,
  landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  utm_id UUID REFERENCES public.utms(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  route TEXT,
  source TEXT
);
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read clicks" ON public.clicks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert clicks" ON public.clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage clicks" ON public.clicks FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- 13. Games-Platforms junction table
CREATE TABLE public.game_platforms (
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES public.platforms(id) ON DELETE CASCADE,
  PRIMARY KEY (game_id, platform_id)
);
ALTER TABLE public.game_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read game_platforms" ON public.game_platforms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage game_platforms" ON public.game_platforms FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
