# Registro de decisões (ADR)

Cada arquivo registra **uma** decisão de produto ou de arquitetura: o contexto, o que foi
decidido, as alternativas consideradas e as consequências. Servem para quem chegar depois
entender **por que** o sistema é como é, não só como funciona.

## Como usar

- Um arquivo por decisão, numerado em sequência: `NNNN-titulo-curto.md`.
- Escreva no mesmo PR do código que implementa a decisão, para os dois serem revisados juntos.
- Decisões não são editadas depois de aceitas. Se mudar de ideia, crie um ADR novo e marque o
  antigo como **Substituído por NNNN**.
- Status possíveis: **Proposto**, **Aceito**, **Substituído por NNNN**, **Descontinuado**.

## Modelo

```markdown
# NNNN. Título

- Status: Aceito
- Data: AAAA-MM-DD
- Repositórios: redis-api, redis-app

## Contexto
O problema e as restrições.

## Decisão
O que foi decidido.

## Alternativas consideradas
O que mais foi avaliado e por que não foi escolhido.

## Consequências
O que fica mais fácil, o que fica mais difícil, o que ficou para depois.
```

## Índice

| Nº | Decisão | Status |
|---|---|---|
| [0001](0001-celulas-por-temporada.md) | Células funcionam por temporada, definida para a igreja toda | Aceito |
| [0002](0002-renovacao-cria-nova-celula.md) | Renovar uma célula cria uma célula nova, preservando o histórico | Aceito |
| [0003](0003-hierarquia-de-responsaveis-pelas-celulas.md) | Hierarquia de responsáveis pelas células | Aceito |
| [0004](0004-campus-de-membros-e-lideres.md) | Membros de qualquer campus, líderes só do campus da célula | Aceito |
| [0005](0005-registro-de-encontros-e-presenca.md) | Registro de encontros e presença | Aceito |
| [0006](0006-dia-e-horario-estruturados.md) | Dia e horário do encontro estruturados | Aceito |
