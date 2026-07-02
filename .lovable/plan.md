
## Objetivo

Ao gerar um tracking link, o sistema decide/oferece uma LP de Oportunidade correspondente, monta o preview automaticamente com o conteúdo certo (1 jogo, N jogos, odds, ou catálogo geral) e dispara os materiais criativos vinculados àquele link — tudo sincronizado, editável e sem digitação manual.

## Como o fluxo fica

```text
Criar link ──► detecta contexto (jogo/odds/catálogo)
     │
     ├─► LP: [usar existente] ou [criar nova instância]
     │        └─► preview auto-montado no modo certo:
     │             • single-game    (1 jogo → hero + CTA direto)
     │             • multi-game     (3/5/10 jogos → grade)
     │             • odds           (partidas/mercados)
     │             • catálogo geral (todos os jogos da casa)
     │        └─► editor: reordenar, ocultar, editar copy inline
     │        └─► salva → reflete na LP pública
     │
     └─► Materiais: gera automático conforme regra da plataforma
              (admin escolhe formatos × estilos por casa)
```

## Entregas

### 1. Modo inteligente de LP (auto-detecção)

Ao gerar o link, o backend classifica o `lp_mode` a partir do `link_category`, `game_slug` e quantidade de jogos escolhidos:

- **`single_game`** — 1 jogo selecionado → hero grande com a arte, CTA "Jogar agora" com deep link do jogo.
- **`multi_game`** — 3, 5 ou 10 jogos → grade com artes reais e CTA individual por card.
- **`odds`** — categoria `sports`/`odds` → cartelas de partidas/mercados.
- **`catalog`** — sem jogo específico → todas as opções ativas da casa.

Nunca mistura modos. A troca de modo é explícita no editor (dropdown).

### 2. Passo "LP" dentro do QuickLinkDialog

Novo bloco entre "Contexto" e "SUBID":

- Opção **Usar LP existente** (select das instâncias ativas do influencer) **ou** **Criar nova instância**.
- Ao criar: instancia derivada da LP base da plataforma, com `lp_mode`, `game_ids[]` e `hype_copy` já preenchidos.
- Botão "Abrir preview" leva ao editor sem sair do fluxo.

### 3. Editor visual da LP de Oportunidades

Página nova `/admin/lps/oportunidades/:instanceId/editor`:

- Preview 1:1 do que sai em produção (iframe da rota real).
- Painel lateral: reordenar/ocultar seções (hero, grade de jogos, odds, prova social, footer), editar título/subtítulo/motivo do hype inline.
- Botão "Trocar modo" (single/multi/odds/catalog) recarrega o preview.
- Salvar → grava em `landing_page_instances.layout_config` (JSONB) e propaga para a LP pública.

### 4. Materiais configuráveis por plataforma

- Nova aba em `PlataformasPage`: **Regras de materiais** (matriz formato × estilo, toggle on/off por casa).
- Ao criar o link, edge function `materials-autogenerate` lê a matriz da plataforma e enfileira os jobs. Cada material fica vinculado ao `tracking_link_id` (não só ao influencer).
- Materiais aparecem em `/materiais` filtráveis por link.

## Detalhes técnicos

### Migrations
- `landing_page_instances`: adicionar `lp_mode text`, `game_ids uuid[]`, `layout_config jsonb`, `source_tracking_link_id uuid`, `hype_copy jsonb`.
- `tracking_links`: já tem `landing_page_instance_id`. Adicionar `lp_auto_generated boolean`.
- Nova tabela `platform_material_rules(platform_id, format, style, enabled)` com GRANTs + RLS (admin CRUD, todos leem).
- Nova tabela `link_materials(id, tracking_link_id, format, style, image_url, status, meta)` com GRANTs + RLS (influencer/gerente do link leem; admin CRUD).

### Edge functions
- `lp-autoconfigure` — recebe `{tracking_link_id}`, decide `lp_mode`, monta `layout_config` inicial, cria/atualiza instância.
- `materials-autogenerate` — recebe `{tracking_link_id}`, aplica matriz da plataforma, renderiza via `creativeStudio` server-side (canvas em Deno via `skia-canvas` — se indisponível, gera manifest e o front renderiza sob demanda em cache).

### Frontend
- `QuickLinkDialog.tsx` — novo passo "LP".
- `TrackingLinkForm.tsx` — mesmo passo em versão desktop.
- `src/pages/admin/lps/OportunidadeLpEditor.tsx` — editor com preview + painel.
- `src/lib/lpMode.ts` — heurística de detecção compartilhada.
- `PlataformasPage.tsx` — aba "Materiais".
- `MateriaisView.tsx` — filtro por link + preview.

### Sync
- Trigger `after insert on tracking_links` → chama `lp-autoconfigure` e `materials-autogenerate` (via `pg_net` ou fila em `job_queue`).
- Editor salva → `landing_page_instances.updated_at` bump → LP pública re-renderiza (React Query invalidation via realtime).

## Fora do escopo desta entrega

- A/B testing de LPs (fica para depois).
- Deep-link real dentro do provedor (usa URL padrão do jogo até termos API oficial).
- Editor de materiais pixel-a-pixel (usa presets do `creativeStudio` atual).

## Ordem de execução

1. Migrations (schema + RLS + GRANTs).
2. `lp-autoconfigure` + trigger.
3. Passo "LP" nos dois dialogs de link.
4. Editor visual da LP.
5. Matriz de materiais na PlataformasPage + `materials-autogenerate`.
6. MateriaisView filtrado por link.
7. QA end-to-end: criar link → LP montada → editar → salvar → materiais na fila → aparecer em `/materiais`.
