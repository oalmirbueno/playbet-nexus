/**
 * Sincronização unificada de ativos pós-criação de link de afiliado.
 *
 * O gatilho de DB `trg_tracking_links_autopipeline` já faz o trabalho pesado
 * em qualquer INSERT/UPDATE (materiais, instância de LP, oportunidades e
 * notificações). Este módulo apenas:
 *   1. Invalida as queries do React Query que refletem esses artefatos.
 *   2. Opcionalmente chama `lp-autoconfigure` quando o caller precisa passar
 *      metadados extras (extra_game_slugs, hype_copy) que o trigger não
 *      captura.
 *   3. Opcionalmente chama `materials-autogenerate` como fallback defensivo
 *      (a edge function é idempotente para linhas já criadas pelo trigger).
 *
 * Nunca bloqueia o fluxo de criação — todos os erros de sync são engolidos
 * com log e não propagam para o toast do usuário.
 */
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ASSET_QUERY_KEYS = [
  "tracking_links",
  "link_materials",
  "landing_page_instances",
  "lp_opportunities",
  "notifications",
] as const;

export function invalidateLinkAssets(qc: QueryClient) {
  ASSET_QUERY_KEYS.forEach((key) => {
    qc.invalidateQueries({ queryKey: [key] });
  });
}

export interface SyncLinkAssetsOptions {
  useLp?: boolean;
  extraGameSlugs?: string[];
  hypeCopy?: { subtitle?: string | null } | null;
  /**
   * Quando true, pula a chamada de `materials-autogenerate` (o trigger
   * de DB já cobre o caso comum). Default: true.
   */
  skipMaterialsEdge?: boolean;
}

/**
 * Dispara a sincronização completa de ativos para um link recém-criado.
 * Fire-and-forget: retorna imediatamente após enfileirar as chamadas.
 */
export function syncLinkAssets(
  linkId: string,
  opts: SyncLinkAssetsOptions,
  qc: QueryClient,
): void {
  const {
    useLp = false,
    extraGameSlugs = [],
    hypeCopy = null,
    skipMaterialsEdge = false,
  } = opts;

  const tasks: Promise<unknown>[] = [];

  if (useLp) {
    tasks.push(
      supabase.functions.invoke("lp-autoconfigure", {
        body: {
          tracking_link_id: linkId,
          extra_game_slugs: extraGameSlugs,
          hype_copy: hypeCopy,
        },
      }),
    );
  }

  if (!skipMaterialsEdge) {
    tasks.push(
      supabase.functions.invoke("materials-autogenerate", {
        body: { tracking_link_id: linkId },
      }),
    );
  }

  if (tasks.length === 0) {
    // Só invalida: o trigger DB já fez o trabalho.
    setTimeout(() => invalidateLinkAssets(qc), 250);
    return;
  }

  Promise.allSettled(tasks)
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.warn("[syncLinkAssets] sync tasks failed", e);
    })
    .finally(() => invalidateLinkAssets(qc));
}

/**
 * Versão em lote: para múltiplos links criados em uma única operação
 * (ex.: batch de jogos em alta). Espaça as chamadas para não flodar a edge.
 */
export async function syncLinkAssetsBatch(
  linkIds: string[],
  opts: SyncLinkAssetsOptions,
  qc: QueryClient,
): Promise<void> {
  for (const id of linkIds) {
    syncLinkAssets(id, opts, qc);
    await new Promise((r) => setTimeout(r, 120));
  }
  // Uma invalidação final garante refresh mesmo se as chamadas anteriores
  // ainda não terminaram.
  setTimeout(() => invalidateLinkAssets(qc), 400);
}
