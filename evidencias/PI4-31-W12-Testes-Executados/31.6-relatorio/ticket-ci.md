O job backend do CI falha no typecheck.
O script de evidência Web.6 importa tipos diretamente do frontend.
Esse job instala somente as dependências do backend.

Execução: https://github.com/devpedrois/Projeto-Integrador/actions/runs/40239567812
Commit executado: `8e78cdc4e5f601c1de2aad9eb78d99985fae564e`.

Erros registrados:

```text
scripts/web6-evidencias.ts(14,8): TS2307: Cannot find module '../../frontend/node_modules/playwright-core/index.js'
scripts/web6-evidencias.ts(142,63): TS7006: Parameter 'route' implicitly has an 'any' type.
scripts/web6-evidencias.ts(227,6): TS7006: Parameter 'r' implicitly has an 'any' type.
```

O problema permanece no código congelado `58996b984639983e9a9d2d2bc7599bb5495adadd`.
Esse código contém a importação cruzada na linha indicada.
Validação local com ambos projetos instalados não reproduz necessariamente isso.
O CI citado executa outro hash; não valida o congelado.

Critério de aceite da correção:

- O job backend executa typecheck numa instalação limpa.
- A dependência do script de evidência fica explicitamente resolvida.
- Nenhum teste é removido ou enfraquecido.

Registro aberto pela subtarefa 31.6, sem correção fora do escopo.
