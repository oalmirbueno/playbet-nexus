# Reorganização: Pessoas (Gerentes/Times/Influencers) + Cadastro unificado de Links

Hoje o cadastro está fragmentado: criar influencer em um lugar, vincular link em outro, escolher plataforma em outro. E não existe a camada "Gerente → Time → Influencer" que você descreveu para competição entre equipes.

Vamos transformar tudo isso em uma esteira de 2 cliques, sem sair de tela.

## 1. Estrutura "Pessoas" com 2 abas

A página `/influencers` vira **Pessoas** com duas abas no topo:

- **Gerentes** — nível acima. Cada gerente é dono de um Time (ex.: Time A, Time B, Time Sete).
- **Influencers** — nível operacional. Cada influencer pertence a 1 gerente / 1 time.

Listagem de Influencers passa a ser **agrupada por Time** (com cabeçalho do gerente, contador, soma de cliques/receita do time). Visual de "esteira": cada time é uma linha de produção, fácil de comparar para ranking/competição.

Filtros: por gerente, por time, por status, busca livre.

## 2. Fluxo único "Adicionar Link de Afiliado"

Um único botão **+ Novo Link** abre um modal de 1 tela com 4 campos, sem navegação:

```text
[ Influencer  ▾ ]   ← combo com busca; "+ Criar novo" inline se não existir
[ Plataforma ▾ ]    ← PlayBet, SuperBet, 1win, etc. (lista vinda de platforms)
[ Link afiliado ]   ← cola o link bruto da plataforma
[ SubID / apelido ] ← opcional, auto-gerado pelo slug do influencer
                                              [ Cancelar ]  [ Salvar ]
```

Ao salvar:
- valida URL, extrai params (utm_source/medium/campaign/subid se já vierem),
- vincula `influencer_id` + `platform_id` + `manager_id` (herdado do influencer),
- registra em `tracking_links` e dispara o mapeamento de postback existente — atualização automática de cliques/receita continua igual.

Esse mesmo botão fica visível em **Pessoas → Influencer (linha)**, em **Links Afiliados** e no header do **Tracking Hub**. Sempre o mesmo modal, sempre 2 cliques.

## 3. Banco de dados (mudanças mínimas)

Nova tabela e duas colunas — nada destrutivo:

- `managers` — nome, slug, time_nome, cor (para badge do time), meta_mensal, ativo.
- `influencers.manager_id` (FK opcional → managers).
- `influencers.team_label` (cache do nome do time para listagem rápida; alimentado pelo gerente).

RLS: autenticados leem/gravam, service_role total. Sem `anon`.

Influencers sem gerente continuam aparecendo num grupo "Sem time".

## 4. Onde isso aparece

- `src/pages/Influencers.tsx` → vira `Pessoas.tsx` com `<Tabs>` (Gerentes / Influencers). Influencers agrupados por time.
- `src/pages/Gerentes.tsx` *(novo)* — CRUD de gerentes + cor do time + meta.
- `src/components/QuickLinkDialog.tsx` *(novo)* — o modal único de cadastro de link.
- `src/components/DashboardLayout.tsx` → item "Influencers" passa a se chamar **Pessoas**; submenu interno com Gerentes/Influencers fica nas abas, não na sidebar (mantém minimalismo).
- `src/pages/LinksAfiliados.tsx` → botão "Novo Link" passa a abrir o `QuickLinkDialog` (substitui o modal antigo, 2 cliques).

## 5. Ordem de execução

1. Migration: tabela `managers` + colunas em `influencers` + GRANTs + RLS.
2. Service + hook `useManagers` (espelho de `useInfluencers`).
3. `QuickLinkDialog` (componente reutilizável).
4. Refatorar `Influencers.tsx` → `Pessoas.tsx` com tabs + agrupamento por time.
5. Criar `Gerentes` (lista + CRUD simples).
6. Trocar botão de novo link em `LinksAfiliados.tsx` e adicionar no Tracking Hub.
7. Atualizar sidebar (rótulo "Pessoas") e rotas.

## Detalhe técnico

- Manter `useEntityCrud` para `managers` (mesmo padrão dos outros).
- `team_label` é sincronizado quando o gerente edita o nome do time (trigger ou no service — preferir service para evitar regressão no trigger global).
- Postback continua chave por `subid` / `click_id` — nada muda no `tracking-postback`.
- Competição/ranking entre times é só uma view derivada de `tracking_metrics` agrupada por `manager_id` via join — fica para um próximo passo, mas a estrutura já habilita.

Aprova que eu já abro a migration e sigo nessa ordem?
