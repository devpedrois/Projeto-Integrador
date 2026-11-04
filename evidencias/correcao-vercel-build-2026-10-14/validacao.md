# Correção do build Vercel

Data: 14/10/2026.
Branch: codex/fix-vercel-build-isolation.
Base: 09afd37, main após WEB-11.

## Reprodução

O checkout foi extraído de HEAD com git archive.
Contém frontend e backend/src versionados, sem Prisma gerado.
Não contém .env ou credenciais locais.
Node_modules frontend utiliza os módulos já instalados por junction.
NEXT_PUBLIC_DATA_SOURCE=http foi definido para o build.

Antes da correção, next build compilou e falhou na checagem TypeScript.
A mensagem foi exatamente:

```text
../backend/src/repositories/catalogo.repository.ts:1:35
Type error: Cannot find module '../generated/prisma/client.js' or its corresponding type declarations.
```

A regressão TypeScript também falhou antes da implementação.
Detectou arquivos backend no grafo de compilação de produção.

## Correção e validação

- NextConfig seleciona tsconfig.build.json.
- O build verifica aplicação, middleware, configuração e tipos Next.
- O build não inclui testes ou configuração Vitest.
- Strict permanece habilitado; ignoreBuildErrors não foi ativado.
- O typecheck original continua verificando os contratos com o backend.
- Os mesmos imports de contrato permanecem nos testes.
- next build passou no checkout sem Prisma gerado.
- As treze páginas estáticas foram geradas.
- Passaram 826 testes em 87 arquivos frontend.
- Lint, typecheck e Prettier passaram.
- Aviso preexistente do plugin ESLint Next.js permaneceu não bloqueante.
- Revisão equivalente de segurança não encontrou achados no escopo.

Saída real do build: build-sem-prisma.log.
Saída real da suíte completa: testes-frontend.log.
A validação local não representa publicação na Vercel.
