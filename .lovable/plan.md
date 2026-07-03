## Objetivo

Sempre que um link for gerado — por qualquer usuário (admin, gerente ou influencer), em qualquer entrada (QuickLink, formulário completo, lote de jogos em alta, wizard guiado) — os materiais e a LP nascem prontos, alinhados ao contexto do link (jogo/plataforma/marca), sem duplicatas e sem quebrar em erro de sync.

## Diagnóstico atual

| Entrada de criação de link | Autogen materiais | Autoconfig LP |
|---|---|---|
| `QuickLinkDialog` | Sim | Sim |
| `TrackingLinkForm` (individual, via `TrackingLinks.handleSave`) | **Não** | **Não** |
| `TrackingLinkForm.applyAllHypedBatch` (lote) | **Não** | **Não** |
| `TrackingLinks.handleWizardComplete` (wizard) | **Não** | **Não** |

Além disso, `materials-autogenerate` insere blind (roda 2x → duplicatas em `link_materials`).

## Correções

### 1. Helper único `syncLinkAssets(linkId, opts)`
Novo arquivo `src/lib/linkAssets.ts`. Dispara `materials-autogenerate` + (se `useLp`) `lp-autoconfigure` em `Promise.allSettled`, faz `invalidateQueries` para `link_materials` e `landing_page_instances`, engole erros silenciosamente com log (fire-and-forget, nunca bloqueia UX de criação).

Assinatura:
```ts
syncLinkAssets(linkId, {
  useLp: boolean,
  extraGameSlugs?: string[],
  hypeCopy?: { subtitle?: string | null },
  qc: QueryClient,
})
```

### 2. Cablar helper em todos os pontos de entrada
- `QuickLinkDialog.handleSave` → substituir bloco inline pelo helper.
- `TrackingLinks.handleSave` → após `create(cleaned)`, chamar helper com o `id` retornado.
- `TrackingLinks.handleWizardComplete` → idem.
- `TrackingLinkForm.applyAllHypedBatch` → após `insert(rows).select("id")`, iterar `inserted` e disparar helper por link (sequencial, 100ms de gap para não flodar a edge).

Requer: garantir que `useTrackingLinks().create` retorne o registro (`.select().single()`) — verificar/ajustar em `useTrackingData`.

### 3. Tornar `materials-autogenerate` idempotente
Edge function `supabase/functions/materials-autogenerate/index.ts`:
- Antes de `insert`, buscar `link_materials` existentes por `tracking_link_id`.
- Montar `rows` apenas para as combinações `(format, style)` ainda ausentes.
- Retornar `{ ok, queued, skipped }`.

Sem migration necessária (usa constraint natural, sem upsert).

### 4. Regras default sensíveis ao modo `platform_direct`
Quando o link não tem `game_slug` (LP limpa / envio direto à plataforma), as `DEFAULT_RULES` da edge function trocam para o preset de co-brand (`feed` + `story` com style `platform_lockup`) em vez de `hype_neon`. Isso faz o material inicial já entregar o lockup PlayBet × Plataforma + selo, alinhado com a decisão já tomada no `CreativeStudio`.

### 5. Feedback de UI unificado
Toast padrão pós-criação em todos os fluxos: "Link criado · materiais e LP sincronizando". Sem popup bloqueante — o `MateriaisView` já reage via `invalidateQueries`.

## Arquivos tocados

- **novo** `src/lib/linkAssets.ts`
- `src/components/QuickLinkDialog.tsx` — usa helper
- `src/pages/TrackingLinks.tsx` — usa helper em `handleSave` + `handleWizardComplete`
- `src/components/tracking/TrackingLinkForm.tsx` — usa helper no `applyAllHypedBatch`
- `src/hooks/useTrackingData.ts` — garantir `create` retorna id (checar antes)
- `supabase/functions/materials-autogenerate/index.ts` — idempotência + preset `platform_direct`

## Fora de escopo

- Renderização de PNGs no servidor (materiais continuam gerados client-side no Studio; a edge function só provisiona as *linhas* de material com metadata correto).
- Alteração no schema de `link_materials`.
- Mudança nas RLS existentes.
