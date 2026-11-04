# WEB-15: validação de documentação OpenAPI

Data: 15/10/2026. Branch: `codex/web-15-openapi`.

## Resultado

- Swagger: `GET /docs` redireciona para `/docs/`, HTTP 200.
- Documento: `GET /docs/openapi.json`, OpenAPI 3.1, HTTP 200.
- Navegador local: 36 operações, nenhum erro de console.
- Cobertura: métodos e paths do Express iguais ao OpenAPI.
- Mutação: rota nova e método novo sem documentação são detectados.
- Exemplos JSON compatíveis com os schemas Zod reais.
- Cookie de sessão: `origem_sessao`, segurança do tipo apiKey/cookie.
- Cinco testes falharam inicialmente com 404 antes da implementação.
- Sete testes WEB-15 passaram após implementação e refinamento.
- Suíte completa: 539 testes passaram em 53 arquivos.
- Lint e typecheck passaram.
- Formatação executada com Prettier, preservando finais de linha existentes.

## Revisão equivalente de segurança

Executada nesta conversa por escolha explícita do responsável.

- Documento estático, sem conexão, token ou identidade real.
- Exemplos utilizam dados sintéticos e domínio reservado example.com.
- Documento não é enviado para validadores externos pelo Swagger.
- Assets servidos localmente pelo swagger-ui-express.
- CSP permite scripts locais, sem unsafe-inline ou unsafe-eval.
- Ajuste CSP limitado a `/docs`, preservando a proteção geral.
- Autenticação e autorização das rotas de negócio continuam preservadas.
- Documentação distingue recursos públicos, próprios e administrativos.
- Schemas de resposta não incluem senha ou hash.
- Banco não é mockado; documentação não realiza consultas.

Sem achados novos bloqueantes na alteração.
`npm-audit.json` registra sete alertas preexistentes:
um moderado, cinco altos e um crítico.
Os pacotes afetados já existiam no lockfile anterior.
Nenhuma versão preexistente mudou nesta subtarefa.
As novas dependências não aparecem entre os pacotes vulneráveis.
Atualizações fora da WEB-15 não foram antecipadas.

## Limites

Não houve commit, push ou deploy.
Validação visual ocorreu em `http://127.0.0.1:4015/docs/`.
A evidência não representa execução no Render.
Após publicação, conferir `https://<render>/docs` e `/docs/openapi.json`.

Contratos solicitados estavam ignorados pelo Git.
Exceções restritas permitem versionar CLAUDE.md e o contrato solicitado.
Os demais documentos de sprint permanecem ignorados.
