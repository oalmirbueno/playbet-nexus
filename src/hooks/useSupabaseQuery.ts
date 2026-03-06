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
} from "@/services/supabaseService";

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
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [key],
    queryFn: service.getAll,
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

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    toggle: toggleMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

// ── Entity hooks ──
export const useInfluencers = () => useEntityCrud("influencers", influencerService, "Influencer");
export const usePlatforms = () => useEntityCrud("platforms", platformService, "Plataforma");
export const useGames = () => useEntityCrud("games", gameService, "Jogo");
export const useTemplates = () => useEntityCrud("templates", templateService, "Template");
export const useLandingPages = () => useEntityCrud("landing_pages", landingPageService, "Landing Page");
export const useUtms = () => useEntityCrud("utms", utmService, "UTM");
export const useLandingPageInstances = () => useEntityCrud("landing_page_instances", landingPageInstanceService, "Instância de LP");
