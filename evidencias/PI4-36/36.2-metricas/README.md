# Subtarefa 36.2

Branch: `codex/36-2-metricas-recomendacao`.
Não foi criado commit ou realizado push.

## Resultado

Divergência zero contra a referência regional de 25/10/2026.
O diff integral dos objetos regionais contém `[]`.
São 1.000 contextos e 8.000 recomendações por modo.
Cobertura do catálogo: on 16,2%; off 5,4%.
Coincidência regional: on 100%; off 33,6875%.
Cobertura v0 e acerto por categoria: 100% em ambos.
Fallback: zero em ambos os modos.
As razões e diversidade também permaneceram integralmente iguais.
Nenhum percentual foi arredondado para comparar.

## Caminho executado

`services/recomendacao/scripts/metricas.ts` chama `medirReforcoRegional`.
Esse módulo prepara uma sessão do lote C=8.
Catálogo e ambos os modos compartilham o snapshot somente leitura.
Cada modo chama `lote.gerarRecomendacoesEmLote` exatamente uma vez.
Não existe instanciação própria da Strategy nesse script.
As estratégias efetivas vêm como metadados separados do lote.
O formato e hash dos resultados da 35.6 permanecem preservados.
O hash off coincide exatamente com a coleta anterior.

A projeção exclui contextos e candidatos publicamente invisíveis.
Também remove duplicados e o próprio contexto.
A fixture real cobre categorias singleton e contextos sem região.
Isso preserva as regras anteriores de fallback e coincidência regional.
A versão antiga do script backend foi removida.
O caminho regional antigo também foi removido do helper backend.
Os testes HTTP preexistentes desse helper permaneceram cobertos.
O novo comando não repete latência HTTP, cache ou histórico.

## Reprodução

Dentro de `services/recomendacao/`, configure `DATABASE_URL_VOLUME`.
Use o papel restrito `recomendacao_app` na branch de volume.
Prepare previamente permissões, views e migration privada.
A conexão deve diferir das bases padrão e deploy.
Configure schemas através de `API_SCHEMA` e `RECOMENDACAO_SCHEMA`.

```powershell
npm.cmd run metricas:recomendacao -- --reforco-regional ambos --output metricas/execucao-nova/resultado.json
```

O comando aceita `on`, `off` ou `ambos`.
A concorrência permanece fixa em 8, com pool 10.
`--referencia` permite outro JSON histórico compatível.
O padrão usa `backend/metricas/recomendacao-u2.json`.
Resultado e `diff.json` precisam ser novos.
Nenhum seed ou alteração de catálogo ocorre nessa coleta.

## Evidências

- [JSON completo](execucao-2026-11-07T20-14-08-695Z/resultado.json).
- [Diff vazio](execucao-2026-11-07T20-14-08-695Z/diff.json).
- [Consulta dos registros privados](execucao-2026-11-07T20-14-08-695Z/consulta-execucoes.sql).
- [Conferência independente](execucao-2026-11-07T20-14-08-695Z/conferencia-independente.json).
- [Log da operação real](coleta-volume.txt).
- [Contagens administrativas de volume](contexto-volume.json).
- [Testes completos do microsserviço](testes-microsservico.txt).
- [Testes afetados do backend](testes-backend-afetados.txt).
- [Revisão equivalente de segurança](revisao-seguranca.md).

O log identifica operação, concorrência, modo, ID e hash.
Dois lotes reais geraram dois registros privados concluídos.
A tabela passou de 15 para 17 linhas.
Os dois registros foram conferidos pelo papel recomendacao_app.
O catálogo permaneceu com 1.000 produtos.
Artesãos, compradores ativos e pedidos confirmados permaneceram 50, 300 e 1.500.
Essas contagens administrativas ficam separadas da conexão do microsserviço.

## Validações

Os testes foram criados antes dos módulos novos.
A primeira execução falhou pela ausência de `scripts/metricas.js`.
O log está em `tdd-inicial.txt`.
Um teste adicional detectou aprovação indevida de modo ausente.
A comparação foi corrigida e passou com a contraprova.

Suíte completa do microsserviço: 113 testes em 11 arquivos.
Os 14 testes direcionados também passaram com PostgreSQL real.
Backend afetado: quatro testes em dois arquivos passaram.
A execução backend usou limite maior apenas no processo.
Os dados de teste usam schemas e papéis aleatórios isolados.
Não houve mocks de banco ou repositories.
As mensagens TLS existentes do driver foram preservadas.

O documento `docs/metricas-recomendacao-u2.md` recebeu a comparação datada.
O diff comprova indicadores agregados, não equivalência histórica por ID.
A referência antiga não contém as seleções por contexto.
