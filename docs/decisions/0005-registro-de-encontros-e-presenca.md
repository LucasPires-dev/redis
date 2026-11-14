# 0005. Registro de encontros e presença

- Status: Aceito
- Data: 2026-11-09
- Repositórios: redis-api, redis-app

## Contexto

A liderança precisa acompanhar a vida das células: quando se reuniram, quem esteve presente,
quantos visitantes vieram. A tela da célula tinha só um espaço reservado ("Últimos encontros")
sem funcionalidade.

## Decisão

- Cada encontro (`CellMeeting`) registra **data**, **presentes**, **número de visitantes** e
  **anotações** (tema, pedidos de oração etc.), além de quem registrou.
- **Presença só aceita membros e líderes da célula.** Visitantes que não estão cadastrados
  entram apenas como **número** (`visitors_count`).
- **Um encontro por dia por célula.**
- A data precisa estar **dentro do período da célula** (o dela ou o da temporada).
- Quem registra, edita e exclui: quem pode gerenciar a célula (líder/colíder da célula,
  responsável pelas células do campus, líder do campus, responsável geral, gestor). Membros
  só visualizam.

## Alternativas consideradas

- **Cadastrar visitantes como pessoas na hora.** Mais completo, mas cria cadastros incompletos
  e exige dados pessoais de quem só visitou uma vez. Se um visitante continuar vindo, ele é
  cadastrado e adicionado como membro.
- **Permitir marcar qualquer pessoa como presente.** Esvazia a lista de membros como fonte de
  verdade e mistura visitantes com membros.

## Consequências

- A tela da célula mostra os encontros, a média de presença e permite registrar a presença
  marcando os membros.
- Os encontros ficam presos à célula da temporada, o que alimenta o histórico por temporada
  ([0002](0002-renovacao-cria-nova-celula.md)).
- Ainda não há relatórios consolidados (frequência por pessoa, por campus). Os dados para isso
  já existem.
- Implementação: `/api/cell-meetings/` (`CellMeetingViewSet`), migration `0010`.
