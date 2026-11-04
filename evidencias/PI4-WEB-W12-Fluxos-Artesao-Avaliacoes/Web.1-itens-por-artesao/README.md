# Web.1: pedidos recebidos pelo artesão

Responsável: Andrews. Revisão informada: Pedro.
Branch: `codex/web1-artisan-orders`.

## Evidências locais

- `01-payload-artesao-a.json` e `02-payload-artesao-b.json`: respostas HTTP reais do mesmo pedido.
- `capturar-payloads.mts`: reprodução da captura com checkout real e dados sintéticos.
- `03-terminal-testes.txt`: saída da suíte completa do backend.
- `revisao-seguranca.md`: revisão equivalente autorizada nesta conversa.

Resultado final do backend: 60 arquivos e 629 testes aprovados.
A suíte completa terminou com código de saída zero.

As capturas comprovam o isolamento dos produtos e subtotais.
Cada execução utiliza um schema PostgreSQL temporário e independente.
O helper remove o schema ao encerrar, preservando dados existentes.
Não houve `prisma migrate deploy`, commit, push ou deploy.

## TDD observado

Antes da implementação, os 21 testes Web.1 falharam.
A rota inexistente respondeu 404, conforme esperado nesse estágio.
A restrição inicial de rede impediu resolver o Neon.
A execução autorizada com rede confirmou as falhas funcionais.
Após implementar, Web.1 e WEB-11 passaram: 41 testes.

O teste OpenAPI também foi escrito antes do contrato.
A execução confirmou três falhas relacionadas à rota não documentada.
O contrato foi então acrescentado ao documento gerado.

Lint, typecheck e Prettier foram executados com sucesso.
As quebras de linha originais dos arquivos foram preservadas.
Os avisos de SSL e depreciação de pg constam no log.

## Reproduzir

Execute os comandos dentro de `backend/`.
O ambiente local precisa fornecer `DIRECT_URL`, sem registrá-la nas evidências.

```powershell
npm test
npm run typecheck
npm run lint
node node_modules/tsx/dist/cli.mjs ../evidencias/PI4-WEB-W12-Fluxos-Artesao-Avaliacoes/Web.1-itens-por-artesao/capturar-payloads.mts
```

API.md e CLAUDE.md foram atualizados localmente.
As regras existentes do Git continuam ignorando esses documentos.
Esta entrega não inclui tela nem status por item.
