# Web.6: upload da foto de perfil

Responsável e revisor indicado: Pedro.
Branch: `codex/web-6-upload-foto`.
Sem commit ou push.

## Evidência visual e HTTP

Capturas finais em `647a60f8-6a99-4d2f-af8b-c3cc6443e58d/`.
Execução inicial preservada em `e77e2bac-49c7-46f5-acfb-6bd52e10b58c/`.
O navegador consumiu Next.js, Express e PostgreSQL reais.
Somente o armazenamento Blob foi substituído por disco temporário.
Os arquivos e a tabela foram verificados após o envio.
O schema e o diretório temporário foram removidos.

| Caso | Cliente | Servidor |
|---|---|---|
| PDF renomeado para JPG | Rejeitado por assinatura | 400 |
| PNG de 3 MiB | Rejeitado por tamanho | 413 |
| GIF | Rejeitado por formato | 400 |
| JPG de 500 KiB | Prévia e sucesso | 200 |

`resultado.json` registra bytes e respostas, sem credenciais.
`limpeza.json` confirma a remoção do schema e diretório.
O JPG foi gerado sinteticamente pelo navegador.

## Reprodução

Na pasta `backend`, com as variáveis locais já configuradas:

```powershell
node --import tsx scripts/web6-evidencias.ts
```

O script cria schema isolado usando `DIRECT_URL`.
Usa Chrome instalado ou `E2E_CHROMIUM_EXECUTABLE_PATH`.
Inicia Next.js na porta local 3116.
API local usa uma porta disponível automaticamente.
Cada execução cria nova pasta de capturas.
Não requer token real do Blob.

## Testes e revisão

`backend-upload-test.log`: 27 testes de upload e OpenAPI.
`frontend-test-final.log`: 955 testes passaram em 102 arquivos.
`backend-test.log`: 743 testes passaram em 71 arquivos.
Arquivos `*-lint.log` e `*-typecheck.log` registram validações.
`formatacao.log` confirma a formatação dos arquivos alterados.
Revisão equivalente documentada em `revisao-seguranca.md`.
Não houve teste de upload externo ou deploy.

## Documentação

Atualizados `.env.example`, OpenAPI, `API.md` e `CLAUDE.md` §8.
Registro de apoio em `docs/uso-de-ia.md`.
`API.md`, `CLAUDE.md` e evidências seguem ignorados pelo Git.
Os arquivos foram preservados localmente, sem alterações ao `.gitignore`.
