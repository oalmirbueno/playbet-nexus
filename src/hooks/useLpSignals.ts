import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { lpSignalService, type LpSignalRow, type SignalStatus } from "@/services/lpSignalService";

export function useLpSignals(status?: SignalStatus) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data = [], isLoading } = useQuery({
    queryKey: ["lp_signals", status ?? "all"],
    queryFn: () => (status ? lpSignalService.getByStatus(status) : lpSignalService.getAll()),
  });

  const createMut = useMutation({
    mutationFn: (item: Partial<LpSignalRow>) => lpSignalService.create(item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lp_signals"] });
      toast({ title: "Sinal registrado" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao registrar sinal", description: e?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<LpSignalRow> }) =>
      lpSignalService.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lp_signals"] });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao atualizar sinal", description: e?.message, variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => lpSignalService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lp_signals"] });
      toast({ title: "Sinal removido" });
    },
  });

  return {
    data,
    isLoading,
    create: createMut.mutateAsync,
    update: (id: string, updates: Partial<LpSignalRow>) =>
      updateMut.mutateAsync({ id, updates }),
    remove: removeMut.mutateAsync,
  };
}
