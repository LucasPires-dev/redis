## Objetivo

Criar um **padrão visual e estrutural único** de "página de detalhe" no Redis, reutilizado em Ministério, Célula/GT, Evento, Pessoa e Curso — variando apenas o conteúdo específico de cada entidade. Hoje já existem `campus/$id`, `ministerios/$kind` e `cursos/$id`; vou padronizá-los e criar os que faltam.

## O padrão (DetailPage)

Todas as telas de detalhe seguem a mesma anatomia, de cima para baixo:

```text
┌──────────────────────────────────────────────┐
│ ← voltar para a listagem                     │
│                                              │
│ [ícone]  Título grande                       │
│          subtítulo (contexto: campus,        │
│          data, ministério, papel...)         │
│                                       [badges/ações]
├──────────────────────────────────────────────┤
│  Stat  │  Stat  │  Stat  │  Stat   (KPIs)   │
├──────────────────────────────────────────────┤
│  Seções de conteúdo (2–4, específicas):      │
│   - "Sobre" / metadados                      │
│   - Relacionados (pessoas, campus, células)  │
│   - Linha do tempo / próximos itens          │
└──────────────────────────────────────────────┘
```

Componentes reutilizáveis a extrair para `src/components/detail/`:
- `DetailHeader` — breadcrumb/voltar, ícone, título, subtítulo, slot de badges.
- `StatCard` — KPI compacto (ícone + label + valor). Substitui as cópias hoje em `campus.$id`, `ministerios.$kind`, `cursos.$id`.
- `DetailSection` — título de seção em caps + grid de cards.
- `EntityCard` — card clicável padrão para itens relacionados (pessoa, célula, evento).
- `EmptyState` — texto discreto quando a lista está vazia.

Regras de permissão continuam vindo do `mock-store` (`currentRole`, `currentCampusId`) — o padrão só define layout.

## Variações por entidade

**Ministério (`/app/ministerios/$kind`)** — já existe, será refatorado para o padrão.
- KPIs: pessoas, batizados, em célula, campus onde atua.
- Seções: "Por campus" (cards navegáveis), "Próximos eventos ministeriais", "Líderes".

**Célula / GT (`/app/celulas/$id`)** — novo.
- KPIs: membros, frequência média, batizados, encontros no mês.
- Seções: "Sobre" (dia, horário, líder, campus), "Membros" (lista), "Últimos encontros" (mock de frequência).

**Evento (`/app/eventos/$id`)** — novo.
- KPIs: data, escopo, campus, público estimado.
- Seções: "Detalhes" (descrição, local, organizador), "Compartilhado com" (cascata: geral → campus → ministérios), "Presenças" (placeholder).

**Pessoa (`/app/pessoas/$id`)** — novo.
- KPIs: batizado (sim/não + data), célula atual, ministérios, cursos concluídos.
- Seções: "Perfil" (contato, campus, GT/discipulador), "Trajetória" (batismo, cursos, entrada em célula), "Frequência" (cultos/células — mock).

**Curso (`/app/cursos/$id`)** — já existe, será alinhado ao padrão (mesmo `DetailHeader` + `StatCard`).
- KPIs: inscritos, escopo, duração, concluintes.
- Seções: "Sobre", "Turmas/Inscritos" (placeholder).

**Campus (`/app/campus/$id`)** — já existe, será alinhado ao padrão sem perder as seções atuais (ministérios, células, eventos).

## Navegação

Tornar clicáveis, na listagem, os itens que hoje não linkam para detalhe:
- `app.celulas.tsx` → card leva a `/app/celulas/$id`.
- `app.eventos.tsx` → item leva a `/app/eventos/$id`.
- `app.pessoas.tsx` → linha leva a `/app/pessoas/$id`.

## Entregáveis (arquivos)

Novos:
- `src/components/detail/DetailHeader.tsx`
- `src/components/detail/StatCard.tsx`
- `src/components/detail/DetailSection.tsx`
- `src/components/detail/EmptyState.tsx`
- `src/routes/app.celulas.$id.tsx`
- `src/routes/app.eventos.$id.tsx`
- `src/routes/app.pessoas.$id.tsx`

Refatorados para usar os componentes acima (sem mudar comportamento/permissões):
- `src/routes/app.ministerios.$kind.tsx`
- `src/routes/app.campus.$id.tsx`
- `src/routes/app.cursos.$id.tsx`
- `src/routes/app.celulas.tsx`, `app.eventos.tsx`, `app.pessoas.tsx` (linkar cards)

Se o `mock-store` não tiver campos como `description` de evento, líder de célula ou data de batismo, adiciono como opcionais com fallback "—" na UI (sem quebrar dados existentes em `localStorage`).

## Fora do escopo

- Edição/criação de registros nessas telas.
- Backend/Lovable Cloud.
- Regras de permissão novas — mantenho as atuais.
