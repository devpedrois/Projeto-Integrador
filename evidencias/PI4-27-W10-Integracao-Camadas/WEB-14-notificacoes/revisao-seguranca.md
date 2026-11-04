# Revisão local equivalente de segurança

Pedro escolheu revisão equivalente sem delegar security-auditor.

- Autenticação reconsulta usuário ativo no PostgreSQL.
- Papel artesão é obrigatório em ambas as rotas.
- Destinatário vem da sessão, sem aceitar identidade externa.
- UPDATE combina id e usuarioId atomicamente.
- Registro alheio e ausente recebem o mesmo 404.
- UUID do PATCH é validado por Zod.
- Prisma parametriza consultas e seleciona somente campos públicos.
- Respostas privadas usam Cache-Control: no-store.
- UNIQUE preserva ID, leitura e timestamp durante redelivery.
- Falha parcial não marca intenção como processada.
- Polling remove intervalo e listener após desmontagem.
- Trocar sessão desmonta notificações da conta anterior.
- Evidências não incluem senhas, hashes, tokens ou conexões.

Não foram encontrados bloqueios no escopo WEB-14.
