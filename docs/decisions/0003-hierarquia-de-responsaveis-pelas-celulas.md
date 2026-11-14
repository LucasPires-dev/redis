# 0003. Hierarquia de responsáveis pelas células

- Status: Aceito
- Data: 2026-11-09
- Repositórios: redis-api, redis-app

## Contexto

Antes, só o gestor da mega igreja criava células e definia seus líderes. Na prática, a igreja
tem uma pessoa responsável pelas células da igreja toda e, em cada campus, alguém que cuida das
células daquele campus. Esses papéis não existiam no sistema.

## Decisão

Quatro níveis, cada um com poderes definidos. Cada papel é uma **liderança reatribuível** (uma
linha própria), no mesmo padrão das demais lideranças do sistema, e não um campo fixo na pessoa.

| Papel | Quem define | Alcance | Pode |
|---|---|---|---|
| **Responsável geral pelas células** (`CellGeneralLeadership`) | Gestor (admin) | Igreja toda | Criar e editar temporadas; ver e gerenciar todas as células; criar células; definir líderes; renovar; definir o responsável de qualquer campus. |
| **Líder de campus** (já existia) | Gestor | Seu campus | Definir o responsável pelas células do campus; tudo o que esse responsável pode. |
| **Responsável pelas células do campus** (`CampusCellsLeadership`, líder ou colíder) | Líder do campus | Seu campus | Ver e gerenciar todas as células do campus; criar células; definir líderes; renovar. **Não** mexe em temporadas. |
| **Líder/colíder da célula** | Responsável do campus (ou acima) | Sua célula | Editar a célula, gerenciar membros, registrar encontros. **Não** define líderes. |

O gestor pode tudo. Membros da célula só visualizam.

Regras adicionais:

- O responsável pelas células do campus precisa **ser do próprio campus**.
- Ninguém promove a si mesmo: o líder da célula não define líderes da própria célula.
- Um campus pode ter mais de um responsável (líder e colíderes).

## Alternativas consideradas

- **Reaproveitar o "líder geral de ministério"** criando um tipo de ministério "Células".
  Descartada: células não são um ministério, e o tipo apareceria indevidamente em listas de
  ministérios e como público-alvo.
- **Deixar a gestão de células só com o líder de campus.** Sobrecarrega o líder de campus e
  não reflete como a igreja se organiza. O líder de campus mantém os poderes, mas delega.

## Consequências

- A API decide as permissões. O frontend só esconde botões com base nos campos `can_manage`
  e `can_coordinate` de cada célula e nos papéis do `/api/auth/me/`
  (`is_cells_general_leader`, `led_campuses_cells`).
- Para escolher pessoas (membros, líderes, responsáveis) existem buscas dedicadas que
  devolvem só nome e email, porque `/api/people/` não dá a esses papéis acesso a pessoas de
  outros campus.
- O responsável geral é atribuído pelo admin do Django, por enquanto sem tela.
- Implementação: `apps/churches/permissions.py` (`can_coordinate_cells`,
  `can_coordinate_campus_cells`, `can_assign_campus_cells_leader`, `can_manage_cell`).
  Regras de acesso resumidas em [access-levels.md](../access-levels.md).
