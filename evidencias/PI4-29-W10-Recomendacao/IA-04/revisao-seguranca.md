# IA-04: revisão local equivalente

Pedro manteve a revisão local equivalente, sem delegação.
Autorizou schemas temporários para comparar demo e volume.

Escopo: CLI, métricas puras, benchmark HTTP e configuração de conexões.

- CLI aceita nomes de variáveis; URLs não são argumentos.
- Mensagens de configuração incluem apenas nomes e instruções fixas.
- Falhas de PostgreSQL não expõem erro bruto ou conexão.
- Schemas externos passam por allowlist estrita de identificadores.
- Schemas temporários recebem nomes internos com UUID aleatório.
- As migrations e os seeds ficam nos schemas temporários autorizados.
- O modo isolado recusa produção e conexão conhecida do deploy.
- Branches existentes são medidas em transações somente leitura.
- A coleta usa REPEATABLE READ, uma conexão e verificação do snapshot.
- Servidor HTTP usa loopback e porta temporária.
- JWTs efêmeros ficam em memória e autenticam somente essa API local.
- Autenticar reconsulta usuário ativo e exigirPapel mantém comprador obrigatório.
- Histórico não acessa cache compartilhado em nenhuma fase.
- Categoria precisa mostrar MISS frio e HIT quente.
- Respostas inválidas, IDs repetidos ou invisíveis abortam a coleta.
- Contexto não é recomendado pela estratégia de categoria.
- JSON inclui agregados; não inclui identidades, nomes pessoais ou tokens.
- Saída final é publicada somente após sucesso nas duas bases.
- Servidor, conexões e schemas próprios são encerrados ao terminar.

Testes usam HTTP e PostgreSQL reais, sem mocks de repository.
Cobrem escolha de conexões, leitura de schemas existentes e arquivo JSON.
Também cobrem argumentos inválidos, produção, deploy e ausência de variáveis.
Nenhum achado bloqueante identificado no escopo revisado.
