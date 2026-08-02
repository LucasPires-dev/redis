# Níveis de acesso

Este app modela uma mega igreja com múltiplos **campus**, e dentro de cada campus os mesmos
**ministérios fixos** se repetem (jovens, crianças, adolescentes, mulheres, homens...).

A liderança de um ministério tem dois níveis:

- **Líder geral do ministério** — uma pessoa responde pelo ministério (ex: Jovens) em toda a
  instituição, através de todos os campus.
- **Líder local** — cada campus tem seu próprio líder para aquele ministério, que responde
  apenas pelo que acontece ali.

## Papéis (`RoleKey`)

Definidos em [`src/lib/mock-store.ts`](../src/lib/mock-store.ts):

| Papel | Enxerga |
|---|---|
| `gestor` — Gestor da Mega Igreja | Tudo: todos os campus, todos os ministérios. |
| `lider_campus` — Líder de Campus | Todos os ministérios, mas só do campus dele. |
| `lider_geral_ministerio` — Líder Geral de Ministério | Um tipo de ministério, em todos os campus. |
| `lider_ministerio_campus` — Líder de Ministério/GT | Um tipo de ministério, só no campus dele. |

## Onde isso é aplicado no código

- `RoleKey`, `MINISTRY_LABEL`, `ROLE_LABEL` — definições em [`mock-store.ts`](../src/lib/mock-store.ts).
- `ministryGeneralLeaders` (DB) — mapa `MinistryKind -> personId` do líder geral de cada ministério.
- `Ministry.leaderId` — líder local daquele ministério naquele campus.
- `canAccessMinistryAtCampus(db, kind, campusId)` — regra de visibilidade central: decide se o
  papel ativo pode ver um ministério×campus específico. Usada em
  [`app.ministerios_.$kind_.$campusId.tsx`](../src/routes/app.ministerios_.$kind_.$campusId.tsx)
  (a tela mais granular, onde o líder local vive no dia a dia).
- `visiblePeople` / `visibleEvents` — mesmas regras aplicadas a listas de pessoas e eventos.
- A troca de papel para demonstração fica no topo do app ([`app.tsx`](../src/routes/app.tsx),
  componente `TopBar`) — junto com os seletores de campus/ministério ativo quando o papel exige.

## Hierarquia de telas de ministério

```
/app/ministerios                          → lista de ministérios (filtrada por papel)
/app/ministerios/:kind                    → um ministério em todos os campus (visão do líder geral)
/app/ministerios/:kind/:campusId          → um ministério em um campus (visão do líder local)
```

## Importante

`lider_campus` (Líder de Campus) já é um papel real no backend (`redis-api`), não mais só
protótipo de frontend: `apps.churches.models.CampusLeadership` + `led_campuses`/
`can_manage_campus` em `apps.churches.permissions`, seguindo o mesmo padrão de
`CellLeadership`/`TeamLeadership`/`MinistryLeadership` — uma liderança é uma linha
reatribuível, não um campo fixo na pessoa. Ele dá acesso a todo ministério, célula, equipe e
atividade do campus liderado (`scope_ministries`/`scope_cells`/`scope_teams`/`scope_activities`
já incluem essa condição), e aparece em `/api/auth/me/` como `led_campuses`.

O restante deste documento — `RoleKey`, o seletor de papel no topo do app, `visiblePeople`/
`visibleEvents` — continua sendo só um protótipo de frontend (`mock-store.ts`), usado apenas
pelas telas ainda não migradas para a API real (`/app/campus`, `/app/cursos`, `/app/eventos`).
Para as telas já migradas (`/app/ministerios`, `/app/celulas`, `/app/pessoas`,
`/app/reconciliacao`), a autorização é sempre a da API — o filtro de UI aqui é só reflexo dela.

## Ministério de Reconciliação

Acompanhamento de novos convertidos. Modelado como mais um `MinistryKind`
(`"reconciliacao"`) — reaproveita 100% da estrutura de liderança de ministério:
`Ministry(kind="reconciliacao").members` é o time de reconciliadores; seus líderes/colíderes
locais são o "líder do ministério do campus"; `MinistryGeneralLeadership(kind="reconciliacao")`
é o líder geral.

- Novos convertidos entram como `ReconciliationLead` (linha crua importada da planilha do
  Google conectada ao Forms) — descartável, sem login. Um líder de campus ou do ministério
  triagem/atribui a um reconciliador, o que cria a `Person` de verdade (sem senha ainda) e o
  registro `Reconciliation` de acompanhamento.
- Batismo reaproveita `Person.baptized`/`baptized_at`; GT reaproveita `Cell.members`; servir
  reaproveita `Ministry.members` — nada é duplicado. `Reconciliation` só guarda o que não existe
  em outro lugar: `reconciliador`, `jornada_completed`/`jornada_completed_at`, auditoria de
  atribuição.
- App dedicado: `apps.reconciliation` (models/permissions/views/urls próprios, sincronização
  via `python manage.py sync_reconciliation_leads`).
- Frontend: `/app/reconciliacao` (triagem) e `/app/reconciliacao/dashboard` (progresso por
  reconciliador/campus), visível só a gestor, líder de campus e líder (geral ou local) do
  ministério de Reconciliação — ver `hasReconciliationAccess` em `app.tsx`.

## Módulo de Produção

Coordena a produção de Cultos/Eventos entre os **ministérios de público** (Jovens, Mulheres,
Homens, Adolescentes — criam Eventos) e os **ministérios técnicos** (Mídia, Som, Iluminação,
Palco, Transmissão — executam a produção). Mesmo padrão da Reconciliação: reaproveita
`Ministry`/`MinistryLeadership`/`MinistryGeneralLeadership` de `apps.churches` sem duplicar
estrutura de liderança — só adiciona `MinistryKind` novos (`media`, `som`, `iluminacao`,
`palco`, `transmissao`) e a constante `PRODUCTION_MINISTRY_KINDS` (não é campo de banco, só
classifica quais kinds são "técnicos" para validar o destino de uma `Demand`).

- **Event** — generalização de "Culto": `campus` nulo = escopo geral (líder geral do
  ministério, vale para todos os campi); preenchido = escopo local. `ministry_kind` nulo =
  Culto regular (Coordenação Geral); preenchido = evento de um ministério de público.
- **RundownItem** — ordem do culto, um item por vez, com um `ministry_kind` principal
  responsável.
- **RundownItemStatus** — o sinal 🟢🟡🔴 que *qualquer* ministério reporta para um item (não
  precisa ser o responsável principal do item — ex: Iluminação reporta status no item "Louvor
  1" mesmo o responsável sendo Louvor).
- **Demand** — pedido de um ministério a outro (`from_ministry_kind` → `to_ministry_kind`),
  com prioridade/prazo/status. Só pode ser endereçada a um `to_ministry_kind` técnico
  (validado no serializer). Fluxo: ministério de público cria Evento → abre Demand pro técnico
  → técnico aceita/conclui (ou recusa) → time técnico monta a Escala do Evento (Fase 2).
- **EventRosterEntry** (Escala, Fase 2) — quem serve num Evento, ligado a um `Ministry`
  específico (campus-bound, não só ao `ministry_kind`) porque o convite vem da lista de
  `Ministry.members` daquele Ministry — mesmo picker que a Reconciliação usa. Convidar exige
  `can_manage_ministry` (reaproveitado de `apps.churches.permissions`, sem duplicar). Confirmar/
  recusar: o próprio convidado ou quem gerencia o ministério (`can_respond_roster_entry`).
- **EventChecklistItem** (Checklist, Fase 2) — item ad-hoc por `ministry_kind`, sem template
  ainda (fica pra Fase 3/4). Criar/marcar feito: mesma regra do status do rundown
  (`_can_act_for_ministry_on_event`, fatorada e reaproveitada por `can_report_item_status` e
  `can_manage_checklist_item`).
- Visibilidade (`scope_events`/`scope_demands` em `apps/production/permissions.py`): além do
  padrão líder geral/local/campus, ministérios **técnicos** enxergam todos os eventos do
  próprio campus (não só os do seu kind) — eles apoiam a produção de qualquer evento ali, não
  só os que criaram. `EventRosterEntry`/`EventChecklistItem` reaproveitam essa mesma
  visibilidade via `event__in=scope_events(...)`, sem função de scope própria.
- App dedicado: `apps.production`. Frontend: `/app/producao` (resumo do dia) e
  `/app/producao/eventos/:id` (ordem do culto com status por ministério — poll a cada 15s como
  substituto simples de tempo real nesta fase — mais as seções de Escala e Checklist) e
  `/app/producao/demandas` (abas Recebidas/Enviadas + criação de demanda).
