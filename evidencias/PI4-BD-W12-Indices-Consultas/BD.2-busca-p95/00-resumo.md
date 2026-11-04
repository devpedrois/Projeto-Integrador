# BD.2: desempenho da busca

Data: 22/10/2026.
Branch: `codex/bd-2-busca-p95`.
Responsavel: Eduardo. Revisor designado: Pedro.
Nenhum commit ou push foi executado.

## Resultado

Os seis cenarios apresentaram p95 abaixo de 500 ms.
O maior p95 observado foi 49,102 ms.
Nenhum indice adicional ou migration foi necessario.
Os indices existentes e endpoints foram preservados.

Comando unico, dentro de backend:

```powershell
npm.cmd run bench:busca
```

O comando usa `DATABASE_URL_VOLUME` configurada no ambiente.
Por padrao, gera uma pasta nova de evidencias.

## Medicao final

| Cenario | Medicoes | p50 ms | p95 ms | Max ms |
| --- | ---: | ---: | ---: | ---: |
| Sem filtro | 30 | 41,600 | 45,370 | 46,162 |
| Termo | 30 | 41,384 | 44,601 | 44,951 |
| Categoria | 30 | 40,731 | 49,102 | 49,894 |
| Tecnica | 30 | 40,723 | 41,883 | 42,327 |
| Regiao | 30 | 40,724 | 42,661 | 46,236 |
| Termo + categoria + regiao | 30 | 40,566 | 42,377 | 42,871 |

Cada cenario teve cinco aquecimentos, excluidos dos percentis.
O CSV preserva aquecimentos e medicoes em fases distintas.
As 210 chamadas retornaram HTTP 200 e X-Cache MISS.
Todas retornaram produtos visiveis, sem resultados vazios artificiais.
P50 e p95 usam nearest-rank, sem remover outliers.
A auditoria independente do CSV confirmou os valores JSON.

O cronometro inclui HTTP, recebimento e decodificacao do JSON.
Invalidacao do cache e validacao ficam fora da cronometragem.
SQL real do endpoint gerou os EXPLAINs adicionais.
As consultas historicas de BD-04 tambem foram capturadas.

## Decisao sobre indices

O termo seletivo `977` aproveitou ambos os GIN existentes.
Categoria e tecnica usaram seus indices atuais.
Regiao aproveitou os indices do perfil e do artesao.
Agregacoes usaram os indices existentes de fotos, avaliacoes e itens.

Os Seq Scans restantes apresentaram custo baixo nesta massa.
O scan sem filtro examinou 1.000 produtos em 0,221 ms.
O scan com `vaso` levou 0,648 ms.
Os scans de usuarios levaram entre 0,040 e 0,048 ms.
As seis consultas HTTP ficaram entre 0,727 e 1,530 ms SQL.
Esses tempos SQL nao equivalem a latencia HTTP.
Os p95 HTTP ficaram entre 41,883 e 49,102 ms.

Nenhum indice novo se justificou pelas medicoes e planos.
Nenhuma migration `indices_busca_u2` foi criada.
`enable_seqscan` permaneceu ligado, sem forcamento do planner.
Definicoes dos indices e contagens permaneceram iguais.
As duas medicoes diferem por variacao normal do ambiente.
Nao se apresenta essa diferenca como ganho por indice.

## Ambiente e limites

API temporaria local, conectada ao PostgreSQL real de volume.
A conexao foi diferente da base padrao da aplicacao.
PostgreSQL 18.6; Node.js 22.12.0; uma conexao no pool.
Todas as consultas usaram REPEATABLE READ READ ONLY.
Nao houve seed, ANALYZE, migration ou escrita no volume.
Recursos HTTP, Prisma e PostgreSQL foram encerrados ao terminar.

A massa possui 1.000 produtos e 350 usuarios.
Possui 50 perfis, 1.500 pedidos e 1.550 itens.
Nao possui fotos ou avaliacoes cadastradas.
As agregacoes dessas tabelas medem o caminho vazio.
Nao representa latencia de deploy ou outras distribuicoes.
Caches PostgreSQL e do sistema operacional permanecem aquecidos.
Os eventos Prisma para captura SQL permanecem ativos.
O benchmark nao mede todas as combinacoes possiveis.

## Validacao

| Verificacao | Resultado |
| --- | --- |
| Backend completo | 597 testes passaram em 58 arquivos |
| Frontend completo | 842 testes passaram em 89 arquivos |
| Novos testes BD.2 | 23 unitarios e uma integracao PostgreSQL real |
| Lint e typecheck, ambos os projetos | Aprovados |
| Build backend | Aprovado, sem executar migrate deploy |
| Prettier e diff com CRLF reconhecido | Aprovados |
| Revisao local de seguranca | Nenhum achado bloqueante |

O teste inicial falhou antes da criacao do script.
Os testes nao usam mocks de banco ou repositories.
As fixtures de integracao usam schema temporario isolado.
Os avisos existentes de pg e React continuam registrados.

## Arquivos de evidencia

- `01-explain-volume-antes/`: planos anteriores com indices existentes.
- `02-benchmark-volume-antes/`: primeira coleta HTTP, preservada.
- `03-explain-volume-final/`: captura final, sem novos indices.
- `04-benchmark-volume-final/`: CSV, JSON, tabela e planos HTTP finais.
- `05-benchmark-terminal-final.txt`: saida real do comando final.
- `06-contexto-volume.json`: contagens reais, somente leitura.
- `07-auditoria-amostras.json`: recalculo independente e comparacao dos indices.
- `08-suite-backend.txt`: saida integral dos 597 testes backend.
- `09-revisao-e-validacoes.md`: revisao e verificacoes complementares.
- `10-suite-frontend.txt`: saida integral dos 842 testes frontend.

O diretorio evidencias permanece ignorado pelo Git existente.
Scripts, testes, READMEs e declaracao de IA estao no diff.
