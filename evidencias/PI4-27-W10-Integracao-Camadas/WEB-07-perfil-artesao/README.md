# WEB-07: perfil do artesao integrado

Executado em 14/10/2026 com Next.js, Express e PostgreSQL reais.
Fixtures sinteticas usaram schema temporario isolado.
O schema e os servidores foram encerrados ao terminar.

## Resultados

- GET publico retorna nome e campos do perfil, sem credenciais.
- Perfil inativo, inexistente ou de outro papel retorna 404.
- PATCH proprio retorna 200 e recalcula completo no service.
- PATCH de terceiro, admin ou comprador retorna 403.
- PATCH anonimo retorna 401.
- Historia aceita 1000 caracteres e rejeita 1001.
- Campos extras e referencias inexistentes retornam 400.
- Produto abre o perfil com nome recebido pela API.
- Perfil lista exclusivamente produtos publicos do artesao.
- Formulario salva e a pendencia desaparece ao retornar.
- Perfil nao apresenta overflow em 360, 768 e 1280px.

## Verificacoes

- Backend: `npm test`, 367 testes em 39 arquivos.
- Frontend: `npm test`, 773 testes em 80 arquivos.
- `npm run lint` e `npm run typecheck` passaram nos dois projetos.
- Prettier passou nos arquivos TypeScript alterados e novos.
- `git -c core.whitespace=cr-at-eol diff --check` passou.
- Nenhum banco ou repository foi mockado.

Avisos preexistentes: SSL do pg e act no hook use-artesaos-ativos.
A permissao elevada permitiu PostgreSQL real e workers frontend.
As primeiras falhas de sandbox foram separadas das falhas funcionais.

## Evidencia visual

Pasta: `fluxo-real-2026-10-14T14-26-54-451Z/`.

- `fluxo-web07.gif`: seis capturas reais do fluxo.
- `resultado.json`: chamadas, codigos HTTP e responsividade.
- `01-produto-nome-real.png`: nome vindo da API.
- `02-perfil-produtos-reais.png`: perfil e produtos filtrados.
- `03-pendencia-inicial.png`: perfil incompleto no painel.
- `04-perfil-salvo.png`: formulario confirma o PATCH.
- `05-pendencia-resolvida.png`: painel atualizado.
- `06-perfil-atualizado-403.png`: historia salva e chamada proibida.
- `perfil-360.png`, `perfil-768.png`, `perfil-1280.png`.
- Video WebM produzido pelo Playwright.

O painel de chamadas foi inserido pela automacao.
Exibe respostas reais capturadas, sem representar DevTools nativo.
O GIF combina PNGs do navegador sem redesenhar seu conteudo.

## Revisao equivalente de seguranca

O usuario escolheu revisar nesta conversa, sem delegacao.
Conferidos diff, rotas, schemas, service, repository e adapters.

- Autenticacao consulta papel e usuario ativo no PostgreSQL.
- Middleware exige artesao; service compara dono com sessao.
- UUID recebe normalizacao antes da comparacao.
- Schemas estritos impedem alterar nome, dono ou completo.
- Referencias usam consultas Prisma e foto recebe allowlist.
- DTO publico projeta campos permitidos, excluindo email e senhaHash.
- Edicao usa transacao e lock com parametro SQL separado.
- Adapters propagam erros, sem fallback para dados fake.
- Evidencias nao incluem senha, JWT ou conexoes de banco.

Nao foram encontrados achados de seguranca no escopo revisado.

## Limites preservados

UsuariosService.list e use-artesaos-ativos permanecem pendentes em HTTP.
Nomes e perfil publico usam a rota especifica do artesao.
listByArtesao aplica a paginacao e visibilidade publica WEB-06.
Listagem privada, moderacao e escritas de produtos ficaram fora.
API.md e evidencias continuam ignorados pelo .gitignore existente.
Nao houve commit, push ou deploy.
