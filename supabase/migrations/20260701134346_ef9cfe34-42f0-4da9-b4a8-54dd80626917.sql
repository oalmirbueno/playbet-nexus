ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS allowed_modules text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS denied_modules text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Admin master can update any profile (needed for permission management)
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Admin master can manage any user_role
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;
CREATE POLICY "Admins manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));