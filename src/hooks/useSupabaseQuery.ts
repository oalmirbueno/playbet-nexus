import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  influencerService,
  managerService,
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

  const filteredData = (query.data ?? []).filter((row) => !(row as any).is_demo);

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
export const useInfluencers = () => useEntityCrud("influencers", influencerService, "Influencer");
export const useManagers = () => useEntityCrud("managers", managerService, "Gerente");
export const usePlatforms = () => useEntityCrud("platforms", platformService, "Plataforma");
export const useGames = () => useEntityCrud("games", gameService, "Jogo");
export const useTemplates = () => useEntityCrud("templates", templateService, "Template");
export const useLandingPages = () => useEntityCrud("landing_pages", landingPageService, "Landing Page");
export const useUtms = () => useEntityCrud("utms", utmService, "UTM");
export const useCampanhas = () => useEntityCrud("campanhas", campanhaService, "Campanha");
export const useSocios = () => useEntityCrud("socios", socioService, "Sócio");
export const useSaques = () => useEntityCrud("saques", saqueService, "Saque");
export const useConteudo = () => useEntityCrud("conteudo", conteudoService, "Conteúdo");
export const useLandingPageInstances = () => useEntityCrud("landing_page_instances", landingPageInstanceService, "Instância de LP");
