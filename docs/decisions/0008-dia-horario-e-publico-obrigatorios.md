# 0008. Dia, horário e público-alvo obrigatórios na célula

- Status: Aceito
- Data: 2026-11-11
- Repositórios: redis-api, redis-app
- Complementa: [0006](0006-dia-e-horario-estruturados.md), [0007](0007-calendario-de-encontros.md)

## Contexto

O calendário de encontros ([0007](0007-calendario-de-encontros.md)) depende do dia da célula, e a
liderança precisa saber quando e para quem cada célula acontece. Esses três campos eram
opcionais: uma célula podia ser criada e funcionar sem eles.

No formulário, deixar o público-alvo vazio aparecia como **"Todos"**. O vazio tinha dois sentidos
ao mesmo tempo: "para todos" e "não informado".

## Decisão

- **Dia do encontro, horário e público-alvo são obrigatórios** para criar uma célula. Eles também
  não podem ser apagados depois.
- O público ganha a opção explícita **"Todos"** (`todos`). As opções são as dos ministérios que
  atendem pessoas (Jovens, Crianças, Adolescentes, Mulheres, Homens, Casais). Os ministérios de
  produção (Som, Mídia etc.) não são público de célula.
- Células antigas com público vazio passam a `todos`, que era o que o formulário mostrava
  (migration `0015`).
- **Uma célula sem algum desses campos fica inativa:**
  - não conta como ativa (`Cell.objects.active()`), então não aparece para encaminhar novos
    convertidos;
  - não recebe registro de encontros;
  - não pode ser renovada, porque a cópia nasceria incompleta.
- A API expõe `missing_fields`. A tela da célula mostra o aviso "Célula inativa" com o botão
  **Completar dados**, e os cards mostram o selo **Incompleta**.
- Editar uma célula incompleta exige preencher o que falta.

## Alternativas consideradas

- **Restrição no banco (`NOT NULL`).** Quebraria as células antigas já cadastradas sem dia ou
  horário. A regra fica na API, e o modelo continua aceitando o vazio só para esse legado.
- **Converter o público vazio em "não informado".** Contradiz o que os líderes viam e escolheram
  ("Todos"), e deixaria inativas células que estavam corretas.

## Consequências

- Depois do deploy, células antigas sem dia ou horário ficam inativas até alguém completar os
  dados. Para encontrá-las antes:

  ```sql
  SELECT name FROM churches_cell WHERE meeting_day IS NULL OR meeting_time IS NULL;
  ```

- Os encontros já registrados nessas células continuam visíveis e editáveis.
