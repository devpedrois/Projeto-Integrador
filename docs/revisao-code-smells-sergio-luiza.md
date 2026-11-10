# Revisão crítica de código — Code Smells (Sérgio Chousinho e Luiza Vieira)

Desafio da disciplina **Requisitos, Projeto de Software e Validação** · 10/11/2026.
Responsáveis: Sérgio Chousinho ([@sergiochou](https://github.com/sergiochou)) e Luiza Vieira ([@vbluuiza](https://github.com/vbluuiza)).
Base analisada: `738bb1b` (posterior à tag `v1.0.0`).

## Escopo e resultado

O desafio pede que cada integrante revise uma parte do código, aponte pelo menos um code smell e decida, com justificativa técnica, se ele deve ou não ser refatorado.

Revisamos o fluxo de criação de pedido (checkout) no backend, a composição de serviços no frontend e os validadores de paginação de pedidos.

| # | Code smell | Local | Decisão |
|---|------------|-------|---------|
| 1 | Long Method com regra de negócio no repositório | `backend/src/repositories/pedido.repository.ts`, `PrismaPedidoRepository.criar` (linhas 326–464) | **Não refatorar** |
| 2 | Condicionais repetidas e implementação legada no container | `frontend/src/services/fake/container.ts` e `frontend/src/services/data-source.ts` | **Não refatorar** |
| 3 | Código duplicado e paginação inconsistente | `backend/src/validators/pedido.validator.ts` (linhas 16–46) | **Não refatorar** |

Esta intervenção **não altera código executável**. Como o enunciado pede para os casos sem refatoração, a análise e as justificativas ficam registradas neste arquivo versionado. O comportamento do software continua exatamente o mesmo.

---

## Smell 1 — Long Method com regra de negócio no repositório

### Identificação

O método `PrismaPedidoRepository.criar` tem cerca de 140 linhas e executa, dentro de uma única transação Prisma (`tx`), nove responsabilidades:

1. trava o comprador com `FOR NO KEY UPDATE` (linha 328);
2. agrega as quantidades por produto;
3. ordena os IDs (linha 337) e trava cada produto com `SELECT ... FOR UPDATE OF p`;
4. valida a disponibilidade: produto ativo, não moderado, artesão ativo e com papel `artesao`;
5. valida o estoque (`ESTOQUE_INSUFICIENTE`, 409);
6. calcula preço, subtotal e total, com o limite `"99999999.99"` (linha 389);
7. cria o pedido, baixa o estoque e grava os itens;
8. cria o pagamento simulado e limpa o carrinho;
9. grava a `IntencaoNotificacao`, que funciona como outbox da fila (linha 442).

Os smells presentes são:

- **Long Method**, porque o método mistura SQL de lock, regra de domínio e montagem de DTO;
- **regra de negócio na camada de persistência**, que leva a **Divergent Change**: mudanças de preço, pagamento, carrinho ou notificação recaem todas no mesmo método;
- **Magic Number**, porque `"99999999.99"` repete o limite da coluna `Pedido.total`, do tipo `Decimal(10, 2)` em `backend/prisma/schema.prisma`.

### Impactos potenciais

| Aspecto | Impacto |
|---------|---------|
| Legibilidade | É preciso ler o método inteiro para entender o checkout |
| Coesão | Baixa: há vários níveis de abstração no mesmo bloco |
| Acoplamento | O repositório de pedido conhece pagamento, carrinho e notificação |
| Manutenibilidade | Qualquer mudança no checkout passa por uma seção crítica de concorrência |
| Extensibilidade | Frete ou cupom exigiriam inserir regra no meio da transação |
| Testabilidade | O cálculo de total não tem teste unitário isolado, só teste de integração com Postgres |

### Alternativas avaliadas

- **Extract Method:** criar `travarProdutosOrdenados(tx, ids)`, `validarDisponibilidade(produto)`, `calcularItensETotal(...)`, `registrarPagamentoSimulado(tx, ...)` e `limparCarrinho(tx, ...)`.
- **Move Method:** levar a validação e o cálculo para `pedido.service.ts` ou para `backend/src/domain/`.
- **Replace Magic Number with Symbolic Constant:** criar `TOTAL_MAXIMO_PEDIDO`.

### Decisão: não refatorar

**1. A correção depende da ordem e do escopo transacional.**
Os produtos são travados em ordem crescente de ID para impedir a espera circular entre checkouts concorrentes. Essa estratégia contra deadlock está documentada em [`concorrencia-checkout-u2.md`](concorrencia-checkout-u2.md). Todas as operações usam o mesmo `tx`. Se o método for quebrado em funções, cada uma passa a receber `tx` por parâmetro. Basta uma chamada futura com `this.prisma` no lugar de `tx` para a operação sair da transação sem erro de compilação nem de teste óbvio. Ou seja, a refatoração criaria um modo silencioso de quebrar a atomicidade.

**2. A validação de estoque precisa acontecer sob o mesmo lock da gravação.**
A checagem de estoque só é correta porque acontece depois do `FOR UPDATE` e dentro da mesma transação. Movê-la para o service deixa duas saídas, ambas piores:

- o service passa a controlar a transação do Prisma, o que vaza um detalhe de infraestrutura para a camada de serviço;
- ou a validação acontece fora do lock, e volta a condição de corrida que causa overselling.

Manter regra e lock juntos foi uma escolha consciente de arquitetura, não um descuido.

**3. Ler o fluxo de forma linear tem valor neste trecho.**
Para auditar concorrência, ler "trava → valida → grava" num bloco único é mais seguro do que navegar por várias funções. A documentação e o diagrama de sequência de FCCPD apontam diretamente para `pedido.repository.ts:criar`. Espalhar a lógica deixaria essa documentação desatualizada.

**4. O projeto está em fase de fechamento.**
O repositório já tem a tag `v1.0.0`, aceite final registrado ([`matriz-aceitacao-u2.md`](matriz-aceitacao-u2.md)) e relatório final de testes ([`Relatorio-Testes-Origem-Final.md`](Relatorio-Testes-Origem-Final.md)). Refatorar o checkout agora invalidaria os benchmarks ([`relatorio-desempenho-u2.md`](relatorio-desempenho-u2.md)) e as evidências de concorrência já entregues, e obrigaria a refazê-los perto da apresentação final.

**5. Os testes existentes não cobrem o risco principal.**
`pedidos.integration.test.ts`, `concorrencia-script.integration.test.ts` e `checkout.web09.integration.test.ts` detectam overselling e estoque negativo. Problemas de ordem de lock e deadlock, porém, são não determinísticos: um teste passar não prova que a mudança não abriu uma janela rara. O ganho seria só de legibilidade, e o risco seria de correção.

**6. A constante teria benefício marginal.**
O valor está acoplado ao tipo da coluna no schema. Uma constante isolada no repositório continuaria duplicando essa informação; o ideal seria derivar o limite do schema. Por isso o benefício não justifica uma alteração de código depois da release.

### Riscos e limitações assumidos

- O método continua extenso para quem chega ao código. A mitigação é o mapeamento passo a passo em [`concorrencia-checkout-u2.md`](concorrencia-checkout-u2.md).
- Evoluções do checkout, como frete ou cupom, vão exigir intervenção neste método.
- **Recomendação para uma versão futura:** começar com Extract Method apenas nas partes puras (cálculo de subtotal e total, mapeamento do retorno), que não recebem `tx` e ganhariam teste unitário. O trecho de locks deve continuar linear. O teste de concorrência deve ser executado antes e depois da mudança.

---

## Smell 2 — Condicionais repetidas e implementação legada no container do frontend

### Identificação

- `frontend/src/services/fake/container.ts` (350 linhas) decide em **15 pontos** entre a implementação HTTP e a Fake API usando `modoHttp()` (definida na linha 52).
- `PENDENTES_HTTP` (linha 50) está vazio: todos os serviços já têm implementação HTTP.
- As camadas `frontend/src/fake-api/` e `frontend/src/services/fake/` somam cerca de 2.300 linhas.
- Em `frontend/src/services/data-source.ts`, quando `NEXT_PUBLIC_DATA_SOURCE` está ausente ou vazia, o padrão é `"fake"`.

Os smells presentes são **condicionais repetidas (Switch Statements)**, **Shotgun Surgery** (cada novo serviço exige duas implementações e um novo ramo no container) e, aparentemente, **Speculative Generality / código morto**.

### Impactos potenciais

- Acoplamento do container a duas implementações de cada serviço.
- Mais código para manter e revisar.
- Risco operacional: um deploy sem a variável configurada sobe em modo fake.

### Alternativas avaliadas

- **Replace Conditional with Polymorphism:** criar uma `HttpServiceFactory` e uma `FakeServiceFactory`, escolhidas uma única vez na inicialização.
- **Remove Dead Code:** remover a Fake API.

### Decisão: não refatorar

1. **A Fake API não é código morto.** Ela é usada em 59 arquivos de teste do frontend e é o modo de desenvolvimento offline documentado no README e em [`fake-api.md`](fake-api.md). Removê-la exigiria reescrever boa parte da base de testes do frontend.
2. **O smell está contido.** O container é o único ponto de composição. Páginas, componentes e hooks dependem dos contratos em `frontend/src/services/contracts/`, não das implementações. A repetição não se espalha para o resto do sistema, e esse era justamente o objetivo do desenho da AV1: trocar a fonte de dados mexendo num só lugar.
3. **A mudança seria transversal no momento errado.** Trocar a fábrica afeta a inicialização de todas as telas. Nesta mesma data a equipe alterou sessão e testes do frontend (commit `738bb1b`), então uma refatoração paralela aumentaria o risco de conflito e de regressão.
4. **Há valor como evidência.** A Fake API documenta a evolução AV1 → AV2 cobrada em Desenvolvimento Web.

### Riscos e limitações assumidos

- O padrão `"fake"` é um risco de configuração. Hoje ele é mitigado pelo `frontend/.env.example`, que traz `NEXT_PUBLIC_DATA_SOURCE=http`, e pela tabela de variáveis da Vercel no README.
- **Recomendação futura:** mudar o padrão para `http` ou lançar erro explícito quando a variável estiver ausente em build de produção. Depois disso, avaliar a fábrica polimórfica.

---

## Smell 3 — Código duplicado e paginação inconsistente

### Identificação

- Em `backend/src/validators/pedido.validator.ts`, a cadeia `.string().regex(/^[1-9]\d*$/).default(...).transform(Number).pipe(...)` aparece três vezes (linhas 19, 25 e 36). Enquanto isso, `backend/src/validators/catalogo.validator.ts` já tem o helper `inteiroQuery` (linha 8).
- Os pedidos do comprador paginam com `pagina`/`limite`. Os pedidos do artesão, o catálogo e as avaliações usam `limit`/`offset`.

Os smells presentes são **Duplicated Code** e **inconsistência de nomenclatura no contrato da API**.

### Impactos potenciais

- Uma mudança na regra de paginação precisa ser repetida em vários pontos.
- Quem consome a API precisa lidar com dois estilos de paginação.

### Alternativas avaliadas

- **Extract Function:** criar um helper comum de inteiro em query string, reaproveitado por todos os validadores.
- **Renomear parâmetros:** padronizar tudo como `limit`/`offset`.

### Decisão: não refatorar

1. **Os nomes fazem parte do contrato público.** `pagina`/`limite` aparecem na especificação OpenAPI gerada em `backend/src/docs/openapi.ts`, em `frontend/src/services/http/pedidos.service.ts`, em `frontend/src/domain/paginacao-pedidos` e nos testes de "Meus pedidos". Renomear depois da `v1.0.0` é uma *breaking change*. O caminho correto seria versionar a API ou aceitar os dois nomes durante uma deprecação, o que custa mais do que o problema.
2. **As cópias não têm a mesma semântica.** O `inteiroQuery` do catálogo aceita `0` (`/^\d+$/`), aplica o `default` depois do `pipe` e adiciona metadados de OpenAPI. Os campos `pagina` e `limite` rejeitam `0` e aplicam o `default` antes da transformação. Unificar sem cuidado mudaria quais requisições são aceitas e a documentação gerada. Isso deixaria de ser refatoração, que por definição preserva o comportamento.
3. **A escala é pequena.** São três ocorrências num único arquivo, no limite da "regra de três", e o custo de leitura é baixo.

### Riscos e limitações assumidos

- A inconsistência continua visível para quem consome a API.
- **Recomendação futura:** numa v2 da API, padronizar `limit`/`offset`, aceitar temporariamente os nomes antigos e extrair um helper parametrizado pelo valor mínimo.

---

## Registro da intervenção (tópico 3 do desafio)

O tópico 3 do desafio pede:

| Exigência | Como foi atendida |
|-----------|-------------------|
| Pelo menos um commit individual no repositório | Commits de Sérgio Chousinho e de Luiza Vieira que adicionam e complementam este arquivo e o link no README |
| Mensagem do commit identificando o smell e a decisão | Mensagem sugerida abaixo, citando os três smells e a decisão de não refatorar |
| Casos sem refatoração registrados em Markdown versionado | Este arquivo, `docs/revisao-code-smells-sergio-luiza.md`, liberado no `.gitignore` e linkado na seção **Documentação** do README |
| Refatorações preservando o comportamento, com testes quando aplicável | Nenhum código executável foi alterado, então não há mudança de comportamento a validar |

Mensagem de commit sugerida:

```text
docs(refactor): record code smell review without refactoring

Code smells analisados (desafio de Requisitos):
- Long Method / regra de negocio no repositorio em
  PrismaPedidoRepository.criar (pedido.repository.ts:326-464)
- Condicionais repetidas e Fake API legada em
  frontend/src/services/fake/container.ts
- Codigo duplicado e paginacao inconsistente em
  backend/src/validators/pedido.validator.ts

Decisao: nao refatorar. Checkout e secao critica de concorrencia
(locks ordenados na mesma transacao), Fake API ainda sustenta os
testes do frontend e os nomes de paginacao sao contrato publico
da v1.0.0. Justificativas em docs/revisao-code-smells-sergio-luiza.md.
```

## Resumo

| Smell | Técnica que caberia | Benefício esperado | Por que não agora |
|-------|---------------------|--------------------|-------------------|
| Long Method no checkout | Extract Method / Move Method | Legibilidade e testabilidade | Risco à atomicidade e à ordem dos locks; evidências de FCCPD já entregues |
| Condicionais repetidas no container | Replace Conditional with Polymorphism | Menos repetição e menos Shotgun Surgery | Fake API ainda usada nos testes; smell contido; mudança transversal em fase final |
| Paginação duplicada e inconsistente | Extract Function / renomear | Consistência do contrato | Breaking change na API publicada; semântica diferente entre as cópias |

O objetivo do desafio não é mudar o código a qualquer custo. Os três problemas são reais e estão registrados com riscos e plano de evolução. Manter a implementação atual é a decisão de menor risco para um sistema já liberado, sob concorrência e com evidências entregues.
