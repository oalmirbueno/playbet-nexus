

## Diagnóstico

**Problema 1 — Dashboard mostra "Sem dados":** O erro anterior de hooks ("Rendered more hooks") corrompeu o estado do React. A correção aplicada (adicionar comentário) não forçou um reload limpo o suficiente. A lógica de `hasData` está correta (verifica influencers, platforms, hasTrackingData), mas o componente ficou em estado corrompido pelo HMR.

**Problema 2 — Valores errados:** O banco tem dados reais:
- 3 registrations, 2 FTDs, 3 deposits, 1 redeposit, 1 revenue ($0.09 / R$0.47)
- 123 cliques reais
- O valor de $73.20 que você vê na 1win é o **saldo total da conta**, não a soma de comissões. O sistema só recebeu **1 postback de revenue** de $0.09. Os outros $73.11 nunca foram enviados pela 1win via postback.

**O que o painel DEVE mostrar (dados reais do banco):**
- Revenue: US$ 0.09 (≈ R$ 0.47) — apenas 1 comissão recebida
- Cliques: 123
- Registros: 3
- FTD: 2
- Depósitos: R$ 133.40 (soma de deposit+ftd em BRL)

## Plano de Correção

### 1. Forçar reload limpo do DashboardExecutivo
Adicionar um `key` único no componente ou fazer uma alteração estrutural mínima que force o React a descartar o estado corrompido pelo HMR. Especificamente, mover a declaração de `hasData` para depois de todos os `useMemo` hooks, garantindo que a ordem dos hooks nunca mude.

### 2. Validar que `isValidTrackingEvent` aceita eventos com `status: null`
A função atual filtra `status !== "invalid_legacy"` e nomes começando com `{`. Eventos com `status: null` passam corretamente. Nenhuma mudança necessária aqui.

### 3. Adicionar fallback no empty state
Mudar a condição `hasData` para também verificar `isLoading` do consolidation hook, evitando flash do empty state enquanto dados carregam:

```
const { consolidated, hasData: hasTrackingData, isLoading: isTrackingLoading } = useAutoConsolidation();
// ...
const hasData = isTrackingLoading || influencers.length > 0 || ...
```

### 4. Nenhuma mudança nos valores
Os valores estão corretos com base nos postbacks **realmente recebidos**. O gap entre $0.09 e $73.20 é porque a 1win não enviou os outros postbacks de revenue. Isso não é bug do sistema — é falta de configuração/disparo na plataforma.

### Arquivos a editar
- `src/pages/DashboardExecutivo.tsx` — adicionar guard de `isLoading` no `hasData` + forçar clean render
- `src/hooks/useAutoConsolidation.ts` — nenhuma mudança necessária (lógica está correta)

