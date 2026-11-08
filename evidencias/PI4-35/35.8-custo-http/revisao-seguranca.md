# Revisão equivalente de segurança

Revisão realizada nesta conversa, conforme autorização explícita recebida.
O responsável escolheu revisão equivalente ao agente `security-auditor`.

Escopo: script, worker, testes, documentação e evidências da 35.8.

- HTTP restrito ao loopback `127.0.0.1`.
- Rotas produtivas e fontes da aplicação permanecem no HEAD.
- URLs de banco e credenciais não são persistidas.
- Tokens de serviço são gerados em memória.
- Parâmetros desconhecidos da CLI são recusados.
- UUIDs e quantidade de contextos são validados.
- Saída exige diretório novo e arquivos exclusivos.
- SQL usa tabelas constantes e snapshot com allowlist estrita.
- Nenhum valor controlado pelo usuário compõe consultas SQL.
- Todas as sessões executam transações somente de leitura.
- Snapshot, respostas e número de chamadas são conferidos.
- Fallback local, resposta mista e cache HIT invalidam medições.
- Cada tentativa HTTP permanece no CSV antes da interrupção.
- Nenhuma falha é substituída por retry silencioso.
- Processos e conexões são encerrados no bloco final.
- Não houve commit, push ou alteração de credenciais.

Limite: usa o papel administrativo da fixture de volume.
O microsserviço lê somente as views nessa execução.
Essa configuração permite compartilhar o snapshot entre os processos.
O ensaio não altera nem audita permissões produtivas.

Não foram encontrados bloqueadores nas alterações da subtarefa.
