# 0002. Renovar uma célula cria uma célula nova, preservando o histórico

- Status: Aceito
- Data: 2026-11-09
- Repositórios: redis-api, redis-app

## Contexto

Com as células organizadas por temporada ([0001](0001-celulas-por-temporada.md)), muitas
células continuam de uma temporada para a outra, com o mesmo nome, líderes e boa parte dos
membros. Era preciso decidir o que acontece com a célula na virada.

## Decisão

- **Cada temporada tem as suas próprias células.** Levar uma célula para a temporada seguinte
  ("renovar") cria um **novo registro** de célula, ligado ao anterior (`previous_cell`).
- A renovação copia nome, dia, horário, público-alvo, endereço, descrição e **líderes**.
  Os **membros** são copiados por padrão, com opção de não levar.
- A célula da temporada anterior **não é alterada**: membros, líderes e encontros ficam
  guardados como histórico daquela temporada.
- Datas próprias da célula não são copiadas, porque pertencem à temporada antiga.
- Não é possível renovar duas vezes para a mesma temporada.

## Alternativas consideradas

- **A mesma célula continua e só troca de temporada.** Mais simples, mas ao trocar a temporada
  se perde quem participou da temporada anterior, e os encontros antigos passam a "pertencer"
  à temporada nova. Descartada porque o histórico por temporada é um requisito.

## Consequências

- É possível responder "quem participou desta célula na temporada passada" e comparar
  temporadas.
- A tela da célula mostra o link "Temporada anterior" para navegar no histórico.
- O nome da célula passa a ser único por **campus + temporada** (e não mais só por campus),
  já que a célula renovada mantém o nome.
- A mesma pessoa aparece como membro de várias células ao longo do tempo (uma por temporada).
  Relatórios por pessoa precisam considerar a temporada.
- Implementação: `POST /api/cells/:id/renew/` (`CellViewSet.renew`).
