# TDD da subtarefa 30.1

Data: 22/10/2026.
Responsável: Sergio. Revisor: Pedro.

## RED

Comando, executado em `backend/` antes da implementação:

```powershell
npm test -- --run tests/unit/concorrencia-resultado.test.ts
```

Resultado: exit code 1; cinco falhas, onze testes aprovados.

- O avaliador aceitava zero, dois e menos um pagamentos.
- O avaliador aceitava respostas inesperadas com demais contagens corretas.
- O parser recusava a opção `--saida rodadas.json`.

A integração também recusou `--saida`, conforme esperado.
O teste de porta ocupada encontrou restrição ambiental inicial.
A repetição com acesso ao PostgreSQL real passou.

## GREEN

Após implementar, os dezesseis testes unitários passaram.
Os onze testes de integração também passaram, sem mocks.
Os logs finais registram a suíte completa e as validações.

## Execução de aceite

`execucao-50-clientes.log` registra três rodadas aprovadas.
Cada rodada teve 1 HTTP 201 e 49 HTTP 409.
Cada produto terminou com estoque zero, pedido e pagamento únicos.
Nenhuma rodada teve respostas inesperadas.

`rodadas-50-clientes.json` contém os números exportados.
`conferencia-independente.log` confirma JSON e limpeza do schema.
O relatório consolidado posterior permanece fora desta subtarefa.
