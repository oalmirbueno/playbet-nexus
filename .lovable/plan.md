## Objetivo

Entrega faseada mantendo a identidade **PlayBet Noir** (dark, indigo `#4f46e5`, cyan `#22d3ee`). Sem tocar em lógica de negócio nem em schema existente além do necessário para vincular usuários. Realtime em métricas, saques, materiais/links e notificações.

---

## Fase 1 — Tela de Usuários (admin)

Nova rota `/usuarios` (já existe `UsuariosInternos.tsx` como stub; será substituída pela versão real). Reaproveita `profiles`, `user_roles`, `influencers`, `managers`.

**UI**
- Header com busca, filtros (Todos · Admin · Sócio · Gerente · Influencer · Sem role) e botão "Convidar".
- Tabela densa: avatar, nome, e-mail, role atual (badge), vínculo (Influencer X / Gerente Y / —), último acesso, ações.
- Ações por linha: mudar role, vincular a influencer/manager existente (Combobox), desvincular, desativar/ativar, reenviar convite.
- Drawer "Convidar usuário": e-mail + role + vínculo opcional (influencer/manager). Envia via edge function `admin-user-manage` (já existe) usando `inviteUserByEmail`.
- Skeletons enquanto carrega; EmptyState quando vazio.

**Backend (mínimo)**
- Migration: adicionar `influencer_id` e `manager_id` em `profiles` já existem (confirmado no schema). Nenhuma nova tabela.
- Edge function `admin-user-manage`: ampliar ações `invite`, `set_role`, `link_influencer`, `link_manager`, `deactivate` — todas protegidas por `is_admin(auth.uid())`.
- RLS: admin lê todos profiles/user_roles (já ok via `is_admin`).

**Sincronização automática**
- Ao criar um influencer/manager, se houver e-mail, oferecer "Convidar agora" com um clique.
- Quando um convite é aceito, `handle_new_user` roda; a tela de Usuários atualiza via realtime em `profiles` + `user_roles`.

---

## Fase 2 — Portal Influenciador (mobile-first, refinado)

Escopo restrito a `InfluencerPortalLayout` + páginas `/portal/*`. Sem mudar lógica.

**Shell**
- Top bar mais compacta (h-12), logo + saudação "Olá, {primeiro nome}", sino de notificações, avatar.
- Bottom tabs mobile: ícones maiores (20px), rótulos menores, indicador ativo em gradiente indigo→cyan com haptic-like scale. Safe-area padding para iOS.
- Desktop nav mantém o pill underline atual, mais respiração.

**Home (`PortalHome`)**
- Hero card com KPI principal (comissão do mês) em número grande + delta vs mês anterior.
- Grid 2x2 de KPIs secundários (cliques, FTDs, depósitos, saldo disponível) — cards com sparkline.
- Seção "Meus links em destaque" (top 3 por conversão) com CTA copiar.
- Seção "Últimas notificações" (3 itens) com deep link.
- Todos os KPIs plugados em `useRealtimeMetrics` + realtime channel em `tracking_metrics` filtrado pelo `current_influencer_id()`.

**Demais páginas (Links, Materiais, Financeiro, Saques, Perfil)**
- Aplicar mesmo sistema: cards com `rounded-2xl`, `border-border/50`, `bg-card/60 backdrop-blur`, gradiente sutil na borda do card ativo.
- Listas viram cards empilhados no mobile; tabela reservada para ≥ md.
- Sticky action bar no mobile (ex.: "Copiar link", "Solicitar saque") com blur.

**Realtime**
- Channel único no layout: subscribe em `tracking_metrics`, `saques`, `link_materials`, `tracking_links`, `notifications` filtrados pelo `influencer_id` do usuário. Invalida queries do React Query correspondentes.

---

## Fase 3 — Painel Gerente (mesmo padrão)

Escopo em `ManagerLayout` + `/gerente/*`.

- Home do gerente: KPI da squad (meta vs realizado com anel de progresso), ranking dos influencers em cards horizontais com avatar + delta, atalhos.
- Aba "Meus influencers": lista com filtro por status, com botão "Convidar/Vincular usuário" (dispara mesma edge function da Fase 1).
- Materiais/Links/Financeiro/Saques: reaproveitar os componentes do portal com variantes que aceitam `scope: influencer | manager`.
- Realtime: mesmo channel filtrado por `manager_id = current_manager_id()` (joins na squad).

---

## Detalhes técnicos

**Design tokens** (adicionar em `index.css` sem quebrar o existente):
```
--portal-surface: hsl(var(--card) / 0.6)
--portal-border: hsl(var(--border) / 0.5)
--portal-glow: linear-gradient(135deg, hsl(238 84% 60%), hsl(189 94% 55%))
--portal-shadow: 0 10px 30px -12px hsl(238 84% 60% / 0.25)
```

**Realtime helper** — novo `src/hooks/usePortalRealtime.ts` centraliza subscribes por escopo (influencer|manager) e invalida queries. Um único channel por sessão.

**Edge function** `admin-user-manage` — expandir com validação Zod e checagem `is_admin`.

**Testes rápidos**
- Login como admin → /usuarios → convidar e-mail teste → verificar linha aparecendo em realtime.
- Preview como influencer → /portal → checar layout mobile (viewport 390) e KPIs.
- Preview como gerente → /gerente → mesmo check.

---

## Ordem de commits

1. Migration + edge function `admin-user-manage` ampliada.
2. Página `/usuarios` completa + realtime.
3. Refino do Portal Influenciador (layout + Home + demais páginas em passes).
4. Refino do Painel Gerente (mesmo padrão).
5. Hook `usePortalRealtime` integrado nas duas superfícies.

Cada fase é um commit isolado, revertível.
