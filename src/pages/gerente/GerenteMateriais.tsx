import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MateriaisView } from "@/components/materials/MateriaisView";
import { Skeleton } from "@/components/ui/skeleton";

export default function GerenteMateriais() {
  const { user } = useAuth();
  const [mgrId, setMgrId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("manager_id").eq("id", user.id).maybeSingle();
      setMgrId(data?.manager_id ?? null);
    })();
  }, [user]);

  if (mgrId === undefined) return <Skeleton className="h-64 w-full" />;
  return <MateriaisView managerId={mgrId} title="Materiais do Squad" showInfluencer readOnly />;
}
