# ADR-003: Manter cliente-servidor com regras e dados centralizados na API

- **Status:** Aceita
- **Data:** 2026-11-26
- **Autor:** SÉRGIO CARVALHO MASSAD CHOUSINHO (scmc@cesar.school)
- **Turma:** Regular (terças)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Origem é dividido em um cliente e um servidor. O cliente é o frontend Next.js publicado na Vercel: entrega a interface (vitrine, carrinho, painéis) e um proxy /api que encaminha as requisições e o cookie de sessão. O servidor é a API Express publicada no Render: concentra autenticação, catálogo, carrinho, checkout, avaliações e administração, e é a única que acessa o PostgreSQL (Neon). O microsserviço de recomendação também fica atrás da API; o navegador nunca fala com o banco nem com ele. O navegador está sob controle do usuário, que pode editar qualquer requisição. O checkout já lê o preço e o estoque do banco com bloqueio da linha, e os schemas de entrada são estritos. A equipe é pequena, de estudantes com outras disciplinas em paralelo, e tem um semestre. A hospedagem é gratuita, com uma única instância da API. A stack foi acordada com Desenvolvimento Web e o modelo de dados com Banco de Dados. A entrega final está próxima, e qualquer mudança estrutural agora traria risco de regressão.

## Preocupações

integridade dos dados, autorização, confiança no cliente, latência de rede, disponibilidade do servidor, custo de infraestrutura, risco de regressão, prazo

## Decisão

Manter a arquitetura cliente-servidor como está, sem alterar código, contrato ou infraestrutura: o frontend continua sendo um cliente sem acesso a dados, que fala apenas com a API pelo proxy /api, e a API continua sendo a única que decide e grava preço, total, estoque, papel e dono de cada produto, autenticando e autorizando cada requisição e aceitando apenas os campos previstos em schemas estritos. Proteções adicionais, como limite de requisições por usuário, ficam como evolução planejada.

## Justificativa

O cenário exige que 100% das requisições adulteradas sejam recusadas e que nenhum pedido, estoque ou produto alheio seja alterado. A arquitetura atual já atende a essa exigência, como comprovado na rodada de testes R03. Como só o servidor acessa o banco, o cliente não tem como gravar nada diretamente. O checkout ignora qualquer preço enviado pelo navegador e calcula o total a partir do banco, na mesma transação que debita o estoque com bloqueio da linha, e um campo extra, como preco ou total, é rejeitado com 400 pelos schemas estritos. Uma quantidade acima do estoque é recusada com 409, sem gravar nada, graças ao rollback total. A autorização por papel e por dono devolve 403 para quem tenta alterar produto alheio e 401 para quem não tem sessão. Como o cenário já é atendido, mudar a arquitetura no fim do período só traria risco de regressão, sem ganho mensurável.

## Consequências

Ganhos: nenhuma mudança de código, contrato ou infraestrutura, e nenhum risco de regressão perto da entrega. O comprador continua sem conseguir alterar preço, total, estoque ou produtos alheios, porque nada disso é decidido no navegador. As regras ficam em um único lugar, testável com o PostgreSQL real, e a interface pode ser publicada separadamente sem mexer nelas.
Perdas: toda ação continua dependendo da rede e de o servidor estar no ar. Se a API cai ou hiberna no Render, ninguém compra, e a primeira requisição após a hibernação chega a levar cerca de 1 minuto. Cada operação passa por navegador, proxy, API e banco, o que soma latência. O servidor segue como ponto único de falha, em uma única instância. As validações continuam duplicadas (o cliente valida para dar retorno rápido, mas só a do servidor vale) e precisam ser mantidas em sincronia. Não há limite de requisições por usuário, então tentativas repetidas de adulteração são recusadas, mas não bloqueadas.

## Alternativas consideradas

Adicionar novas proteções agora (limite de requisições por usuário, bloqueio após tentativas suspeitas): adiado, não descartado. O cenário já é atendido sem elas, e implementá-las no fim do período traria código novo e parâmetros a calibrar às vésperas da entrega. Fica como evolução planejada.
Cliente com acesso direto ao banco por serviço gerenciado (BaaS, como Firebase ou Supabase): descartado, porque as regras do checkout (preço do catálogo, estoque nunca negativo, pedido e pagamento na mesma transação) não se expressam bem só em regras de acesso, parte da lógica iria para o navegador e o projeto fugiria da stack e do modelo de dados acordados.
Validar apenas no cliente: descartado, porque o comprador controla o navegador e pode contornar qualquer validação local.
Portas e Adaptadores como padrão principal: descartado, porque isola o domínio, mas não define onde a regra roda nem em quem se confia; as camadas já usadas dentro da API complementam o cliente-servidor.

## Rastreabilidade

**Atributo de qualidade:** Segurança (security) · Integridade

**Cenário que originou a decisão:**

> Em produção, em operação normal, um comprador autenticado mal-intencionado edita no navegador e envia à API requisições adulteradas: um pedido com preço ou total próprios, uma quantidade acima do estoque e uma alteração em produto de outro artesão. O servidor rejeita todas, calcula preço, total e estoque somente a partir do banco e não grava nenhuma alteração: 100% das requisições adulteradas são recusadas com 400, 403 ou 409, nenhum pedido é gravado com valor diferente do preço do catálogo e nenhum estoque ou produto alheio é alterado, conforme conferência no banco.

**Padrão arquitetural adotado:** Cliente-servidor

**Táticas empacotadas:** Centralizar regra e dado no servidor; Autenticar e autorizar na borda; Limitar a exposição da API

Histórias: US02, US05, US11, US12, US20. Casos de teste: CT-05 (propriedade do produto), CT-10 (quantidade acima do estoque), CT-11 (checkout suficiente), CT-12 (rollback), CT-13 (checkout concorrente), CT-22 (validação na borda), executados na rodada R03 (24/11/2026).
Código: backend/src/repositories/pedido.repository.ts (preço e estoque lidos do banco com bloqueio da linha), backend/src/validators/pedido.validator.ts (schemas estritos), backend/src/middlewares/auth.middleware.ts e role.middleware.ts (autenticação e papel), frontend/next.config.ts (proxy /api).
Testes existentes: backend/tests/integration/checkout.web09.integration.test.ts, pedidos.integration.test.ts e authorization.routes.integration.test.ts.
Documentação: docs/arquitetura-distribuida.md.

## Verificação

- **Teste do cenário:** O cenário já foi exercitado na rodada de testes R03 (24/11/2026), com a API e o PostgreSQL reais: um pedido com o campo extra preco e um com total próprio foram recusados com 400 (CT-22), uma quantidade acima do estoque foi recusada com 409 mantendo o estoque (CT-10), a edição de produto de outro artesão retornou 403 e sem sessão 401 (CT-05), e a conferência no banco mostrou que nenhum pedido, estoque ou produto alheio foi alterado. O total do pedido válido foi igual ao preço do catálogo vezes a quantidade (CT-11). Os testes de integração existentes (checkout.web09, pedidos e authorization.routes) continuam cobrindo essas regras na CI. Em produção, a verificação é manual: repetir as requisições adulteradas pelo DevTools do navegador e conferir os status e o pedido em Minha conta.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
