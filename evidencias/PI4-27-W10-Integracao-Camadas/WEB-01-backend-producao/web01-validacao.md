# WEB-01: validação em 13/10/2026

Branch: `codex/web-01-backend-producao`.
Escopo: configuração e preparação do backend para produção.

## TDD

Os testes precederam a implementação.
A execução inicial confirmou 35 falhas e sete sucessos.
Falhas: produção rejeitada, variáveis ausentes e headers incompletos.
O erro inicial do sandbox foi distinguido dessas falhas.
Os testes reais foram executados com acesso ao PostgreSQL.

## Resultado

| Verificação | Resultado |
|---|---|
| `npm run build` | Exit 0; `prisma generate && tsc` |
| `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0 |
| `npm test` | Exit 0; 198 testes, 29 arquivos |
| Binário compilado em produção | `NODE_ENV=production`, `HOST=0.0.0.0` |
| Bootstrap pg-boss | Concluído antes da escuta HTTP |
| `curl.exe /health` | HTTP 200 com PostgreSQL real |
| JWT_SECRET curto ou vazio | Exit 1, mensagem sanitizada |
| JWT_SECRET ausente | Rejeitado nos testes de ambiente e processo |
| Headers | Helmet em respostas 200, 400 e 404 |
| `x-powered-by` | Ausente |
| `.env.example` | Todas as chaves; valores fictícios |
| Segredos locais nos arquivos alterados | Nenhum encontrado |
| Formatação | Revisada; diff sem whitespace inválido |

O script `validar-producao.mjs` testa o binário compilado.
Execute após o build, dentro de `backend/`:

```powershell
node ../evidencias/PI4-27-W10-Integracao-Camadas/WEB-01-backend-producao/validar-producao.mjs
```

Saída observada, sem segredos:

```text
Invalid JWT_SECRET: exit 1, sanitized variable name only.
NODE_ENV=production; HOST=0.0.0.0; pg-boss bootstrap completed.
{"status":"ok","database":"reachable"}
HTTP_STATUS:200
```

O script encerra servidor, fila e conexão ao finalizar.
Usa segredo sintético exclusivo para o teste local.

## Revisão local de segurança

Revisão equivalente autorizada explicitamente pelo responsável.
O agente security-auditor não foi delegado por essa escolha.

- A validação ocorre antes das conexões externas.
- Apenas nomes de variáveis aparecem nos erros de configuração.
- Falhas operacionais continuam sanitizadas na borda do processo.
- COOKIE_SECURE aceita somente `true` ou `false`.
- O padrão de COOKIE_SECURE é verdadeiro em produção.
- Origem rejeita credenciais, caminhos e protocolos não HTTP.
- JWT exige pelo menos 32 caracteres úteis quando fornecido.
- Headers foram verificados sobre banco real.
- A comparação com `.env` não encontrou segredos locais.
- Não foram criadas rotas administrativas nem autenticação antecipada.
- Checkout transacional e isolamento permanecem inalterados.
- Testes existentes verificam integridade, fila e reentrega.
- POST /pedidos ainda recebe identidade escolhida pelo cliente.
- Essa limitação preexistente está documentada no README.

`npm audit --omit=dev --json` encontrou seis vulnerabilidades:

| Pacote | Versão | Severidade |
|---|---|---|
| `@prisma/config` | 7.10.0 | Alta |
| `deepmerge-ts` | 7.1.5 | Alta |
| `fast-uri` | 3.1.7 | Moderada |
| `mysql2` | 3.15.3 | Alta |
| `prisma` | 7.10.0 | Alta |
| `proxy-addr` | 2.0.7 | Crítica |

Todas essas versões já estavam no lockfile original.
O lockfile adiciona somente Helmet 8.3.0.
Nenhuma correção de dependências foi incluída nesta subtarefa.

## Limites

O teste de produção foi local, com banco real.
Render e Vercel não foram provisionados nesta entrega.
O script start:prod aplica migrations antes do servidor.
Ele foi inspecionado, sem aplicar migrations pela evidência.
A fila mantém seu bootstrap e funcionamento anteriores.
Não houve seed manual, commit ou push.
As evidências permanecem ignoradas pelo Git existente.

O driver PostgreSQL emitiu seu aviso preexistente sobre SSL.
A instalação também indicou Node local 22.12.0.
O README orienta Node 24, conforme o requisito existente.
Esses avisos não impediram as verificações exigidas.

## Evidência visual

`web01-evidencia-visual.png` apresenta saídas de comandos reais.
As execuções correspondentes estão em `web01-execucoes-visuais.json`.
O gerador é `gerar-evidencia-visual.py`, usando Pillow.
A imagem identifica claramente sua natureza de transcrição visual.
Ela não representa uma captura de terminal.
O relatório inclui health, JWT, build, lint e typecheck.
Também mostra os 31 testes de ambiente reexecutados.
Os 198 testes completos referenciam a execução anterior registrada.
Nenhum segredo real aparece nos arquivos gerados.
