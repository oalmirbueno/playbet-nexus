import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { lpOpportunityService, type LpOpportunityRow } from "@/services/lpOpportunityService";

export function useLpOpportunities() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data = [], isLoading } = useQuery({
    queryKey: ["lp_opportunities"],
    queryFn: lpOpportunityService.getAll,
  });

  const createMut = useMutation({
    mutationFn: (item: Partial<LpOpportunityRow>) => lpOpportunityService.create(item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lp_opportunities"] });
      toast({ title: "Oportunidade criada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao criar", description: e?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<LpOpportunityRow> }) =>
      lpOpportunityService.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lp_opportunities"] });
      toast({ title: "Oportunidade atualizada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao atualizar", description: e?.message, variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => lpOpportunityService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lp_opportunities"] });
      toast({ title: "Oportunidade removida" });
    },
  });

  return {
    data,
    isLoading,
    create: createMut.mutateAsync,
    update: (id: string, updates: Partial<LpOpportunityRow>) =>
      updateMut.mutateAsync({ id, updates }),
    toggleActive: (id: string, current: boolean) =>
      updateMut.mutateAsync({ id, updates: { is_active: !current } }),
    remove: removeMut.mutateAsync,
  };
}
