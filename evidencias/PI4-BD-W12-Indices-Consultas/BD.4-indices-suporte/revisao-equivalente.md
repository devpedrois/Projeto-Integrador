# BD.4: revisão equivalente

Revisão equivalente autorizada por Pedro nesta conversa.
Nenhum agente security-auditor foi delegado.
Responsável da subtarefa: Eliziane. Revisor indicado: Pedro.

A revisão local não encontrou impedimentos no diff final.

- Consultas usam parâmetros vinculados, incluindo listas de UUIDs.
- DDL dos candidatos vem exclusivamente de uma allowlist interna.
- O schema aceita apenas identificadores validados pelo Zod.
- Volume rejeita produção e identidade igual a padrão/deploy.
- Identidades de usuários aparecem somente como parâmetros sintéticos.
- A captura preserva o filtro do artesão na página e nos itens.
- A compra verificada preserva FOR SHARE antes da escrita.
- O runner nunca insere avaliações nem modifica status dos pedidos.
- Índices temporários e schemas comparativos terminam com ROLLBACK.
- O modo candidato verifica a ausência do índice após o rollback.
- Erros do CLI são sanitizados e não exibem credenciais.
- Diretórios de saída existentes não podem conter evidências anteriores.
- As gravações usam flag wx para impedir sobrescrita.
- Os hashes descartam somente o instante atualizadoEm.
- O PostgreSQL permanece real, sem mocks de repositories.

Os planos foram coletados na branch sintética de volume.
Todos os 1.500 pedidos estavam confirmados; avaliações estavam vazias.
Essas limitações estão declaradas no relatório.
Nenhum índice foi promovido para migration permanente.

TDD observado nesta execução:

1. Duas falhas unitárias por ausência de --volume e validação.
2. Duas falhas de integração: nove capturas, esperadas dezenove.
3. Uma falha de integração por ausência de resultHash.
4. Dezenove testes unitários passaram após a implementação inicial.
5. Três testes de integração passaram com PostgreSQL real.

Houve uma recusa automática ao tentar testar o banco padrão.
A execução foi redirecionada exclusivamente à branch volume validada.
O endpoint direto dessa mesma branch foi usado nos testes.
Ele permite o search_path exigido pelos schemas isolados.
O banco padrão não foi usado para executar os testes.

Validação final: 726 testes backend e 942 frontend passaram.
Lint e typecheck passaram nos dois projetos.
Os três erros ambientais iniciais foram diagnosticados como P2022.
A suíte completa foi repetida numa base temporária atualizada.
A criação e a limpeza foram autorizadas por Pedro.
A remoção dessa base foi verificada após os testes.
Os 57 pares finais mantiveram SQL, parâmetros e hashes idênticos.
