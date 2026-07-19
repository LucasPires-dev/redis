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

Isso hoje é um protótipo **só de frontend** (dados em `localStorage`, sem backend real). As
regras de `canAccessMinistryAtCampus`/`visiblePeople`/`visibleEvents` são a especificação de
como a autorização deve se comportar — quando isso for implementado num backend de verdade,
essa é a lógica que precisa virar permissão de API, não só filtro de UI.
