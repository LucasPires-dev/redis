# 0009. Matrículas pagas em cursos

- Status: Aceito
- Data: 2026-11-11
- Repositórios: redis-api, redis-app

## Contexto

Algumas turmas cobram uma taxa de matrícula para cobrir apostila, material, camiseta e outros
custos. O sistema registrava só quem estava matriculado. Não havia preço, pagamento nem
prestação de contas, e só a coordenação conseguia matricular alguém.

## Decisão

### Taxas da turma

- Cada turma tem **itens de taxa**. Um item pode ser obrigatório (por exemplo, a apostila) ou
  opcional (por exemplo, a camiseta).
- Um item pode ter **opções**, como os tamanhos P, M e G. Quem se matricula precisa escolher uma.
- O valor da matrícula é a soma dos itens escolhidos. Uma turma sem itens é gratuita.
- A soma dos itens obrigatórios deve ser zero ou pelo menos **R$ 5,00**, o mínimo de uma cobrança
  no Asaas.
- A matrícula guarda uma **cópia dos itens e preços** do momento em que foi feita. Mudar ou
  remover um item depois não altera matrículas antigas.

### Inscrição

- A coordenação pode abrir a turma para **inscrição pelos próprios membros**, na página
  "Meus cursos" → "Cursos abertos". Para isso, configura:
  - vagas;
  - data limite das inscrições;
  - prazo de reserva da vaga;
  - parcelamento máximo;
  - regra de reembolso.
- **Reserva de vaga:** numa turma paga, a inscrição feita pelo próprio membro segura a vaga por
  `reservation_days` dias. Se o pagamento não chegar nesse prazo, a matrícula expira e a vaga
  volta a ficar livre. Isso acontece de forma preguiçosa: na próxima consulta da turma ou no
  webhook de vencimento.
- Quando a coordenação matricula alguém numa turma paga, a matrícula **não tem prazo de
  reserva**. O link de pagamento online é opcional, porque muita gente paga na secretaria.
- Matricular alguém numa turma paga gera cobrança. Por isso só a coordenação faz isso;
  professores continuam matriculando em turmas gratuitas.

### Pagamento

- **Online:** cobrança no Asaas, à vista ou parcelada até o limite da turma, com cada parcela de
  pelo menos R$ 5,00. A `externalReference` é `enrollment:<id>`, para o webhook separar
  matrículas de inscrições em eventos.
- **Presencial:** a coordenação registra valores recebidos em dinheiro, Pix ou cartão na
  secretaria. Antes disso, o link online em aberto é cancelado, para a pessoa não pagar duas
  vezes. Um novo link pode ser gerado para o saldo restante.
- **Registro de pagamentos:** cada pagamento recebido é uma linha em `EnrollmentPayment`, que
  diz se foi online ou presencial. A situação da matrícula é calculada a partir desse registro:
  - aguardando;
  - pago em parte;
  - paga;
  - bolsa integral;
  - expirada;
  - cancelada;
  - reembolsada.
- **Webhook:** o id do pagamento Asaas é único no registro, então eventos repetidos do webhook
  são ignorados. A confirmação é conferida de novo na API do Asaas, como já acontecia nos
  eventos.

### Bolsa

- Desconto parcial ou integral, sempre com motivo. Fica registrado quem concedeu.
- Só pode ser dada antes de qualquer pagamento. Se havia uma cobrança aberta, ela é refeita com o
  novo valor.

### Cancelamento e reembolso

- O próprio membro pode cancelar enquanto não pagou nada.
- Uma matrícula com pagamento só é cancelada pela coordenação, com reembolso:
  - pagamentos online são estornados pelo Asaas;
  - pagamentos presenciais ficam marcados como devolvidos.
- A regra padrão da turma é **reembolso até o início das aulas**. Depois disso, a coordenação só
  reembolsa marcando a exceção.
- O histórico fica guardado: a matrícula cancelada continua no banco, e a pessoa pode se
  inscrever de novo.

### Gestão

- A aba **Financeiro** da turma é visível apenas para a coordenação de cursos (geral ou do
  campus) e para quem gerencia o curso. Professores não a veem. Ela mostra:
  - previsto, recebido (online e presencial), em aberto, bolsas, reembolsos, despesas e saldo;
  - os itens a providenciar, com a contagem por opção (por exemplo, quantas camisetas de cada
    tamanho);
  - as matrículas, com as ações de cada uma;
  - as **despesas da turma**;
  - a **exportação em CSV**, separada por `;` e com BOM, para abrir certo no Excel.
- A **entrega de material** é marcada por matrícula. Professores também podem marcar.
- **A conclusão do curso não depende do pagamento.** A situação financeira e a acadêmica são
  independentes.

## Alternativas consideradas

- **Um preço único por turma.** Seria mais simples, mas não cobre itens opcionais nem tamanhos,
  que eram o caso real (apostila obrigatória, camiseta opcional).
- **Guardar só o "valor pago" na matrícula.** Não distingue online de presencial e quebra com
  parcelas e webhooks repetidos. O registro linha a linha resolve as duas coisas.
- **Bloquear a conclusão para quem deve.** A decisão foi não misturar a formação com a cobrança:
  quem deve continua sendo aluno, e a coordenação acompanha o saldo no Financeiro.
- **Expirar reservas com uma tarefa agendada.** O projeto não tem fila nem agendador. A expiração
  preguiçosa dá o mesmo resultado sem nova infraestrutura.

## Consequências

- Migration `courses.0003_paid_enrollments`. Ela precisa ser aplicada em cada ambiente no
  deploy. As matrículas existentes ficam como "gratuitas".
- Dois pontos do parcelamento no Asaas precisam ser **validados no sandbox** antes de cobrar de
  verdade:
  - a cobrança com `installmentCount` e `billingType=UNDEFINED`;
  - o cancelamento do parcelamento com `DELETE /installments/{id}`.
- Por segurança, a listagem e a criação de aulas passaram a respeitar o escopo das turmas que a
  pessoa pode ver. Antes, qualquer usuário autenticado listava e criava aulas de qualquer turma.
