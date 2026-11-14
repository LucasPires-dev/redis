# 0007. Calendário de encontros calculado a partir da temporada

- Status: Aceito
- Data: 2026-11-11
- Repositórios: redis-api, redis-app
- Complementa: [0005](0005-registro-de-encontros-e-presenca.md)

## Contexto

Com a temporada e o dia do encontro da célula
([0001](0001-celulas-por-temporada.md), [0006](0006-dia-e-horario-estruturados.md)), o sistema já
sabe todas as datas em que a célula deveria se reunir. Mesmo assim, o líder tinha que criar
cada encontro do zero, escolhendo a data. Também não havia como saber quais encontros ficaram
sem registro, nem como dizer que um encontro não aconteceu (feriado, cancelamento).

## Decisão

- **As datas previstas são calculadas, não gravadas.** Elas vêm do período da célula (o dela
  ou o da temporada) e do dia do encontro. Só é gravado o que o líder registra.
- Cada data tem uma situação:
  - **Registrado:** houve encontro e a presença foi marcada.
  - **Não houve:** o líder informou que não aconteceu, com o motivo (obrigatório).
  - **Sem registro:** a data passou e ninguém registrou.
  - **Hoje** ou **Próximo:** ainda vai acontecer.
- **Um encontro remarcado dentro da mesma semana (segunda a domingo) cobre a data prevista.**
  Um segundo encontro na mesma semana aparece como **extra**.
- **A presença só pode ser registrada a partir do dia do encontro.** Uma data futura só pode ser
  marcada como "não vai acontecer".
- Um encontro que não aconteceu não tem presença nem visitantes e não entra na média.
- A célula expõe `pending_meetings` (datas sem registro). A coordenação mostra o total e um aviso
  em cada célula com pendência.
- Implementação: `GET /api/cells/:id/calendar/` (`apps/churches/meeting_calendar.py`), campos
  `held` e `cancel_reason` em `CellMeeting`, migration `0014`.

## Alternativas consideradas

- **Gravar uma linha vazia para cada data da temporada.** Se o dia da célula mudar no meio da
  temporada, ou a temporada for estendida, as datas gravadas ficam erradas e precisam ser
  apagadas ou recriadas. Calcular na hora não tem esse problema.
- **Só aceitar o encontro na data exata.** Encontros remarcados (feriado na quarta, encontro na
  quinta) ficariam como pendentes para sempre.
- **Permitir registrar presença no futuro.** Abre espaço para registro antecipado sem que o
  encontro tenha acontecido.

## Consequências

- O líder só precisa abrir a data e marcar quem veio.
- Se o dia da célula mudar no meio da temporada, as semanas anteriores continuam cobertas pelos
  encontros já registrados, pela regra da mesma semana.
- Uma célula sem dia de encontro definido não tem datas previstas. Ela mostra só os encontros
  registrados e um aviso para definir o dia.
- Ainda não há lembrete automático (e-mail ou notificação) para os encontros sem registro.
