# WEB-13: revisão local equivalente

Revisão local mantida conforme escolha anterior de Pedro.
Não houve delegação ao security-auditor.

Foram inspecionados cache.ts, cache-http.ts e composição da aplicação.
Também foram inspecionados controllers e todos os escritores atuais.
Consultas, DTOs públicos e autenticação foram confrontados com o cache.

| Controle | Resultado |
|---|---|
| Escopo | Apenas catálogo público, detalhe público e recomendação por produto |
| Dados pessoais | Recomendações por usuarioId nunca são armazenadas |
| Rotas privadas | Auth, carrinho, pedidos e painéis não usam CacheHttp |
| Conteúdo | Cache recebe somente DTOs públicos das consultas existentes |
| Entradas | Chaves construídas depois dos schemas Zod estritos |
| Recursos | Limite padrão de 500 entradas; remoção LRU e TTL |
| Mutações de objetos | Cópias isolam o armazenamento de alterações externas |
| Escritas | Invalidação ocorre após confirmar transações ou updates |
| Autorizações | Escritas continuam protegidas por papel e propriedade |
| Visibilidade | Moderação, papel e perfil invalidam produtos e recomendações |
| Concorrência | Leituras antigas não repovoam cache invalidado |
| Erros | Falhas de leitura não são armazenadas |
| Logs | Rotas fixas, HIT/MISS e duração, sem identidades ou query |
| HTTP | Cache-Control no-store continua protegendo cache externo |
| SQL | Nenhuma consulta de produção ou migration alterada |
| Credenciais | Não incluídas no diff nem nas métricas registradas |

Sem achados bloqueantes no escopo inspecionado.
A revisão é local, sem uma análise independente delegada.

Render permanece com uma única instância para este cache.
Escala horizontal exige armazenamento e invalidação compartilhados.
Mudanças fora do processo dependem de TTL ou invalidação explícita.
