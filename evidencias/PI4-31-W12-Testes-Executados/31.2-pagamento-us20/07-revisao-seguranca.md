# Revisão equivalente: subtarefa 31.2

Data: 25/10/2026.
Responsável: Sergio. Revisor humano indicado: Pedro.
A revisão equivalente nesta conversa foi autorizada pelo usuário.
Não houve delegação ao agente `security-auditor`.

## Escopo revisado

Foram revisados os três arquivos de testes envolvidos.
Também foram conferidos helper de banco, controller e repository.
O workflow existente foi consultado, sem alterações.
Nenhum arquivo de produção foi modificado.

## Resultados

- As sessões vêm de cadastro e login HTTP reais.
- As duas contas compradoras possuem cookies independentes.
- O pedido pertence à conta que confirmou o checkout.
- O proprietário consegue consultar o pagamento persistido.
- Outro comprador recebe somente o erro público 404.
- Um UUID inexistente recebe a mesma resposta 404.
- A resposta negada não contém pedido ou pagamento.
- Os valores esperados são calculados independentemente, com fixtures sintéticas.
- A contagem verifica exatamente um pagamento vinculado ao pedido.
- Estoque insuficiente deixa pedidos e pagamentos ausentes.
- As consultas SQL existentes permanecem parametrizadas.
- O helper utiliza schema aleatório e PostgreSQL real.
- A limpeza atua somente no schema isolado da suíte.
- O encerramento remove esse schema e fecha conexões.
- Não há mocks de banco ou repositories.
- Segredos usados nas fixtures são exclusivamente sintéticos.
- Cookies e URLs de conexão não são exportados.

## Contraprovas

O plugin `90-mutacao.config.mjs` altera módulos somente em memória.
Ele preserva os arquivos originais de produção no disco.
Cada execução utiliza o helper real de schema isolado.

| Mutação                                   | Resultado observado                                     |
| ----------------------------------------- | ------------------------------------------------------- |
| Omitir pagamento no detalhe HTTP          | O teste falhou comparando `null` ao pagamento esperado. |
| Remover filtro do comprador no repository | O teste falhou recebendo 200 em vez de 404.             |

As falhas esperadas estão nos logs 04 e 05.
Essas execuções não representam falhas da implementação original.
Os testes de estoque e falha sintética já existiam.
Eles foram preservados, sem inventar falhas iniciais de funcionalidade.

Nenhum achado bloqueante foi identificado nesta revisão local.
A revisão humana de Pedro não é presumida como concluída.
