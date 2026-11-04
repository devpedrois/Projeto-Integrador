# PI4-33.3: consultas agregadas do administrador

Execução: 04/11/2026.
Branch: codex/33-3-consultas-admin.
Base: 8e17cab.
Commit: f03999b94333b8bf81f26a1d57d2d427ab77ed37.
Escopo: quatro indicadores no repository e conferência independente.
Rota e tela permanecem reservadas ao commit 07.

## Implementação

O novo repository executa quatro subqueries agregadas independentes.
Os produtos seguem exatamente a visibilidade da vitrine.
A receita usa Pedido.total confirmado, preservando Prisma.Decimal.
Itens, fotos, avaliações e pagamentos não multiplicam os resultados.
Não foram criados índices, migrations, rotas ou telas.

## Testes e revisão

- [01-red.txt](01-red.txt): repository ausente na primeira descoberta.
- [01b-red.txt](01b-red.txt): três testes falharam por implementação ausente.
- [01c-script-red.txt](01c-script-red.txt): coletor ainda ausente.
- [02-green.txt](02-green.txt): doze testes, incluindo indicadores antigos.
- [02c-green.txt](02c-green.txt): cinco testes da implementação completa.
- [06-backend-tests.txt](06-backend-tests.txt): 791 testes aprovados em 74 arquivos.
  Foram usados os mesmos filtros do job backend.
- [08-validacoes.json](08-validacoes.json): lint, typecheck, build e formatação aprovados.
- [07-revisao-seguranca.md](07-revisao-seguranca.md): revisão equivalente autorizada.

As integrações utilizam PostgreSQL real e schemas temporários.
Não existem mocks de banco ou repositories.
Os casos incluem artesão inativo e proprietários de outros papéis.
Também incluem produto moderado, inativo e estoque zero.
Pedidos pendentes e cancelados não entram nos números financeiros.
O total NULL legado não contribui para a soma.
O teste preserva Decimal em zero e em 100000000.29.
Esse valor inclui a soma exata de 0.10 e 0.20.
Fotos, avaliações e itens múltiplos exercitam o fanout.
Uma falha intermediária de sintaxe ficou em 02b-green.txt.
Ela foi corrigida antes da execução completa em 02c-green.txt.

## Volume e EXPLAIN

[03-conferencia-volume.md](03-conferencia-volume.md) compara repository e SQL independente.
A conferência apresentou divergência zero nos quatro números.
Foram contados 50 artesãos ativos e 1000 produtos visíveis.
Os 1500 pedidos confirmados totalizam 807365.08 em Decimal.
A massa possui 350 usuários e 1500 totais preenchidos.

[04-explain.txt](04-explain.txt) contém quatro planos e a conclusão.
[conferencia.json](conferencia.json) preserva todos os dados brutos.
A transação foi Repeatable Read, explicitamente somente leitura.
Nenhum plano foi forçado ou estatística alterada.
A coleta termina com ROLLBACK e encerra as conexões.
Não houve DDL ou alteração da massa de volume.
Nenhum índice novo foi justificado nas condições observadas.
Os tempos individuais ficaram entre 0.069 e 0.407 ms.
São amostras aquecidas, sem extrapolação para p95 ou HTTP.
A justificativa detalhada está em docs/indices-u2.md, seção PI4-33.3.

## Reprodução

Configure DATABASE_URL_VOLUME numa branch sintética separada.
Execute dentro de backend:

```sh
node --import tsx scripts/conferir-indicadores-plataforma.ts --output ../evidencias/PI4-33-W14-Indices-FK-Admin/33.3-consultas-admin/nova-coleta
```

O coletor recusa produção e conexões coincidentes com padrão/deploy.
O destino não pode conter os três artefatos anteriores.
As evidências locais são ignoradas pelo Git existente.
O arquivo 05-commit.txt registra o commit solicitado.
Nenhum push faz parte desta entrega.
