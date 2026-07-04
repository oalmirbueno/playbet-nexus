# Engine de Odds — Roadmap em 3 Fases

Cada fase é entregável e validável antes da próxima. Nenhuma fase quebra o que já existe.

---

## Fase 1 — Tracking de Odds nos Links

**Problema:** Links do tipo "odds / aposta compartilhada" não são reconhecidos como categoria própria, não guardam o payload da odd (evento, mercado, seleções, odd total) e por isso não aparecem no relatório do link nem na Central.

**Entregas:**
1. Novo campo `link_category = 'odds_share'` reconhecido pelo `TrackingLinkForm` com sub-tipo (`single`, `multipla`, `sistema`).
2. Nova tabela `tracking_link_odds` (1:1 com `tracking_links`) guardando:
   - `bet_type` (single/múltipla/sistema)
   - `total_odd` (numeric)
   - `selections jsonb` (evento, mercado, seleção, odd unitária por perna)
   - `screenshot_url` (opcional, se já veio da Fase 2)
   - `platform_id` resolvido do link
   - `bookmaker_share_url` original (quando existir)
3. Detector automático (`src/lib/oddsDetect.ts`) que, ao colar a URL da casa, identifica a plataforma pelo domínio usando `platforms.tracking_domains` e pré-seleciona o `platform_account`.
4. `LinkReportDrawer` ganha aba "Odd" mostrando as pernas, odd total, status (live/liquidada) e mesma tabela de métricas já existente (cliques, LP view, FTDs, comissão) — **tudo puxando por `tracking_link_id`**, exatamente como os outros tipos.
5. Central de Links: badge "Odd Compartilhada" + coluna "Odd" (valor total).

**Regra:** se a URL colada não bater com nenhuma casa cadastrada, bloqueia com toast "Casa não cadastrada — cadastre em Plataformas antes de gerar o link" (conforme sua escolha).

---

## Fase 2 — Gerador de Material de Odd

**Problema:** Não existe fluxo para transformar um print (ou URL) de odd em criativo com selo/identidade da casa.

**Entregas:**
1. Nova aba **"Odd"** no `CreativeStudio` (`src/components/materials/CaptureOddPanel.tsx` já existe como esqueleto — expandir).
2. Duas fontes de entrada:
   - **Upload manual** (drag-and-drop / colar imagem do clipboard).
   - **Captura automática por URL** via edge function `capture-odd-screenshot` (já existe) usando Playwright headless nas casas suportadas. Fallback silencioso → upload manual se falhar.
3. Formulário lateral pré-preenchido a partir do link vinculado (se veio da Fase 1):
   - Evento, mercado, seleções, odd total, casa detectada, brand kit.
4. Composição do material (canvas HTML → PNG via html2canvas):
   - Print da odd em card com cantos arredondados.
   - Selo da casa (do brand registry, com bloqueio de posicionamento oficial).
   - Cabeçalho com identidade da casa (cores, fonte, logotipo).
   - CTA + slug do influenciador (opcional).
   - Rodapé legal automático (18+ / jogue com responsabilidade).
5. Bloqueio: se o link não tiver `platform_id` resolvido ou casa não estiver cadastrada, exibe estado vazio com CTA "Cadastrar casa".
6. Persistência em `link_materials` com `material_type = 'odd_share'` (aparece no portal do influenciador imediatamente).

---

## Fase 3 — LP Automática de Odds

**Problema:** LPs geradas de link de odds ficam genéricas, sem as odds em destaque, sem identidade da casa e sem referências reais.

**Entregas:**
1. Novo `lp_mode = 'odds_share'` no `lp-autoconfigure` (já suporta `odds`, adicionar variante):
   - Seção Hero com o evento (times/logos reais buscados de `clubCrests`).
   - Card grande da odd (as mesmas pernas da Fase 1) com botão "Copiar aposta na {Casa}".
   - Seção de outras odds relacionadas ao mesmo campeonato (via `lp_events` + `lp_opportunities` já indexados).
   - Seção de identidade da casa (cores, wordmark, selo — puxado do brand registry travado).
   - CTA final destino = link afiliado da própria casa.
2. Detecção de identidade **real** (não placeholder):
   - Se a casa tem brand kit registrado → usa tokens travados (cores, fontes Articulat CF, selos oficiais).
   - Referências de crest dos times via `clubCrests` (já existe) — sem placeholder cinza.
3. Performance: LP continua com o mesmo pipeline de SSR-hydrate e edge cache já em uso (abertura < 1s).
4. Autogeração dispara no `POST` do link (Fase 1) → `lp-autoconfigure` recebe `lp_mode='odds_share'` + payload das seleções → cria `landing_page_instance` pronta.
5. Editor visual (`LpInstanceVisualEditor`) ganha preset "Odds Share" com blocos travados na ordem correta mas com copy editável.

---

## Ordem de execução

```text
Fase 1 (tracking)  ──► valida no Link Report + Central
       │
       ▼
Fase 2 (material)  ──► valida no Creative Studio + Portal
       │
       ▼
Fase 3 (LP auto)   ──► valida abrindo a LP pública gerada
```

Após cada fase peço para você validar antes de seguir. Aprovado?