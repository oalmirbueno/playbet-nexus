import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  platformAccountService, trackingMetricService, trackingSnapshotService,
  trackingLinkService, platformEventMappingService, trackingEventService,
} from "@/services/trackingService";
import type {
  PlatformAccountRow, TrackingMetricRow, TrackingLinkRow,
  PlatformEventMappingRow, TrackingEventRow,
} from "@/services/trackingService";
import { useToast } from "@/hooks/use-toast";
import { shouldUseMetricSource } from "@/lib/trackingMetrics";

/** Filter out demo rows - always show only real data */
function filterReal<T extends { is_demo: boolean }>(rows: T[]): T[] {
  return rows.filter(r => !r.is_demo);
}

function filterRealMetrics<T extends { is_demo: boolean; origem_importacao?: string | null }>(rows: T[]): T[] {
  return rows.filter(r => !r.is_demo && shouldUseMetricSource(r as any));
}

function filterValidEvents(rows: TrackingEventRow[]): TrackingEventRow[] {
  return rows.filter(r =>
    !r.is_demo &&
    !r.is_duplicate &&
    !["invalid_legacy", "invalid_internal_preview", "duplicate_technical"].includes(r.status || "")
  );
}

export function usePlatformAccounts() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ["platform_accounts"],
    queryFn: platformAccountService.getAll,
  });

  const data = filterReal(rawData);

  const createMut = useMutation({
    mutationFn: (item: Partial<PlatformAccountRow>) => platformAccountService.create(item),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_accounts"] }); toast({ title: "Conta criada" }); },
    onError: () => toast({ title: "Erro ao criar conta", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PlatformAccountRow> }) => platformAccountService.update(id, updates),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_accounts"] }); toast({ title: "Conta atualizada" }); },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, current }: { id: string; current: boolean }) => platformAccountService.toggleActive(id, current),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_accounts"] }); toast({ title: "Status alterado" }); },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => platformAccountService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_accounts"] }); toast({ title: "Conta removida" }); },
  });

  return {
    data, isLoading,
    create: createMut.mutateAsync,
    update: (id: string, updates: Partial<PlatformAccountRow>) => updateMut.mutateAsync({ id, updates }),
    toggle: (id: string, current: boolean) => toggleMut.mutateAsync({ id, current }),
    remove: removeMut.mutateAsync,
    isCreating: createMut.isPending,
  };
}

export function useTrackingMetrics(filters?: {
  platform_id?: string;
  influencer_id?: string;
  campanha_id?: string;
  landing_page_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const hasFilters = filters && Object.values(filters).some(Boolean);

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ["tracking_metrics", filters],
    queryFn: () => hasFilters ? trackingMetricService.getFiltered(filters!) : trackingMetricService.getAll(),
  });

  const data = filterRealMetrics(rawData);

  const createMut = useMutation({
    mutationFn: (item: Partial<TrackingMetricRow>) => trackingMetricService.create(item),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracking_metrics"] }); toast({ title: "Métrica registrada" }); },
    onError: () => toast({ title: "Erro ao registrar métrica", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TrackingMetricRow> }) => trackingMetricService.update(id, updates),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracking_metrics"] }); },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => trackingMetricService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracking_metrics"] }); toast({ title: "Métrica removida" }); },
  });

  return {
    data, isLoading,
    create: createMut.mutateAsync,
    update: (id: string, updates: Partial<TrackingMetricRow>) => updateMut.mutateAsync({ id, updates }),
    remove: removeMut.mutateAsync,
  };
}

export function useTrackingSnapshots() {
  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ["tracking_snapshots"],
    queryFn: trackingSnapshotService.getAll,
  });
  return { data: filterReal(rawData), isLoading };
}

export function useTrackingLinks() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ["tracking_links"],
    queryFn: trackingLinkService.getAll,
  });

  const data = filterReal(rawData);

  const createMut = useMutation({
    mutationFn: (item: Partial<TrackingLinkRow>) => trackingLinkService.create(item),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracking_links"] }); toast({ title: "Link criado" }); },
    onError: () => toast({ title: "Erro ao criar link", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TrackingLinkRow> }) => trackingLinkService.update(id, updates),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracking_links"] }); toast({ title: "Link atualizado" }); },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => trackingLinkService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracking_links"] }); toast({ title: "Link removido" }); },
  });

  return {
    data, isLoading,
    create: createMut.mutateAsync,
    update: (id: string, updates: Partial<TrackingLinkRow>) => updateMut.mutateAsync({ id, updates }),
    remove: removeMut.mutateAsync,
  };
}

export function usePlatformEventMappings(platformId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ["platform_event_mappings", platformId],
    queryFn: () => platformId ? platformEventMappingService.getByPlatform(platformId) : platformEventMappingService.getAll(),
  });

  const data = filterReal(rawData);

  const createMut = useMutation({
    mutationFn: (item: Partial<PlatformEventMappingRow>) => platformEventMappingService.create(item),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_event_mappings"] }); toast({ title: "Mapeamento criado" }); },
    onError: () => toast({ title: "Erro ao criar mapeamento", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PlatformEventMappingRow> }) => platformEventMappingService.update(id, updates),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_event_mappings"] }); toast({ title: "Mapeamento atualizado" }); },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => platformEventMappingService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_event_mappings"] }); toast({ title: "Mapeamento removido" }); },
  });

  return {
    data, isLoading,
    create: createMut.mutateAsync,
    update: (id: string, updates: Partial<PlatformEventMappingRow>) => updateMut.mutateAsync({ id, updates }),
    remove: removeMut.mutateAsync,
  };
}

export function useTrackingEvents(filters?: {
  platform_id?: string;
  influencer_id?: string;
  canonical_event_name?: string;
  source_type?: string;
  date_from?: string;
  date_to?: string;
}) {
  const hasFilters = filters && Object.values(filters).some(Boolean);

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ["tracking_events", filters],
    queryFn: () => hasFilters ? trackingEventService.getFiltered(filters!) : trackingEventService.getAll(),
  });

  return { data: filterValidEvents(rawData), isLoading };
}
