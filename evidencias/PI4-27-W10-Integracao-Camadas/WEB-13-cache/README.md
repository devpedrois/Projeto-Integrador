# WEB-13: cache público

Data: 14/10/2026. Branch: codex/web-13-cache.
Sem commit, push ou alteração de dependências.

## Validação final

| Verificação | Resultado |
|---|---|
| Backend completo | 494 testes, 48 arquivos, todos passaram |
| Frontend completo | 833 testes, 88 arquivos, todos passaram |
| Lint e typecheck das duas aplicações | Exit 0 |
| Prettier dos arquivos alterados | Todos formatados |
| git diff --check | Exit 0 |
| Revisão local equivalente | Sem bloqueios no escopo |

Os avisos preexistentes do pg e React act permanecem nos logs.
Não houve falhas de teste na execução final.

## Evidência HTTP real

O servidor Express consultou PostgreSQL real em schema isolado.
As chamadas abaixo foram realizadas por HTTP local.
Server-Timing mede o carregamento; o log mede até finalizar a resposta.

| Rota | Primeiro MISS | Segundo HIT |
|---|---:|---:|
| GET /produtos | 41,017 ms | 0,088 ms |
| GET /produtos/:id | 38,191 ms | 0,049 ms |
| GET /recomendacoes | 113,047 ms | 0,058 ms |

Após PATCH de estoque, as três leituras retornaram MISS.
Cada leitura pós-escrita retornou HTTP 200.
Os registros completos estão em amostras-cache.json.
As medições não incluem cookies, tokens ou IDs das fixtures.
O servidor temporário e o schema isolado foram encerrados.

## Cobertura

Cache unitário cobre TTL com relógio fake e limite LRU.
Também cobre cópias, expiração, prefixos e leitura em andamento.
Os testes HTTP usam PostgreSQL real, sem mocks de repositories.
Verificam MISS, HIT, tempo menor e chaves normalizadas.
Verificam TTL configurado com Date fake e rede real.
Verificam ausência de cache privado e erros não armazenados.
Nove operações de escrita são cobertas por invalidação:

- Cadastro, edição, remoção e estoque do produto.
- Moderação de produto e artesão.
- Confirmação de pedido.
- Perfil e papel do artesão.

Escritas rejeitadas preservam as entradas válidas.
Testes anteriores de catálogo e ranking usam agora escritas HTTP.
Isso verifica a invalidação após alterações reais dos dados.

## Arquivos

- amostras-cache.json: headers, tempos e logs públicos.
- backend-tests.log: primeira execução, antes de adaptar recomendações.
- backend-tests-final.log: execução completa final.
- frontend-tests.log: suíte frontend com contratos preservados.
- revisao-seguranca.md: revisão local equivalente.

O README backend contém a seção Cache — onde e por quê.
Ela explica TTL, limite, instância única e substituição por Redis.
Esta pasta segue ignorada pelo Git conforme configuração existente.
