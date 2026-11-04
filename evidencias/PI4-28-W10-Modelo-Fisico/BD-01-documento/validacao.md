# BD-01: validação da entrega

Data: 14/10/2026.

- DDL executado em schema temporário no PostgreSQL real.
- Catálogo equivalente ao produzido pelas migrations existentes.
- Comparação de colunas, tipos, NULL, defaults, constraints e índices.
- Comparação dos seis ENUMs, limites e propriedade da sequence.
- Quinze tabelas e oitenta colunas cobertas pelo documento.
- Doze CHECKs e todos os índices constam no documento.
- Teste da geração de dois números sequenciais de pedido.
- Rollback ao finalizar a validação, sem alterar dados existentes.
- Quatro testes novos passaram; 36 testes relacionados passaram.
- Lint, typecheck, Prisma validate e Prettier passaram.
- Schema e migrations sem diferenças em relação ao Git.
- PDF WeasyPrint com 24 páginas e dois diagramas Mermaid em PNG.
- As 41 tabelas do PDF permanecem inteiras nas páginas.
- Texto completo e margens conferidos automaticamente.
- Todas as páginas finais renderizadas e inspecionadas visualmente.

O teste inicial falhou pela ausência do DDL.
O flag antigo do Prisma foi substituído por --to-schema.
Os tempos publicados vieram dos nove pares originais BD-04.
O EXPLAIN atual é leitura complementar, sem comparação antes/depois.
Os artefatos desta leitura permanecem em explain-atual/.

A revisão de segurança equivalente foi autorizada pelo usuário.
Examinou SQL, credenciais, parâmetros e isolamento dos testes.
Não encontrou achados no escopo entregue.

QuantidadeVendida é uma divergência preexistente de WEB-09.
O documento preserva o contador físico e registra essa diferença.
NotaMedia e o DTO de vendas permanecem calculados por agregação.

Os diretórios sprints/ e evidencias/ são ignorados pelo Git existente.
Nenhuma regra de ignore, commit ou staging foi alterada.
