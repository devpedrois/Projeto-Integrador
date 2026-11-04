# WEB-02: validação local em 13/10/2026

Branch: `codex/web-02-proxy-cookie`.
Escopo: rewrite, cookie diagnóstico e instruções manuais.

## TDD

Os testes precederam a implementação.
Frontend: 14 testes de configuração falharam inicialmente.
Backend: oito testes de ambiente falharam inicialmente.
Dois testes de emissão de cookie também falharam.
As restrições iniciais do sandbox foram distinguidas dessas falhas.
A execução local posterior confirmou todos os cenários verdes.

## Verificações

| Verificação | Resultado |
|---|---|
| Frontend `npm run lint` | Exit 0 |
| Frontend `npm run typecheck` | Exit 0 |
| Frontend `npm run build`, BACKEND_URL vazia | Exit 0 |
| Frontend `npm test` | 683 testes; 69 arquivos; exit 0 |
| Backend `npm run build` | Exit 0 |
| Backend `npm run lint` | Exit 0 |
| Backend `npm run typecheck` | Exit 0 |
| Backend ambiente e probe | 44 testes; dois arquivos; exit 0 |
| Next.js para Express, `/api/health/cookie` | 200; Set-Cookie preservado |
| Probe desativado | 404; sem Set-Cookie |
| COOKIE_SECURE verdadeiro ou falso | Header segue configuração |
| CACHE-CONTROL do probe | `no-store` preservado pelo proxy |
| BACKEND_URL ausente, vazia ou espaços | Nenhum rewrite registrado |
| BACKEND_URL inválida | Erro sanitizado, sem valores |

`validar-proxy-local.mjs` utiliza Next.js e Express reais.
Ele usa o cliente Prisma real, sem consultar o banco.
Nenhum repository ou PostgreSQL foi simulado para o teste.
A rota diagnóstica apenas emite o cookie sintético.
Não houve conexões a Neon, Render ou Vercel nessa verificação.
O resultado público fica em `proxy-local.json`.
O script encerra os servidores locais ao concluir.

O lint inicialmente encontrou erro em next-env.d.ts gerado.
Esse arquivo foi adicionado à lista de arquivos gerados ignorados.
As demais regras permaneceram ativas.
O Next.js advertiu sobre plugin ESLint ausente, sem falha.
Um teste preexistente emitiu aviso React sobre act.
Esses avisos não impediram as verificações.

## Revisão local de segurança

Revisão local mantida conforme escolha anterior do responsável.

- Somente BACKEND_URL do servidor define o destino fixo.
- Inputs da requisição não escolhem a origem backend.
- Não há variável NEXT_PUBLIC_BACKEND_URL nem exportação via env.
- Credenciais, query, fragmento e protocolos indevidos são rejeitados.
- Nenhum valor inválido é incluído na mensagem de erro.
- O probe inicia desabilitado e exige opt-in no boot.
- Query e cookie enviados pelo cliente não habilitam o probe.
- O cookie contém somente `ok`, sem identidade ou segredo.
- Domain fica ausente, preservando a origem do proxy.
- HttpOnly e SameSite=Lax estão presentes em todos os casos.
- Secure segue a configuração validada do servidor.
- O cookie expira em cinco minutos.
- O probe usa no-store e não autentica usuários.
- Não foram criadas permissões administrativas ou rotas de autenticação.
- Fila, pedidos e transações permaneceram inalterados.
- Não foram realizados deploys, seeds ou mudanças em serviços externos.
- O plano B continua apenas documentado.

## Aceites públicos pendentes

Ainda dependem dos quatro passos manuais do README frontal:

1. Provisionar Render e configurar as variáveis reais.
2. Executar uma carga demo na base de deploy.
3. Definir BACKEND_URL na Vercel e fazer redeploy.
4. Confirmar o cookie no domínio Vercel, em janela anônima.

`https://<vercel>/api/health` ainda precisa ser verificado.
A persistência real do cookie na Vercel também está pendente.
O teste local não comprova esses aceites públicos.
Se o quarto passo falhar, pare e avise o responsável.
Não aplique o plano B sem sua autorização.

API.md e evidências são ignorados pelo Git existente.
README, código, testes e uso-de-ia permanecem no diff normal.
Não houve commit nem push.
