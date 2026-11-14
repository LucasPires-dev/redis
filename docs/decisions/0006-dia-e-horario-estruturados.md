# 0006. Dia e horário do encontro estruturados

- Status: Aceito
- Data: 2026-11-09
- Repositórios: redis-api, redis-app

## Contexto

O dia do encontro da célula era um texto livre (`weekday`), que aceitava "quarta",
"Quarta-feira", "QUA 19h30" ou "toda semana". Não havia campo de horário. Com isso, não era
possível filtrar nem ordenar as células por dia ou hora.

## Decisão

- `weekday` foi substituído por dois campos:
  - **`meeting_day`**: dia da semana como número, de 1 (segunda) a 7 (domingo), no padrão
    ISO. Número, e não texto, para ordenar na sequência da semana.
  - **`meeting_time`**: horário de início (`HH:MM`).
- A API filtra e ordena por eles: `?meeting_day=3`, `?meeting_day__in=3,5`,
  `?meeting_time__gte=19:00`, `?ordering=meeting_day,meeting_time`.
- A migration converteu os textos existentes. O que pôde ser interpretado ("Qua 19h30" →
  quarta, 19:30) virou dado estruturado. O que **não** pôde ("toda semana") foi anexado à
  descrição da célula, para não se perder.

## Alternativas consideradas

- **Manter texto livre e só adicionar o horário.** Não resolve o filtro por dia.
- **Dia como texto com opções fixas ("quarta", "quinta"…).** Filtra, mas não ordena na
  sequência da semana sem uma tabela de conversão.

## Consequências

- A lista de células pode ser filtrada por dia e aparece na ordem da semana.
- A API passou a devolver `meeting_day`, `meeting_day_display` ("Quarta-feira") e
  `meeting_time` no lugar de `weekday` (mudança incompatível para quem consumia `weekday`).
- Ainda não há suporte a células quinzenais ou com mais de um dia na semana.
- Implementação: `choices.Weekday`, migration `0009_cell_structured_schedule`.
