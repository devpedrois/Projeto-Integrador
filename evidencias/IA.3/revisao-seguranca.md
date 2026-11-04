# IA.3: revisão equivalente nesta conversa

Modalidade já autorizada, sem delegação ao security-auditor.

## Revisão do escopo

A mudança aceita somente `on`, `off` e `ambos`.
Entradas inválidas falham antes de conectar ao PostgreSQL.
O padrão `ambos` está coberto por teste.
Nenhuma URL de conexão passa pela linha de comando.
Configuração e diagnóstico usam somente nomes de variáveis.
A nova comparação é executada dentro do snapshot READ ONLY existente.
On e off consultam a mesma base no mesmo snapshot.
A coleta na branch configurada não aplica seeds ou migrations.
A flag não é exposta na API pública.
Nenhuma regra da Strategy ou do ranking foi alterada.
O relatório usa somente contagens, categorias, percentuais e ambiente.
Regiões individuais, usuários e credenciais não integram a comparação.
O arquivo anterior `recomendacao-volume.json` foi preservado.
A coleta atual escolheu `metricas/recomendacao-u2.json` explicitamente.

## Correção das métricas

Fixture com PostgreSQL real cobre os dois modos.
Os modos isolados também executam contra banco real.
Categoria singleton comprova fallback e perda de acerto.
Produtos ocultos ficam fora da população de contextos.
Região ausente não conta como coincidência regional.
Base vazia comprova denominadores zero sem NaN.
A contagem regional usa todos os itens como denominador.
A tabela conserva a precisão integral dos percentuais JSON.
As métricas HTTP anteriores permanecem separadas da comparação direta.

## Resultado e limites

Nenhum achado novo bloqueante no escopo revisado.
Testes não usam mocks de banco ou repository.
As métricas descrevem uma massa sintética e um snapshot.
Coincidência regional maior é consequência direta da prioridade configurada.
Não demonstra satisfação humana, vendas incrementais ou causalidade.
Percentuais iguais também não demonstram rankings idênticos.
