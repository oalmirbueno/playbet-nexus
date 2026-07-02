import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MateriaisView } from "@/components/materials/MateriaisView";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortalMateriais() {
  const { user } = useAuth();
  const [infId, setInfId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("influencer_id").eq("id", user.id).maybeSingle();
      setInfId(data?.influencer_id ?? null);
    })();
  }, [user]);

  if (infId === undefined) return <Skeleton className="h-64 w-full" />;
  return <MateriaisView influencerId={infId} title="Meus Materiais" />;
}
