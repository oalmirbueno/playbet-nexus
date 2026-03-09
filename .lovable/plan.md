

## Auditoria Completa e Plano de Integração do Sistema PlayBet

### Diagnóstico

Após análise detalhada de todas as páginas, identifiquei as seguintes categorias de problemas:

#### 1. Páginas usando estado local (useState) em vez do backend -- dados perdidos ao recarregar

| Página | Problema |
|--------|----------|
| **Saques.tsx** | `useState<SaqueExtended[]>([])` -- nunca busca do banco |
| **Socios.tsx** | `useState<Socio[]>([])` -- nunca busca do banco |
| **Campanhas.tsx** | `useState<Campanha[]>([])` -- nunca busca do banco |
| **Conteudo.tsx** | `useState<ConteudoItem[]>([])` -- nunca busca do banco |
| **LinksAfiliados.tsx** | `useState<LinkAfiliado[]>([])` -- local only |
| **LinkEngine.tsx** | `useState<InfluencerLP[]>([])` -- local only |
| **HubsRotas.tsx** | `useState<Hub[]>([])` -- local only |
| **Estrategia.tsx** | `useState(emptyBlocks)` -- local only |
| **RegrasFinanceiras.tsx** | `useState(initialRegras)` -- hardcoded |
| **Permissoes.tsx** | `useState(initialUsuarios)` -- hardcoded |

#### 2. Páginas já integradas ao backend (OK)
- Influencers, Jogos, Plataformas, Landing Pages, LPInstances, LPTemplates, LPPerformance, UTMs
- Financeiro (leitura via hooks), CalendarioEditorial (leitura via hooks)
- DashboardExecutivo, DashboardOperacional, Dashboard, Configuracoes

#### 3. Páginas placeholder sem funcionalidade
- Analytics, Conversoes, Auditoria, UsuariosInternos, AsaasPagamentos, Comissoes

#### 4. Bug de rota
- Financeiro.tsx aponta para `/asaas-pagamentos` mas a rota correta é `/asaas`

---

### Plano de Implementação

#### Fase 1: Integrar as 4 tabelas existentes no backend (Saques, Socios, Campanhas, Conteudo)

Essas tabelas já existem no banco e têm hooks (`useSaques`, `useSocios`, `useCampanhas`, `useConteudo`). As páginas só precisam trocar `useState` pelos hooks.

**Saques.tsx** - Trocar `useState<SaqueExtended[]>([])` por `useSaques()`. Adaptar CRUD para usar `create`/`update`/`remove` do hook. Manter filtros e modais. Ações de aprovar/rejeitar usam `update` para alterar status no banco.

**Socios.tsx** - Trocar `useState<Socio[]>([])` por `useSocios()`. Adaptar tipos de `Socio` (types/index.ts) para `SocioRow` (supabaseService). CRUD via hook.

**Campanhas.tsx** - Trocar `useState<Campanha[]>([])` por `useCampanhas()`. Adaptar tipos para `CampanhaRow`. CRUD via hook, incluindo duplicar e mudar status.

**Conteudo.tsx** - Trocar `useState<ConteudoItem[]>([])` por `useConteudo()`. Adaptar tipos para `ConteudoRow`. CRUD via hook, incluindo mover status no kanban.

#### Fase 2: Corrigir bugs e links quebrados

- Financeiro.tsx: corrigir link `/asaas-pagamentos` para `/asaas`
- DashboardOperacional: adicionar dados de campanhas, saques, socios, conteudo nos widgets

#### Fase 3: Páginas que permanecem local-only (não têm tabela no banco)

As seguintes páginas usam dados que não precisam de persistência no banco ou são configurações estáticas. Permanecerão com estado local por enquanto, mas funcionais:

- **RegrasFinanceiras.tsx** -- hardcoded rules, funcional como está
- **Permissoes.tsx** -- usa dados do user_roles real + perfis estáticos, funcional
- **LinksAfiliados.tsx** -- funcionalidade coberta por UTMs/LPInstances
- **LinkEngine.tsx** -- funcionalidade coberta por LPInstances
- **HubsRotas.tsx** -- local CRUD, funcional
- **Estrategia.tsx** -- local CRUD, funcional como notepad tático

#### Fase 4: Enriquecer páginas placeholder com dados reais

- **Analytics** -- mostrar métricas de clicks existentes (clickService)
- **Conversoes** -- mostrar funil baseado em clicks
- **DashboardOperacional** -- adicionar campanhas, saques e conteúdo nos KPIs
- **Comissoes** -- mostrar cálculo baseado em influencers e socios do banco

### Resumo de Arquivos a Editar

1. `src/pages/Saques.tsx` -- integrar com useSaques()
2. `src/pages/Socios.tsx` -- integrar com useSocios()
3. `src/pages/Campanhas.tsx` -- integrar com useCampanhas()
4. `src/pages/Conteudo.tsx` -- integrar com useConteudo()
5. `src/pages/Financeiro.tsx` -- fix rota /asaas
6. `src/pages/DashboardOperacional.tsx` -- adicionar KPIs de campanhas/saques/conteudo
7. `src/pages/Analytics.tsx` -- mostrar dados de clicks
8. `src/pages/Conversoes.tsx` -- mostrar funil de clicks
9. `src/pages/Comissoes.tsx` -- cálculo com dados reais

Nenhuma migração de banco necessária -- todas as tabelas já existem.

