# PI4-33.1: teste de cobertura das FKs

Data: 04/11/2026.
Branch: `codex/33-1-fk-com-indice`.
PostgreSQL real, conexão do helper existente, sem mocks.
Nenhum índice ou migration foi criado.

## RED padrão

Comando executado em `backend/`: `npm.cmd run test:integridade`.
Constante: `MODO_ESTRITO = false`.
Resultado: dez testes passaram; somente o novo teste falhou.
Código de saída: 1, esperado nesta subtarefa.

Lista completa das FKs sem cobertura:

```text
PerfilArtesao.tecnicaPrincipalId
```

Saída integral: [red-prefixo-postgresql.txt](red-prefixo-postgresql.txt).
A primeira tentativa falhou por restrições do sandbox.
Não representa o RED funcional: [red-prefixo.txt](red-prefixo.txt).
A execução com acesso ao PostgreSQL produziu o RED esperado.

## RED estrito

Mesmo comando, temporariamente com `MODO_ESTRITO = true`.
Resultado: dez testes passaram; somente o novo teste falhou.
Código de saída: 1, esperado.

```text
Avaliacao.compradorId
ItemCarrinho.carrinhoId
Notificacao.usuarioId
Pedido.compradorId
PerfilArtesao.tecnicaPrincipalId
ProdutoFoto.produtoId
```

Saída integral: [red-estrito-postgresql.txt](red-estrito-postgresql.txt).
A constante foi restaurada para `false` após esse registro.
Nova execução confirmou o mesmo RED com o padrão restaurado.
Saída final: [red-final-postgresql.txt](red-final-postgresql.txt).
O GREEN depende da 33.2, fora deste escopo.

## Verificações

- `npm.cmd run lint`: código zero, [lint.txt](lint.txt).
- `npm.cmd run typecheck`: código zero, [typecheck.txt](typecheck.txt).
- `test:integridade` descobriu e executou os onze testes.
- `vitest.config.ts` inclui `tests/**/*.test.ts`, cobrindo o novo arquivo.
- O job backend do CI executa `npm test`.
- Os filtros desse job não excluem `tests/integridade/`.
- O CI remoto não foi executado nesta subtarefa.

## Revisão do teste

A consulta usa SQL estático, parametrizando somente o modo booleano.
Filtra o schema ativo e a tabela proprietária da FK.
Preserva a ordem de `conkey` e `indkey` com ordinality.
Conta apenas as colunas-chave, excluindo INCLUDE da cobertura.
Não restringe os índices por unicidade, aceitando PK e UNIQUE.
Rejeita índices inválidos, indisponíveis e parciais.
As evidências não contêm credenciais nem conexões completas.

Referências consultadas: [pg_constraint](https://www.postgresql.org/docs/current/catalog-pg-constraint.html)
e [pg_index](https://www.postgresql.org/docs/current/catalog-pg-index.html).
