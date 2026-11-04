# Revisão equivalente de segurança: Web.3

Data: 22/10/2026.
Responsável informado: Luiz Rocha. Revisor informado: Pedro.
Revisão técnica equivalente executada pelo Codex nesta conversa.
Preservada a escolha anterior do usuário, sem delegação ao security-auditor.

Foram revisados rotas, composição, controller, service, repository,
validators, adapter HTTP, hook, formulário, OpenAPI e testes.

- POST autentica e revalida o papel comprador antes de validar o corpo.
- Schema estrito rejeita compradorId e campos adicionais.
- A identidade persistida deriva somente da sessão revalidada.
- Nota aceita somente inteiros de 1 a 5.
- Comentário recebe trim antes do limite de 500 caracteres.
- Prisma parametriza a escrita e seleciona apenas campos contratados.
- A UNIQUE comprador/produto impede duplicação inclusive sob concorrência.
- P2002 recebe 409 seguro; FK inexistente recebe 404 seguro.
- Nenhuma senha, email ou token integra a resposta criada.
- A escrita não calcula nem persiste nota média.
- GET continua calculando a média sobre avaliações persistidas.
- Cache de produtos e recomendações é invalidado somente após gravar.
- Escritas rejeitadas não invalidam o cache confirmado.
- O adapter HTTP envia somente produtoId, nota e comentário.
- O parser descarta propriedades adicionais da resposta.
- React renderiza comentários como texto, sem HTML inserido.
- O formulário não permite envio simultâneo nem reenvio após 409.
- Erros preservam os campos; respostas de leitura tardias são descartadas.
- Pedidos pendentes e cancelados não exibem o formulário.
- Troca de comprador remonta os componentes pelo ID da sessão.
- A API ainda não verifica compra, conforme escopo explícito Web.3.

A revisão identificou diferença entre os validadores de UUID.
Um teste reproduziu o caso antes da correção.
O cliente foi alinhado à expressão usada pelo Zod instalado.
Nenhum achado acionável permanece dentro deste escopo.
A ausência de compra verificada é a entrega reservada à Web.4.
Não houve deploy intermediário, commit, push ou alteração de schema.

As capturas usam somente contas e pedidos sintéticos locais.
O banco visual utiliza schema temporário separado dos dados existentes.
API.md e CLAUDE.md continuam ignorados pelas regras existentes do Git.
