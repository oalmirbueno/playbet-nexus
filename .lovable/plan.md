# Editor de LP no padrão do Estúdio de Materiais

Foco: eliminar as limitações relatadas — não dá pra mover/organizar, copy não salva por bloco, marca VUPI não é puxada. Sem trocar o motor de renderização da LP (continua estruturado por seções, não canvas livre — o canvas livre é do Estúdio de Materiais e não faz sentido para uma LP pública com SEO).

## O que muda no editor (LpInstanceVisualEditor)

### 1. Reordenação real (drag) e alinhamento das seções
- Substituir as setas ↑/↓ por drag-and-drop nativo (HTML5 `draggable`) na lista de seções, mesmo padrão visual do Estúdio (handle à esquerda, hover, ghost).
- Manter os toggles on/off por seção.
- Ordem persiste em `layout_config.sections` (já suportado no schema; hoje só as setas mexem).

### 2. Save por bloco (não só o "Salvar LP" do rodapé)
Cada painel do sidebar ganha o próprio botão "Aplicar" com persistência parcial e refresh do preview — mesmo padrão do "Aplicar marca" que já implementamos:
- Copy (título, subtítulo, CTA) → grava `hype_copy.{title,subtitle,cta_label}` e marca `auto=false`.
- Bônus/código → grava `hype_copy.bonus_offer`.
- Comunidade → grava `hype_copy.community_cta`.
- Jogos exibidos → grava `game_slugs` + `game_ids`.
- Destaques inteligentes (odds) → grava `hype_copy.smart_odds`.
- Seções (ordem/toggles) → grava `layout_config.sections`.

O "Salvar LP" do rodapé permanece como save geral + copia link (comportamento atual), mas cada bloco já persiste sozinho — resolve o "ele não deixa salvar" que o usuário relatou.

### 3. Detecção da marca VUPI (e outras)
- Hoje `resolveBrand` já usa substring normalizada, mas a plataforma pode chegar como "Vupi Bet Brasil" e o alias registrado é `["vupi","vupibet","vupi-bet"]`. Vou adicionar "vupi bet" e reforçar a normalização (remover espaços) para bater com qualquer variação.
- Confirmar que o override manual (chip da VUPI no editor) já força a marca — o botão "Aplicar agora" recém-adicionado grava `layout_config.brand_override_key` e a LP pública já respeita.

### 4. Bloco "Assets da marca" com organização/alinhamento
Novo painel dedicado no sidebar (mesma pegada do Estúdio):
- Preview em grid dos assets da marca ativa (logos: mark / wordmark / lockup, selos: horizontal / vertical light+dark).
- Chips para escolher qual logo aparece no header/hero da LP (`layout_config.brand_assets.header_logo` e `hero_logo` — `lockup` | `wordmark` | `mark`).
- Chip para o selo do rodapé (`layout_config.brand_assets.footer_seal` — `h` | `v-light` | `v-dark`).
- Alinhamento do logo no hero (`layout_config.brand_assets.hero_align` — `left` | `center`).
- Toggle "Mostrar wordmark abaixo da mark" para lockups compostos.

Renderização pública (`InfluencerLanding`) passa a ler `layout_config.brand_assets` e aplica no hero/footer respeitando a escolha do editor.

### 5. Preview sempre fresco
Já corrigido no turno anterior — `_preview` bypassa cache. Fica valendo aqui também.

## Detalhes técnicos

Arquivos:
- `src/components/lp/LpInstanceVisualEditor.tsx` — drag-and-drop de seções, botões "Aplicar" por bloco (`applyCopy`, `applyBonus`, `applyCommunity`, `applyGames`, `applyOdds`, `applySections`), novo painel BrandAssets.
- `src/lib/brandRegistry.ts` — expandir `slugAliases` de VUPI e normalizar espaços em `resolveBrand`.
- `src/pages/InfluencerLanding.tsx` — ler `instanceCtx.layout_config.brand_assets` e aplicar no header/hero/footer (com fallback pro comportamento atual).

Persistência parcial (padrão que já usamos em `applyBrandOverride`):
```ts
const applyCopy = async () => {
  const nextHype = { ...(instance?.hype_copy || {}), title, subtitle, cta_label, auto: false };
  await supabase.from("landing_page_instances").update({ hype_copy: nextHype }).eq("id", instanceId);
  setInstance(prev => prev ? { ...prev, hype_copy: nextHype } : prev);
  setPreviewKey(k => k + 1);
  toast({ title: "Copy aplicada" });
};
```

Shape novo em `layout_config`:
```json
{
  "brand_assets": {
    "header_logo": "lockup",
    "hero_logo": "mark",
    "hero_align": "center",
    "footer_seal": "h",
    "show_wordmark": true
  }
}
```

## Fora do escopo

- Canvas livre (posição absoluta por px, redimensionar) — a LP pública é HTML semântico com SEO; canvas livre quebra responsividade e crawlers. O Estúdio de Materiais mantém canvas porque renderiza imagem final. Se quiser mesmo canvas na LP, é outro projeto.
- Novos modos de LP.
- Alterar o motor de tracking/URLs.
