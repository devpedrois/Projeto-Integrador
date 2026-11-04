# Subtarefa 30.6

Responsável e revisor indicado: Pedro.

## Reprodução

Dentro de `backend/`, configure `DATABASE_URL_VOLUME` na branch Neon de volume.
A conexão precisa diferir de `DATABASE_URL`, `DIRECT_URL` e `DATABASE_URL_DEPLOY`.
O benchmark consulta somente a branch de volume, sem migrations ou seeds.
O modo de produção é recusado. A carga mínima é mil contextos visíveis.

```powershell
npm.cmd run bench:recomendacao
```

Saída padrão: subpasta temporal nesta pasta de evidências.
Para destino explícito, use `-- --output <pasta-nova>`.
Uma pasta já existente é recusada, preservando seus arquivos.

Python com Matplotlib é necessário para o PNG.
O ambiente utilizado possui Matplotlib 3.11.2.
Os requisitos já existem em `backend/scripts/requirements-bench-fila.txt`.
Use `BENCH_RECOMENDACAO_PYTHON` para selecionar outro executável Python.
Não foi adicionada dependência npm.

## Procedimento

- Strategy de categoria existente, sem HTTP ou cache da aplicação.
- Todos os produtos visíveis, ordenados por UUID.
- C em 1, 4 e 8, com pools máximos 3, 6 e 10.
- Conexões e snapshots preparados fora da cronometragem.
- Uma conexão adicional exporta o snapshot dentro do mesmo pool.
- Demais conexões importam esse snapshot em transações somente leitura.
- Cada configuração recebe seu próprio snapshot consistente.
- Cinco rodadas totais por C, incluindo um aquecimento descartado.
- Quinze rodadas registradas, doze medições consolidadas por mediana.
- Toda resposta é comparada ao primeiro aquecimento sequencial.
- Mesmos IDs ordenados exigidos por produto em todas as rodadas.

Snapshots por C evitam mudanças entre consultas da mesma configuração.
Uma alteração entre configurações pode gerar diferenças, corretamente registradas.
A branch deve permanecer dedicada ao benchmark durante a coleta.
As sessões de leitura são encerradas ao terminar cada configuração.

Throughput corresponde a produtos divididos pelo tempo em segundos.
Speedup consolidado usa mediana sequencial dividida pela mediana de C.
Eficiência corresponde ao speedup dividido por C.
O CSV também apresenta razões por rodada contra a mediana sequencial.
Amostragem da espera local ocorre a cada dez milissegundos.
Progresso é impresso a cada duzentos contextos concluídos.

## Arquivos gerados

- `rodadas.csv`: quinze rodadas, com aquecimentos identificados.
- `resultado.json`: ambiente, metodologia, rodadas e consolidação.
- `sequencial.json`: recomendações ordenadas por produto de contexto.
- `diff.json`: divergências contra C=1, esperado `[]`.
- `tabela.md`: números consolidados e limites da medição.
- `throughput.png`: throughput e speedup por concorrência.
- `C-1.json`, `C-4.json`, `C-8.json`: checkpoints por configuração.

Os testes de integração usam PostgreSQL real em schema isolado.
Cobrem quinze rodadas, paridade, pools e visibilidade dos contextos.
Os candidatos continuam seguindo a elegibilidade da Strategy existente.
Essa distinção é explícita na fixture, sem alterar comportamento produtivo.

## Evidência TDD

Os testes foram criados antes dos módulos da implementação.
A execução inicial falhou pela ausência de `bench-recomendacao-lote.js`.
Os testes da CLI falharam antes da criação do entrypoint.
A primeira tentativa de integração encontrou bloqueios de DNS e cache.
A reexecução com acesso necessário passou contra PostgreSQL real.
`direcionados-inicial.log` registra doze testes verdes.
`direcionados.log` registra quatorze testes verdes após adicionar a CLI.

## Limites

Tempo mede todas as chamadas `obter`, até terminar o último contexto.
Exclui conexões iniciais, catálogo, comparação e gravação de arquivos.
Não esvazia caches PostgreSQL ou sistema operacional.
Não representa tráfego HTTP ou experiência do usuário no deploy.
Espera local zero não demonstra ausência de espera remota.
Ganho sublinear sozinho não permite culpar o pooler Neon.
O limite configurado do PostgreSQL difere da cota do provedor.

## Coleta de 25/10/2026

Execução: `execucao-2026-10-25T20-35-37-389Z/`.
Comando utilizado: `npm.cmd run bench:recomendacao`.
Ambiente: Windows, Node 22.12.0, PostgreSQL 18.6 no Neon.
Conexão de volume por pooler. Mil contextos visíveis por rodada.

| C | Pool | Mediana s | Produtos/s | Speedup | Eficiência % |
|---:|---:|---:|---:|---:|---:|
| 1 | 3 | 74,155 | 13,485 | 1,000 | 100,00 |
| 4 | 6 | 18,738 | 53,368 | 3,957 | 98,94 |
| 8 | 10 | 9,333 | 107,152 | 7,946 | 99,32 |

Quinze rodadas terminaram com IDs e ordem idênticos.
Os três aquecimentos foram registrados e descartados das medianas.
`diff.json` contém `[]` e todas as rodadas compartilham um SHA-256.
`conferencia-independente.json` recalcula fórmulas, CSV, hash e dimensões PNG.
O PNG foi inspecionado visualmente e possui 1760 × 800 pixels.

O ganho manteve-se próximo do ideal até C=8.
O pico amostrado de espera no pool local foi zero.
Não foi observado teto de escalabilidade nessas configurações.
Isso não elimina limites remotos fora da faixa medida.
O valor PostgreSQL `max_connections=901` não informa a cota do pooler.
Nenhuma limitação foi atribuída ao Neon sem evidência do provedor.

Os testes específicos iniciais sobrepuseram parte do aquecimento C=1.
Foram executados noutra branch Neon, separada da base de volume.
A suíte backend completa foi iniciada somente após o benchmark.

## Validações finais

- `npm.cmd test`: 723 testes passaram em 69 arquivos, durante 419,33 segundos.
- `npm.cmd run lint`: passou, registrado em `lint.log`.
- `npm.cmd run typecheck`: passou, registrado em `typecheck.log`.
- Prettier: passou, registrado em `formatacao-check.log`.
- CLI com `--isolado`: recusada com código 1, conforme escopo exclusivo de volume.
- Revisão equivalente: quatro contraprovas de conexão corrigidas antes da conclusão.
- `encerramento.json`: zero transações pendentes na branch de volume.
- Diff produtivo: Strategy, PrismaClient padrão e package-lock inalterados.

O log integral da suíte está em `backend-testes.log`.
Avisos TLS e de depreciação do driver foram preservados.
A revisão está registrada em `revisao-seguranca.md`.
Nenhum commit ou push foi executado nesta entrega.

`evidencias/` e o módulo auxiliar seguem ignorados pelo Git existente.
Os arquivos permanecem disponíveis localmente nos destinos indicados.
