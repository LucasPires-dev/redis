# 0001. Células funcionam por temporada, definida para a igreja toda

- Status: Aceito
- Data: 2026-11-09
- Repositórios: redis-api, redis-app

## Contexto

As células (GTs) da igreja não são permanentes: elas rodam em ciclos (temporadas), com data
de início e de fim. Ao fim de um ciclo, algumas células continuam, outras encerram, membros
entram e saem. Até aqui a célula não tinha nenhuma noção de período, então não era possível
saber quais células estão ativas agora nem consultar como era uma temporada passada.

## Decisão

- Criamos o conceito de **Temporada** (`Season`): nome, data de início e data de fim.
- A temporada vale para **a igreja toda**. Todos os campus seguem o mesmo calendário.
- Toda célula pertence a uma temporada. Ela pode ter datas próprias, desde que **dentro** da
  temporada (para uma célula que começa depois ou termina antes). Sem datas próprias, valem
  as da temporada.
- **A temporada atual é identificada automaticamente**: é a que contém a data de hoje. Não
  existe um campo "temporada atual" para alguém marcar à mão.
- Temporadas da mesma igreja **não podem se sobrepor**, para que a temporada atual seja sempre
  uma só.
- Quem cria e edita temporadas: o gestor e o responsável geral pelas células (ver
  [0003](0003-hierarquia-de-responsaveis-pelas-celulas.md)).
- Uma temporada que já tem células não pode ser excluída.

## Alternativas consideradas

- **Temporada por campus.** Daria flexibilidade, mas cada campus teria seu calendário, o que
  complica relatórios da igreja inteira e a renovação. Descartada: a igreja opera com um
  calendário único.
- **Marcar a temporada atual manualmente (campo `is_current`).** Exige alguém lembrar de virar
  a chave na data certa, e pode ficar inconsistente (duas marcadas, nenhuma marcada).
  Descartada em favor do cálculo pela data.

## Consequências

- A lista de células abre na temporada atual. Temporadas passadas continuam consultáveis.
- A Reconciliação só oferece células ativas hoje para encaminhar um convertido.
- Entre duas temporadas (um intervalo sem temporada cadastrada) não há temporada atual. A tela
  avisa "Nenhuma temporada em andamento".
- Células criadas antes desta decisão ficam sem temporada e são tratadas como ativas, para não
  sumirem. Novas células exigem temporada.
- Implementação: `apps/churches/models.py` (`Season`, `SeasonQuerySet.current`,
  `CellQuerySet.active`), migration `0010`.
