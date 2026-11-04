# Revisão equivalente de segurança: PI4-33.2

Revisão nesta conversa, conforme autorização explícita recebida.
Nenhum agente foi delegado.

## Escopo conferido

- Schema Prisma: somente `@@index([tecnicaPrincipalId])` foi acrescentado.
- Migration nova: somente um `CREATE INDEX`, sem parâmetros externos.
- Nenhuma migration anterior foi alterada.
- Nenhum dado, papel, privilégio ou contrato HTTP foi alterado.
- O índice não é único e preserva valores nulos.
- FKs, ações referenciais e autorização permanecem iguais.
- O DDL consolidado reproduz o mesmo índice.
- Evidências e diff não contêm credenciais ou conexões completas.

## Revisão da migration gerada

O Prisma gerou também operações fora da subtarefa.
Incluíam recriação de dois GIN e alteração de DEFAULT.
O rascunho original foi preservado somente como evidência local.
Essas operações foram removidas antes de qualquer aplicação.
A revisão automática inicialmente bloqueou a aplicação por essas operações.
A leitura posterior comprovou o SQL contendo somente o índice.
O status mostrou exclusivamente essa migration pendente.
Depois dessa comprovação, `migrate deploy` aplicou somente o SQL revisado.
Seu checksum no PostgreSQL corresponde ao arquivo local.

## Ambiente dos testes

A conexão habitual da API não pode criar schemas.
A conexão administrativa de desenvolvimento possui essa permissão.
Os testes de worker exigem schemas e filas temporários.
O diagnóstico isolado passou com `DATABASE_URL = DIRECT_URL` no processo.
Nenhum arquivo `.env` ou privilégio foi modificado para isso.
O cliente psql recebeu credenciais somente pelo ambiente do container.

## Resultado

Nenhum achado de segurança na alteração solicitada.
A revisão não constitui auditoria geral do projeto.
