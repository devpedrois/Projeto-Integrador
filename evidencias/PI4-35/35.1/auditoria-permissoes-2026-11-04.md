# PI4-35.1: impedimento de isolamento no Neon

Data: 04/11/2026. Verificação anterior à implementação.

## Conexão atual da API

A conexão configurada em `backend/.env` utiliza `neondb_owner`.
Nenhuma URL ou senha foi copiada para esta evidência.

| Propriedade consultada | Resultado |
|---|---|
| rolsuper | false |
| rolcreaterole | true |
| rolcreatedb | true |
| rolbypassrls | true |
| membro de neon_superuser | true |

## Reprodução com objetos descartáveis

Uma transação criou um papel NOLOGIN com nome aleatório.
Uma associação temporária permitiu criar o schema privado desse papel.
O schema recebeu `REVOKE ALL ON SCHEMA ... FROM PUBLIC`.
A tabela `execucao_lote` foi criada pelo próprio papel proprietário.
Após `RESET ROLE`, a associação temporária foi revogada.
Nenhum privilégio do schema ou tabela foi concedido à API.

Mesmo após a revogação, as verificações retornaram:

| Verificação para neondb_owner | Resultado |
|---|---|
| pg_has_role no proprietário, MEMBER | true |
| has_schema_privilege no schema privado, USAGE | true |
| has_table_privilege em execucao_lote, SELECT | true |
| SELECT real em execucao_lote | permitido |

O resultado demonstra que a conexão atual não atende ao isolamento.
O aceite exige `permission denied` para essa leitura da API.
`rolbypassrls` isoladamente não explica privilégios sobre objetos.
A associação efetiva e o SELECT real comprovam o impedimento.

Toda a auditoria foi revertida com `ROLLBACK`.
Nenhum papel, schema ou tabela da auditoria foi mantido.
Nenhuma migration do projeto foi aplicada nesta verificação.

## Encaminhamento

O item 10 do pedido exige avisar antes de seguir.
A implementação está suspensa aguardando orientação do responsável.
É necessário separar o papel de runtime da API.
Esse papel deve ficar fora de `neon_superuser`.
A conexão administrativa deve permanecer somente em bootstrap e migrations.
Nenhuma alteração de papéis existentes foi realizada.

Esta evidência é local, pois `evidencias/` está no `.gitignore`.

## Atualização após autorização

O responsável autorizou configurar o papel restrito da API.
Autorizou também a transferência preservadora da propriedade da fila.
O impedimento acima foi resolvido nesta mesma tarefa.
Os resultados finais estão no [resumo da entrega](README.md).
