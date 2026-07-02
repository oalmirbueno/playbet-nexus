# Squad Management Workspace

Turn each squad card into a full management console. Click a squad → dedicated screen with roster, goals, cascading distribution, and admin tools. Director-only for squad/manager goals; manager+ for influencer distribution and troubleshooting.

## 1. Navigation
- `SquadsTab` cards become clickable → route `/pessoas/squads/:squadId` (new `SquadDetail.tsx` page).
- Header: squad color badge, name, director, manager, active influencers count, monthly goal progress bar (BRL realized vs goal).

## 2. Sections in the Squad screen

**a) Meta & Distribuição (top card)**
- Fields: `monthly_goal` (squad), `manager_goal` (gerente do squad).
- "Distribuir meta" button splits `monthly_goal` across active influencers. Modes:
  - Igual (default)
  - Ponderada por performance dos últimos 30 dias (revenue proporcional)
  - Manual (editar cada linha antes de salvar)
- Visible/editable only if director (own squads) or admin.

**b) Roster de Influencers (tabela)**
- Colunas: avatar/nome, categoria, meta individual (`monthly_goal_brl`), realizado 30d, % atingido, status, ações.
- Inline edit da meta individual (manager+).
- Ações por linha:
  - Ver perfil → drawer `InfluencerQuickProfile` (dados, contatos, links, últimas notificações).
  - Enviar link de redefinição de senha (dispara `admin-user-manage` reset).
  - Reenviar convite (se sem `auth_user_id`).
  - Marcar link quebrado / desativar link → abre lista dos `tracking_links` do influencer com toggle `is_active` e botão "regenerar slug".
  - Remover do squad.

**c) Gerente & Diretor (side card)**
- Trocar gerente (dropdown de managers existentes, respeita hierarquia).
- Trocar diretor responsável.
- Badge "Sócio" se manager for sócia (Camile) → mostra `compensation_mode = socio_only` como somente-leitura.

**d) Notas & histórico**
- Notas do squad (já existe).
- Timeline curto: últimas 10 alterações (goals, membros entrando/saindo) via `commercial_card_history` filtrado + nova tabela leve `squad_activity`.

## 3. RBAC
- Director/admin: editar `monthly_goal`, `manager_goal`, distribuir meta, trocar gerente/diretor.
- Manager do squad: editar metas individuais, disparar reset, desativar links.
- Influencer/visualizacao: sem acesso à rota.
- Enforcement via `useAuth` + RLS policies existentes (`is_admin`, `current_manager_squad_id`).

## 4. Backend

### Schema (migration)
- `squads`: add `manager_goal_brl numeric`, `goal_distribution_mode text default 'equal'` (`equal|weighted|manual`), `goal_last_distributed_at timestamptz`.
- `influencers`: ensure `monthly_goal_brl numeric` exists (add if missing).
- `squad_activity` table: `id, squad_id, actor_user_id, action, payload jsonb, created_at`. Grants + RLS (`is_admin` or same squad manager).

### RPC
- `distribute_squad_goal(_squad_id uuid, _mode text, _overrides jsonb)` — SECURITY DEFINER. Recalcula `monthly_goal_brl` de cada influencer ativo do squad; grava `squad_activity`.
- `request_influencer_password_reset(_influencer_id uuid)` — thin wrapper que valida permissão e chama edge function `admin-user-manage` via service role.

### Edge function
- Reuse `admin-user-manage` (already exists) for password reset — add `action: 'send_reset_link'` if missing.

## 5. Files to create / edit

Create:
- `src/pages/SquadDetail.tsx`
- `src/components/squads/SquadGoalCard.tsx`
- `src/components/squads/SquadRosterTable.tsx`
- `src/components/squads/InfluencerQuickProfile.tsx` (Sheet)
- `src/components/squads/InfluencerLinksManager.tsx`
- `src/components/squads/GoalDistributionDialog.tsx`
- `src/hooks/useSquadDetail.ts`

Edit:
- `src/components/people/SquadsTab.tsx` — card `onClick` → navigate.
- `src/App.tsx` — add route.
- `src/integrations/supabase/types.ts` — auto after migration.

## 6. UX notes
- Layout: 12-col grid; header + 3 cards on desktop, stacked on tablet/mobile (same responsive rules as Pipeline overhaul).
- Empty states para squad sem influencers ("Adicionar do pipeline aprovado").
- Toasts em cada ação + optimistic update via React Query.
- Confirm dialogs para reset de senha, remoção, desativação de link.

## 7. Out of scope (esta iteração)
- Meta anual, histórico gráfico longo, exportação — ficam para próxima.
- Editor visual de LP dentro do squad.

Confirmar para eu implementar (migração + telas em uma leva).
