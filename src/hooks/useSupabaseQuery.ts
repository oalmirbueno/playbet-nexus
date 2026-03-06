import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  influencerService,
  platformService,
  gameService,
  templateService,
  landingPageService,
  utmService,
  landingPageInstanceService,
  campanhaService,
  socioService,
  saqueService,
  conteudoService,
} from "@/services/supabaseService";
import { useDemoMode } from "@/contexts/DemoModeContext";

// ── Generic hook factory ──
function useEntityCrud<Row extends Record<string, any>>(
  key: string,
  service: {
    getAll: () => Promise<Row[]>;
    create: (item: any) => Promise<Row>;
    update: (id: string, updates: any) => Promise<Row>;
    toggleActive: (id: string, current: boolean) => Promise<Row>;
    remove?: (id: string) => Promise<void>;
  },
  entityName: string,
  demoMode: "all" | "real" | "demo",
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [key],
    queryFn: service.getAll,
  });

  // Filter data based on demo mode
  const filteredData = (query.data ?? []).filter((row) => {
    if (demoMode === "all") return true;
    if (demoMode === "real") return !(row as any).is_demo;
    if (demoMode === "demo") return (row as any).is_demo;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: (item: any) => service.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] });
      toast({ title: `${entityName} criado(a)` });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      service.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] });
      toast({ title: `${entityName} atualizado(a)` });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, current }: { id: string; current: boolean }) =>
      service.toggleActive(id, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] });
      toast({ title: `Status atualizado` });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => service.remove?.(id) ?? Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] });
      toast({ title: `${entityName} removido(a)` });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  return {
    data: filteredData,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    toggle: toggleMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}

// ── Entity hooks ──
export const useInfluencers = () => {
  const { demoMode } = useDemoMode();
  return useEntityCrud("influencers", influencerService, "Influencer", demoMode);
};
export const usePlatforms = () => {
  const { demoMode } = useDemoMode();
  return useEntityCrud("platforms", platformService, "Plataforma", demoMode);
};
export const useGames = () => {
  const { demoMode } = useDemoMode();
  return useEntityCrud("games", gameService, "Jogo", demoMode);
};
export const useTemplates = () => {
  const { demoMode } = useDemoMode();
  return useEntityCrud("templates", templateService, "Template", demoMode);
};
export const useLandingPages = () => {
  const { demoMode } = useDemoMode();
  return useEntityCrud("landing_pages", landingPageService, "Landing Page", demoMode);
};
export const useUtms = () => {
  const { demoMode } = useDemoMode();
  return useEntityCrud("utms", utmService, "UTM", demoMode);
};
export const useLandingPageInstances = () => {
  const { demoMode } = useDemoMode();
  return useEntityCrud("landing_page_instances", landingPageInstanceService, "Instância de LP", demoMode);
};
