# BD-04: revisao equivalente de seguranca

Executada nesta conversa, conforme escolha explicita do responsavel.
Nao houve delegacao nem atribuicao de revisao humana.

## Escopo verificado

- Diff, migration, schema Prisma, consultas e CLI.
- SQL publico exclui inativos, moderados e estoque indisponivel.
- Pedidos usam compradorId; notificacoes usam usuarioId e lida.
- Esses parametros devem vir da sessao nos endpoints futuros.
- Os endpoints futuros permanecem fora desta entrega.

## Entradas e saidas

- Nomes de schema aceitam somente identificadores simples.
- Fases aceitam apenas antes, depois e atual.
- Termos possuem entre tres e 120 caracteres.
- Valores de busca e filtros usam parametros PostgreSQL.
- Curingas de termos literais recebem escape.
- Nenhuma consulta ou evidencia seleciona senhaHash.
- Erros externos da CLI recebem mensagem sanitizada.
- URLs presentes nos testes unitarios sao exclusivamente ficticias.
- Nenhum .env ou segredo integra os arquivos novos.

## Banco e arquivos

- O modo padrao usa transacao READ ONLY.
- O modo compare exige EXPLAIN_ISOLATED=1 fora de producao.
- URLs direta e da aplicacao devem identificar a mesma branch.
- DATABASE_URL_DEPLOY bloqueia comparacao naquele endpoint, quando informado.
- A guarda complementa a autorizacao humana da branch.
- Um opt-in sozinho nao identifica infraestrutura de teste.
- A comparacao cria somente schema aleatorio proprio.
- A carga BD-05 e os complementos sao sinteticos.
- A migration fica atomica com BEGIN e COMMIT.
- Testes e comparacao executam seu corpo na transacao externa.
- Extensao e operator classes usam namespace public explicito.
- Nao ha disable de Seq Scan ou custo artificial.
- Indices de categoria e carrinho nao foram duplicados.
- A saida exige pasta vazia e criacao exclusiva wx.
- Schema de medicao termina com rollback, inclusive em falhas.

## Correcao autorizada da infraestrutura de testes

O teste de fila disputava jobs com workers ativos.
O responsavel autorizou um schema pg-boss proprio nesse arquivo.
Seu nome combina prefixo fixo e UUID hexadecimal interno.
O teardown remove exclusivamente esse schema de teste.
Nenhum processo externo ou fila compartilhada foi interrompido.
Nao houve alteracao no worker, publisher ou contratos produtivos.

Nenhum problema novo de seguranca foi encontrado nessa revisao.
