# IA.3: comparação regional

Branch: `codex/ia-3-metricas-reforco-regional`.
Sem commit ou push.

## Reprodução

Dentro de `backend/`, com as variáveis locais configuradas:

```powershell
npm.cmd run metricas:recomendacao -- --reforco-regional ambos --output metricas/recomendacao-u2.json
```

Demo usa `DATABASE_URL`; volume usa `DATABASE_URL_VOLUME`.
Coleta em snapshot somente leitura, sem seeds ou migrations.
A comparação regional cobre todos os produtos elegíveis do volume.
A opção interna da Strategy recebe true em on.
Recebe false em off; o padrão do script é ambos.
O JSON anterior permanece preservado.

## Arquivos

- `backend/metricas/recomendacao-u2.json`: números e metodologia completos.
- `docs/metricas-recomendacao-u2.md`: tabela e interpretação dos resultados.
- `coleta.log`: execução real da coleta.
- `testes-direcionados.log`: 27 testes PostgreSQL e CLI passaram.
- `backend-test.log`: 755 testes passaram em 72 arquivos.
- `frontend-test.log`: 955 testes passaram em 102 arquivos.
- `*-lint.log` e `*-typecheck.log`: validações nos dois projetos.
- `formatacao.log`: formatação dos arquivos alterados.
- `revisao-seguranca.md`: revisão equivalente, sem delegação.
- `tabela.md`: tabela integral gerada diretamente do JSON.
- `paridade-documento.json`: fórmulas, paridade e hashes dos artefatos.

Os testes iniciais falharam pela ausência da flag e comparação.
O teste da tabela também detectou perda de precisão.
Após implementação, os testes direcionados passaram sem arredondamento.
Nenhum mock de banco ou repository foi usado.

Documentos auxiliares e evidências seguem ignorados pelo Git.
O relatório IA.3 possui exceção específica no `.gitignore`.
Não foram atribuídos responsável ou revisor sem nomes nesta tarefa.

Lint e typecheck passaram nos dois projetos.
Formatação dos arquivos alterados passou.
A tabela documental coincide integralmente com os valores JSON.
O modo off também coincide com a qualidade HTTP existente.
Hashes do documento e JSON constam em `paridade-documento.json`.
