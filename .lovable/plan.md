## Objetivo
Cada link de rastreio (influenciador / gerente / sócia / casa / jogo) puxa **automaticamente** a plataforma correta (PlayBet / Estrela Bet / VUPI…), aplicando **logo, paleta, tipografia, background, selo legal, licença e SEO** — sem misturar marcas — e o download do material sai fiel ao que foi montado (sem quebrar, torto ou dessincronizado).

---

## 1. Resolver brand pelo link (fonte única da verdade)

Criar `src/lib/useLinkBrand.ts`:
- Recebe `tracking_link_id` ou `platform_account_id`.
- Faz join `tracking_links → platform_accounts → platforms` e chama `resolveBrand(platform)` do `brandRegistry`.
- Retorna `{ brand, palette, typography, logos, seal, backgrounds, seo, isLegallyReady }`.
- Cache com React Query (`['link-brand', linkId]`).

Guard central `assertBrandReady(brand)` — bloqueia geração/publicação se `isLegallyReady === false` (sem selo/licença → erro claro, sem multa).

## 2. Plugar no fluxo de Materiais

`src/components/materials/CreativeStudio.tsx` e `LinkMaterialEditor.tsx`:
- Ao selecionar/abrir um link, chamar `useLinkBrand(linkId)`.
- Injetar automaticamente no canvas:
  - Logo da plataforma (variante conforme fundo — dark/light/violet/midnight)
  - Background da plataforma (ou combinar com AceleriQ quando pedido)
  - Selo 18+ + nº de autorização SPA/MF **fixo no rodapé**
  - Fonte display/body corretas via `brandFonts.ts`
- Trocar de link ⇒ trocar toda a identidade (nunca misturar).
- Componente `<BrandLockBadge/>` no header do editor mostrando "Marca travada: VUPI · SPA/MF 1.762/2025".

## 3. Plugar em LP Instances / Oportunidades

`src/pages/LPInstances.tsx`, `LpOpportunities.tsx`, `OpportunityWizard.tsx`, `InfluencerLanding.tsx`:
- Resolver brand pelo `tracking_link_id` da rota (`/lp/:slug` ou `?ref=`).
- Aplicar tokens da paleta via CSS vars no root da LP (`--brand-primary`, `--brand-ink`, `--brand-surface`).
- Rodapé obrigatório com selo + licença da plataforma correta.
- `<title>` + `<meta description>` + `og:*` gerados a partir de `brand.seo` (nome, tagline, licença).
- Bloqueio de render se `!isLegallyReady`.

## 4. Fix do download de materiais (quebrando/torto)

Diagnóstico provável: `html2canvas` capturando antes de fontes/imagens carregarem, ou `devicePixelRatio` errado, ou CSS transform no wrapper.

Ações em `CreativeStudio` (export):
- Aguardar `document.fonts.ready` + `Promise.all(imgs.map(decode))` antes de capturar.
- Trocar `html2canvas` por **`html-to-image`** (`toPng`) — mais estável com CSS moderno, com `pixelRatio: 2`, `cacheBust: true`, `skipFonts: false`.
- Renderizar num **stage offscreen fixo** (ex.: 1080×1350 IG, 1080×1920 story, 1200×628 OG) com `transform: none` — não capturar direto do preview escalado.
- Nome do arquivo: `{brand}_{tipo}_{link-slug}_{data}.png` para não confundir.
- Fallback SVG→PNG server-side (edge function `render-material`) para 100% fidelidade quando o usuário pedir "alta qualidade".

## 5. Rotas organizadas

```
/marca/:brand                 → showcase da marca (kit visual, selos, licença)
/links/:linkId/material       → Creative Studio travado no brand do link
/links/:linkId/lp             → LP editor travado no brand do link
/lp/:slug                     → LP pública renderizada com brand correta
```

Sidebar agrupada por: **Marcas · Links · Materiais · LPs · Downloads**.

## 6. Biblioteca de referências (odds/slots/cassino)

`src/lib/creativeReferences.ts` — curadoria de layouts de referência (odds cards, slot showcases, jackpot banners) categorizados por tipo + brand. Usado como preset no Creative Studio (`"Aplicar layout: Odds destaque"`), sempre respeitando os tokens da brand travada.

---

## Detalhes técnicos

- **Sem quebrar nada existente**: `brandRegistry` já existe; esta fase só adiciona `useLinkBrand` + guards + refatora os 6 componentes citados para consumir o hook.
- **DB**: nenhum schema novo. Reusa `tracking_links.platform_account_id` já existente.
- **Migrações**: nenhuma.
- **Edge functions**: opcional `render-material` (fase 5, só se quiser export server-side).
- **Fonts**: `brandFonts.ts` já carrega Articulat CF + Playfair — só garantir `document.fonts.ready` no export.

## Entregáveis desta rodada
1. `useLinkBrand` + `assertBrandReady` + `<BrandLockBadge/>`
2. Creative Studio + LinkMaterialEditor consumindo o hook (auto-injeção logo/selo/paleta/fonte/fundo)
3. LP Instances / Oportunidades / InfluencerLanding com brand travada pelo link + SEO correto
4. Export via `html-to-image` em stage offscreen (fix do "torto/quebrado")
5. Rotas reorganizadas conforme mapa acima

Fica de fora desta rodada (avisar antes se quiser incluir): edge function de render server-side e biblioteca de referências de layout (itens 4 fallback e 6).
