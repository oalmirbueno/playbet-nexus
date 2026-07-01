# Link de Afiliado Inteligente — Detecção + Jogos Hypados + Distribuição

## Objetivo
Transformar o modal "Novo Link de Afiliado" em uma engine inteligente que:
1. **Detecta automaticamente** plataforma e tipo (odds/cassino/esportes) a partir da URL colada.
2. **Enriquece o link** com metadata: tipo de jogo, categoria, motivo (ex: "Fortune Tiger — hype alto essa semana").
3. **Sugere top 5 jogos hypados** daquela casa/categoria, com ícones, prioridade 1–5.
4. **Dispara automaticamente** o pacote (link + jogos + motivo) para o influenciador e o gerente, com views separadas (gerente vê controles extras).
5. Permite **múltiplos links repetidos** para o mesmo influenciador na mesma LP, diferenciados por contexto (jogo/campanha/motivo).

---

## 1. Detecção automática de plataforma + tipo

Ao colar a URL no campo **"3. Cole o link de afiliado"**, dispara em background:

- **Match de domínio** contra `platforms.domain_patterns` (novo campo `text[]` — ex: `['estrelabetpartners.com', 'go.aff.estrelabet']`). Se casar → autopreenche Plataforma + Conta padrão.
- **Detecção de categoria** por análise de URL/path + query params (ex: `/casino/`, `/sports/`, `/aviator`, `?game=fortune-tiger`). Regras vivem em `src/lib/linkIntelligence.ts` (heurísticas) + tabela `platform_game_hints` para override manual.
- **Estado visual**: badge "Detectado: Estrela Bet · Cassino · Fortune Tiger" abaixo do input. Se ambíguo → dropdown com sugestões ranqueadas.

Remove o warning atual "Plataforma não reconhecida" e substitui por feedback ativo (loading spinner → resultado).

---

## 2. Contexto do link (por que + de onde)

Novos campos no form (colapsáveis, autopreenchidos quando possível):

- **Tipo** (auto): `casino | sports | odds | live | crash | slots | other` — chip clicável para corrigir.
- **Jogo/Evento específico** (auto quando detectável, ex: Fortune Tiger, Copa 2026 — Brasil x Argentina).
- **Motivo/Hype** (auto-sugerido via LLM leve): "Aviator com RTP alto essa semana" / "Odds inflacionadas Brasileirão". Editável.

Estes viram colunas em `tracking_links`: `game_slug`, `game_name`, `game_icon_url`, `link_category`, `hype_reason`.

---

## 3. Top 5 jogos hypados por casa

Nova aba dentro do modal: **"Jogos recomendados desta casa"** (aparece após detecção da plataforma).

- Fonte de dados: tabela `platform_hyped_games` (id, platform_id, game_name, game_slug, icon_url, category, priority 1–5, hype_score, updated_at, is_active).
- Popular via **edge function `hyped-games-refresh`** que:
  - Roda 1x/dia via cron.
  - Para cada plataforma ativa, chama LLM (Lovable AI Gateway, modelo grátis) com prompt: "Quais os 5 jogos mais em alta no Brasil em [Estrela Bet] categoria [cassino] em [mês]? Retorne JSON: nome, slug, categoria, motivo do hype, prioridade 1–5."
  - Busca ícone: primeiro tenta `platform.icon_base_url + slug + .png`; fallback para asset genérico por categoria.
- UI: grid 5 cards com ícone + nome + badge "Prioridade 1" + motivo curto. Cada card tem botão **"Gerar link para este jogo"** que clona o link atual injetando `?game=<slug>` e cria um novo `tracking_link` filho vinculado ao original (`parent_link_id`).

---

## 4. Distribuição automática (influenciador + gerente)

Ao salvar o link (função `notify_new_tracking_link`, trigger AFTER INSERT em `tracking_links`):

- Cria 2 notificações via `notify_target()`:
  - **Influenciador** (`/portal/links`): "Novo link pronto: {game_name} · {platform} — {hype_reason}"
  - **Gerente do influenciador** (`/gerente/links`): mesma msg + CTA "Enviar para o grupo" + botão "Ver jogos hypados".
- Painel do influenciador (`PortalLinks`): card destaque com o link + top 5 jogos recomendados daquela casa, prontos para copiar (formato: link + emoji + hype).
- Painel do gerente (`GerenteLinks`): mesmo card + controles extras: reordenar prioridade, marcar "já enviei no grupo", agendar reenvio, ver quais influenciadores da squad ainda não receberam.

---

## 5. Links repetidos por influenciador

- Remove a restrição atual de "link duplicado" quando `game_slug` ou `hype_reason` diferem.
- `tracking_links` ganha índice único parcial: `(influencer_id, platform_account_id, landing_page_id, game_slug)` em vez do atual sem `game_slug`.
- UI: se detectar duplicata exata (mesmo jogo), oferece "Reutilizar existente" ou "Criar variação" (força novo `sub1`).

---

## Detalhes técnicos

**Migração (uma só):**
- `platforms`: `domain_patterns text[]`, `icon_base_url text`.
- `tracking_links`: `game_slug`, `game_name`, `game_icon_url`, `link_category`, `hype_reason`, `parent_link_id uuid REFERENCES tracking_links(id)`.
- Nova tabela `platform_hyped_games` com GRANTs + RLS (leitura pública autenticada, escrita só service_role).
- Trigger `notify_new_tracking_link` AFTER INSERT.
- Ajuste do índice único de duplicidade.

**Edge functions:**
- `hyped-games-refresh` (nova): cron diário + botão manual "Atualizar jogos" no admin.
- Reaproveita `Lovable AI Gateway` (secret já existe, sem custo p/ modelo Gemini free).

**Frontend:**
- `src/lib/linkIntelligence.ts` — detecção domínio/categoria/jogo.
- `TrackingLinkForm.tsx` — refactor: detecção reativa on-paste, painel de jogos hypados, campos de contexto.
- `PortalLinks.tsx` + `GerenteLinks.tsx` — nova seção "Recém-criados com jogos hypados".
- `PortalNotificationBell` já existe, só recebe o novo tipo `new_tracking_link`.

**Sem quebras:** links antigos continuam funcionando (campos novos são nullable). Sistema de tracking/postback intocado.

---

## Escopo entregue nesta rodada
Vou implementar em 3 passos, esperando aprovação da migração antes do código que depende do schema:

1. **Migração** (schema + trigger + RLS + GRANTs).
2. **Edge function `hyped-games-refresh`** + secret check.
3. **Frontend**: detecção inteligente no modal + painel de jogos + distribuição para portais.
