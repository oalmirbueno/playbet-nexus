import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { lpEventService, type LpEventRow } from "@/services/lpEventService";

export function useLpEvents() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data = [], isLoading } = useQuery({
    queryKey: ["lp_events"],
    queryFn: lpEventService.getAll,
  });

  const createMut = useMutation({
    mutationFn: (item: Partial<LpEventRow>) => lpEventService.create(item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lp_events"] });
      toast({ title: "Evento criado" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao criar evento", description: e?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<LpEventRow> }) =>
      lpEventService.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lp_events"] });
      toast({ title: "Evento atualizado" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao atualizar evento", description: e?.message, variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => lpEventService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lp_events"] });
      toast({ title: "Evento removido" });
    },
  });

  return {
    data,
    isLoading,
    create: createMut.mutateAsync,
    update: (id: string, updates: Partial<LpEventRow>) =>
      updateMut.mutateAsync({ id, updates }),
    remove: removeMut.mutateAsync,
  };
}
