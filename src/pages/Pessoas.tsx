import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, UserCheck, Award, Briefcase } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import SquadsTab from "@/components/people/SquadsTab";
import Influencers from "@/pages/Influencers";
import Socios from "@/pages/Socios";

/**
 * Hub unificado de Pessoas:
 *   Squads → Equipe (Influencers + Gerentes) → Sócios
 * Mantém as páginas existentes intactas, apenas reorganiza num único ponto de acesso.
 */
export default function Pessoas() {
  return (
    <div className="space-y-5">
      <div>
        <Breadcrumbs items={[{ label: "Pessoas" }]} />
        <h1 className="text-[22px] font-semibold tracking-tight mt-1">Pessoas</h1>
        <p className="text-[13px] text-muted-foreground">Squads · gerentes · influencers · sócios em um só lugar</p>
      </div>

      <Tabs defaultValue="squads" className="w-full">
        <TabsList className="bg-secondary/40">
          <TabsTrigger value="squads" className="text-xs gap-1.5"><Briefcase size={12} /> Squads</TabsTrigger>
          <TabsTrigger value="equipe" className="text-xs gap-1.5"><Users size={12} /> Equipe</TabsTrigger>
          <TabsTrigger value="socios" className="text-xs gap-1.5"><Award size={12} /> Sócios</TabsTrigger>
        </TabsList>

        <TabsContent value="squads" className="mt-5">
          <SquadsTab />
        </TabsContent>

        <TabsContent value="equipe" className="mt-5">
          {/* Reusa a página existente que já tem sub-tabs Influencers/Gerentes */}
          <div className="-mt-5"><Influencers /></div>
        </TabsContent>

        <TabsContent value="socios" className="mt-5">
          <div className="-mt-5"><Socios /></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
