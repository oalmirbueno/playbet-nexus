# Portais Influenciador e Gerente + Gestão de Usuários (Admin)

Mesma app, mesmo login. Cada papel vê uma coisa diferente por RLS + layout. Admin ganha gestão completa de usuários e preview dos portais.

## Papéis

**Influenciador** (`influencer`) — entra em `/portal`
- Só os dados dele: KPIs, links de afiliado, financeiro, saques, perfil

**Gerente** (`gerente`) — entra em `/gerente`
- Só o squad dele: ranking, influenciadores do squad, pipeline comercial do squad

**Admin / Sócio** — continua vendo tudo; ganha novos controles em Configurações.

## Novidade: Configurações → Sistema · Admin → "Usuários & Acessos"

- **Lista** de usuários (profiles) com papel, vínculo, status, último login
- **Convidar** por e-mail com papel + vínculo opcional (influencer ou manager existente)
- **Editar** papel/vínculo, desativar
- **Preview como…** botões `Ver como Influenciador` / `Ver como Gerente` — abre o portal correspondente com banner "Você está visualizando como X — sair", sem trocar sessão (admin já tem acesso full no back)

## Técnico

```text
AuthContext.role
  ├─ admin_master / socio  → DashboardLayout + preview de /portal e /gerente
  ├─ gerente               → ManagerLayout + /gerente/*
  └─ influencer            → InfluencerPortalLayout + /portal/*
```

- Enum `app_role` ganha `influencer` e `gerente`
- `profiles.influencer_id` e `profiles.manager_id` (FKs nullable)
- RLS por papel em `tracking_metrics`, `tracking_events`, `saques`, `commercial_pipeline_cards`, `influencers`, `tracking_links` (via `has_role` + join no profile)

## Telas

**Portal Influenciador (mobile-first)**: `/portal` · `/portal/links` · `/portal/financeiro` · `/portal/saques` · `/portal/perfil`

**Portal Gerente**: `/gerente` · `/gerente/ranking` · `/gerente/influenciadores` · `/gerente/pipeline` · `/gerente/perfil`

**Admin**: Configurações → Usuários & Acessos (tabela + convidar + editar + preview-as)

## Ordem de execução

1. Migração: enum + colunas profiles + RLS
2. Layouts InfluencerPortalLayout e ManagerLayout
3. Roteamento por papel + banner de preview
4. 5 telas do Portal Influenciador
5. 5 telas do Portal Gerente
6. Seção Usuários & Acessos em Configurações

## Fora desta rodada
- Página institucional "Novidades / Como funciona"
- Sala de sinais no portal
- Notificações push/e-mail

Aprova pra rodar?