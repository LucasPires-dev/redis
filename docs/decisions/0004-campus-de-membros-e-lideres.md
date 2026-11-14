# 0004. Membros de qualquer campus, líderes só do campus da célula

- Status: Aceito
- Data: 2026-11-09
- Repositórios: redis-api

## Contexto

A célula pertence a um campus. Era preciso decidir se as pessoas ligadas a ela também precisam
ser desse campus. Até aqui, só o fluxo da Reconciliação verificava o campus, e o cadastro
comum de membros não verificava nada.

## Decisão

- **Membros podem ser de qualquer campus.** Uma pessoa que frequenta um campus pode participar
  de uma célula de outro (por morar perto, por exemplo).
- **Líderes e colíderes precisam ser do campus da célula.** A API recusa a atribuição caso
  contrário.
- A mesma regra vale para o responsável pelas células do campus
  ([0003](0003-hierarquia-de-responsaveis-pelas-celulas.md)).

## Alternativas consideradas

- **Exigir o mesmo campus para todos.** Impediria uma situação legítima e comum.
- **Não exigir nada, nem para líderes.** A liderança responde ao campus. Um líder de outro
  campus fica fora da linha de cuidado do líder e do responsável daquele campus.

## Consequências

- A busca de pessoas para **líder** só mostra pessoas do campus da célula. A busca para
  **membro** mostra todas.
- Pendência conhecida: o líder de uma célula pode não conseguir abrir o perfil de um membro de
  outro campus, porque `/api/people/` não dá esse acesso. Será tratado à parte.
- Implementação: `CellViewSet.leaderships` e `CellViewSet.people_search`.
