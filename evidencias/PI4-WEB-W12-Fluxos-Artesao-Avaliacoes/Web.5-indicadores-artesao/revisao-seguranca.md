# Web.5: revisão equivalente

Data: 25/10/2026.
Responsável e revisor indicado: Pedro.
Revisão técnica executada pelo Codex nesta conversa.
Foi mantida a revisão equivalente autorizada pelo usuário.
Nenhum security-auditor foi delegado.

## Resultado

Nenhum achado bloqueante permaneceu na revisão.
O teste de troca de contas revelou chaves React duplicadas.
A chave do card passou a incluir seu próprio prefixo.
O teste confirmou descarte dos dados anteriores.

## Evidências revisadas

- API existente autentica e exige papel atual `artesao`.
- Identidade continua derivada da sessão, sem query externa.
- Nenhuma rota ou consulta de autorização foi modificada.
- O contrato frontend não recebe `artesaoId` externo.
- HTTP mantém cookie de sessão e leitura sem cache.
- DTO descarta campos adicionais não contratados.
- Contadores exigem inteiros seguros e não negativos.
- Receita exige valor finito, não negativo, em centavos.
- Datas e coerência entre vendas e vazio são validadas.
- Erros HTTP são propagados, sem fallback local.
- Fake calcula somente itens do artesão da sessão.
- Fake revalida a identidade após consultar o armazenamento.
- O hook descarta respostas de consultas canceladas.
- O card é remontado quando muda o identificador da conta.
- React renderiza conteúdo textual, sem HTML arbitrário.
- Erros exibem mensagem segura e permitem nova tentativa.
- O benchmark usa seed oficial em schema temporário real.
- As credenciais sintéticas não são gravadas nas evidências.
- O harness encerra a API e remove seu schema.

## Validação

Testes cobrem HTTP, fake, composição, estados e troca de contas.
O teste existente do endpoint usa PostgreSQL real.
As dez recargas compararam todos os valores contra a API.
Medições e capturas pertencem ao ambiente local.
