## Novo módulo: Comercial

Nova seção **COMERCIAL** no sidebar com 3 telas:
- **Pipeline** (Kanban) – fluxo de captação
- **Squads & Gerentes** – cadastro e regra de distribuição
- **Qualificação** – modelo de checklist e requisitos

Acesso: qualquer admin (admin_master, socio). Gerentes só veem cards do próprio squad. Influencer só vê o portal final.

---

## 1. Pipeline Kanban

Colunas fixas, na ordem:

```text
Em contato → Respondeu → Checklist → Cadastro → Análise → Aprovado → Concluído
```

Card = um candidato a influencer. Drag-and-drop entre colunas. Ao soltar, o sistema dispara a ação da coluna de destino:

| Coluna     | O que acontece ao chegar                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Em contato | Estado inicial, criado pelo admin com nome + handle + canal de origem                                                                          |
| Respondeu  | Marca data da 1ª resposta. Libera próximos passos                                                                                              |
| Checklist  | **Anexa automaticamente o template ativo de qualificação**. Admin marca itens como OK direto no card                                           |
| Cadastro   | Abre formulário completo: dados básicos, redes, conteúdo/nicho, comercial/financeiro, documentos                                               |
| Análise    | Card vira somente-leitura para gerentes; admin decide aprovar / reprovar                                                                       |
| Aprovado   | Escolha o **Squad** → sistema escolhe o **Gerente** por round-robin (menor nº de influencers ativos no squad). Dispara mensagem template de boas-vindas |
| Concluído  | Cria o registro definitivo em `influencers`, vincula gerente, gera link de afiliado base e libera o **Portal do Influencer**                   |

Regressões (arrastar para coluna anterior) são permitidas com motivo.

Cada card mostra: avatar/iniciais, nome, handle principal, % do checklist preenchido, dias na coluna atual, gerente atribuído (quando houver), tags de nicho.

Filtros do topo: busca, squad, gerente, nicho, origem, "parados há +N dias".

---

## 2. Checklist de qualificação

Template versionado, editável em **Comercial > Qualificação**. Grupos:

- **Dados básicos** – nome, CPF/CNPJ, e-mail, WhatsApp, cidade/UF
- **Redes e audiência** – Instagram, TikTok, YouTube, Telegram, X, Kwai (handle + seguidores + engajamento + nicho)
- **Conteúdo e nicho** – nicho principal, tipo de conteúdo, frequência, links de exemplo
- **Comercial e financeiro** – modelo (CPA/RevShare/Híbrido), histórico, conta Asaas/PIX, contrato

Cada item: label, obrigatório sim/não, tipo (texto, número, boolean, link, arquivo). Admin marca direto no card; barra de progresso fica visível.

Requisito mínimo configurável (ex.: "≥80% dos obrigatórios" para liberar Análise).

---

## 3. Squads & Gerentes

- Squad: nome, cor, descrição, lista de gerentes.
- Gerente NÃO entra no squad como membro fixo do quadro; ele é distribuível dentro do squad.
- Distribuição padrão: round-robin balanceado pelo nº de influencers ativos. Botão "reatribuir manualmente" sempre disponível.

---

## 4. Portal do Influencer + Gerente

Após "Concluído", abre tela nova (mesmo sistema, layout enxuto) acessível por:
- Influencer aprovado (login próprio, role `influencer`)
- Gerente responsável (role `gerente`)

Mostra:
- Link de afiliado dele
- Métricas trackeadas: cliques, registros, FTD, depósitos, revenue, comissão
- Histórico do pipeline (read-only)
- Materiais e links rápidos

Reaproveita o tracking existente (`tracking_links`, `tracking_metrics`).

---

## Detalhes técnicos

### Banco (migration)
- `commercial_pipeline_cards` – stage, candidate fields, squad_id, manager_id, checklist_progress, position, moved_at, source, notes
- `commercial_checklist_templates` + `commercial_checklist_items` (versionados)
- `commercial_card_checklist` – respostas por card
- `commercial_card_history` – auditoria de movimentações
- `squads` (já existe) ganha relação com gerentes; criar `squad_managers` se preciso
- Trigger ao mover para "Aprovado": grava squad/manager via round-robin
- Trigger ao mover para "Concluído": cria `influencers` row + tracking link base
- RLS: admin vê tudo; gerente vê só cards do seu squad/atribuídos; influencer só o próprio (após concluído)
- GRANTs explícitos em todas as tabelas novas

### Frontend
- Rotas: `/comercial`, `/comercial/squads`, `/comercial/qualificacao`, `/portal/:slug` (influencer+gerente)
- Item de menu **COMERCIAL** no sidebar com 3 sub-itens
- Kanban com dnd-kit (já leve, sem dependências pesadas)
- Card detail em Sheet lateral
- Reuso de componentes: Card, Badge, Sheet, Form (zod), toasts

### Roles
- `comercial` (novo, opcional) ou liberado para `admin_master`/`socio`
- `gerente` (novo) – escopo squad
- `influencer` (novo) – escopo próprio
- Atualizar `has_role`/policies

---

## Como vamos entregar

Para não virar um bloco gigante de uma vez, proponho 3 entregas seguidas:

1. **Estrutura**: migration (tabelas, RLS, triggers de distribuição), item de menu, telas vazias com layout.
2. **Pipeline + Checklist**: Kanban funcional, drag-and-drop, template de checklist, formulário de cadastro, automações de coluna.
3. **Portal Influencer/Gerente**: rota nova, integração com tracking, mensagem de boas-vindas, refinamentos.

Posso começar pela entrega 1 (banco + esqueleto visual) assim que você aprovar?
