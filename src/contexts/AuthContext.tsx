import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole =
  | "admin_master"
  | "socio"
  | "financeiro"
  | "operacao"
  | "conteudo"
  | "visualizacao"
  | "gerente"
  | "influencer";

export type PreviewAs = AppRole | null;

export interface PreviewTarget {
  role: AppRole;
  userId?: string;
  influencerId?: string | null;
  managerId?: string | null;
  name?: string | null;
  email?: string | null;
}


interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  effectiveRole: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  previewAs: PreviewAs;
  setPreviewAs: (v: PreviewAs) => void;
  previewTarget: PreviewTarget | null;
  setPreviewTarget: (t: PreviewTarget | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PREVIEW_KEY = "playbet.previewAs";
const PREVIEW_TARGET_KEY = "playbet.previewTarget";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewAs, setPreviewAsState] = useState<PreviewAs>(() => {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(PREVIEW_KEY);
    return (v as PreviewAs) ?? null;
  });

  const [previewTarget, setPreviewTargetState] = useState<PreviewTarget | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(PREVIEW_TARGET_KEY);
      return raw ? (JSON.parse(raw) as PreviewTarget) : null;
    } catch { return null; }
  });

  const setPreviewAs = (v: PreviewAs) => {
    setPreviewAsState(v);
    if (typeof window !== "undefined") {
      if (v) window.localStorage.setItem(PREVIEW_KEY, v);
      else {
        window.localStorage.removeItem(PREVIEW_KEY);
        window.localStorage.removeItem(PREVIEW_TARGET_KEY);
      }
    }
    if (!v) setPreviewTargetState(null);
  };

  const setPreviewTarget = (t: PreviewTarget | null) => {
    setPreviewTargetState(t);
    if (typeof window !== "undefined") {
      if (t) {
        window.localStorage.setItem(PREVIEW_TARGET_KEY, JSON.stringify(t));
        window.localStorage.setItem(PREVIEW_KEY, t.role);
        setPreviewAsState(t.role);
      } else {
        window.localStorage.removeItem(PREVIEW_TARGET_KEY);
      }
    }
  };

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setRole(data.role as AppRole);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRole(session.user.id), 0);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setPreviewAs(null);
  };

  const isAdmin = role === "admin_master" || role === "socio";
  const effectiveRole: AppRole | null =
    isAdmin && (previewAs === "influencer" || previewAs === "gerente") ? previewAs : role;


  return (
    <AuthContext.Provider
      value={{
        user, session, role, effectiveRole, loading,
        signIn, signUp, signOut, isAdmin,
        previewAs, setPreviewAs,
        previewTarget, setPreviewTarget,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

/**
 * Returns effective influencer/manager id for the current view.
 * When admin is previewing a specific user, returns that user's ids;
 * otherwise returns null and callers should fall back to fetching their own profile.
 */
export function usePreviewScope() {
  const { isAdmin, previewTarget } = useAuth();
  const active = isAdmin && !!previewTarget;
  return {
    active,
    influencerId: active ? previewTarget?.influencerId ?? null : null,
    managerId: active ? previewTarget?.managerId ?? null : null,
    target: previewTarget,
  };
}
