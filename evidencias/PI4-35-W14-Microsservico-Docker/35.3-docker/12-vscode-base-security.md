# Correção do alerta Docker DX

O aviso recebido apontava para `FROM node:22-slim`.
Docker Scout confirmou 16 vulnerabilidades altas nessa tag.
O teste de segurança falhou antes da correção.

As duas imagens agora partem de `alpine:3.24`.
Somente o binário Node vem da imagem oficial `node:22-alpine`.
Os pacotes npm e Yarn dessa imagem não são copiados.
Isso preserva Node 22 sem herdar ferramentas desnecessárias.

O npm foi atualizado para 12.2.1.
Sua dependência undici foi corrigida para 6.29.1.
O pacote corrigido substitui a cópia vulnerável usada pelo npm.
O bootstrap temporário do Alpine é removido na mesma camada.
Nenhum alerta do editor ou scanner foi desabilitado.

## Verificação

As duas bases passaram no teste automatizado de segurança.
Docker Scout retornou zero vulnerabilidades altas ou críticas.
O teste também executa Node e exige versão principal 22.

```powershell
node --test backend/tests/docker/base-security.mjs
```

Resultado: [duas bases verificadas](10-both-bases-security.txt).
Compose reconstruído: [seis verificações passaram](11-compose-after-security.txt).
Lint e typecheck backend também passaram.
O ambiente `origem-35-3-final` permanece ativo e saudável.
Antes: [relatório da tag original](09-scout-base-before.txt).
Base Alpine: [relatório](10-alpine-base-final.txt).

Os manifests e lockfiles da aplicação não foram alterados.
Os quatro alertas anteriores das dependências backend permanecem separados.
Este resultado de zero refere-se às bases, incluindo ferramentas npm.
Ele não declara ausência de vulnerabilidades na aplicação completa.
Relatórios finais: [backend](12-scout-runtime-after.txt) e
[microsserviço](12-scout-recomendacao-after.txt).

## Fontes

- [Docker DX: análise de imagens em Dockerfiles](https://github.com/docker/vscode-extension).
- [Imagem Node oficial e variantes](https://github.com/nodejs/docker-node).
- [Dockerfile oficial Node 22 Alpine](https://github.com/nodejs/docker-node/blob/main/22/alpine3.24/Dockerfile).
