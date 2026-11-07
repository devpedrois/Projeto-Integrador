# Revisão equivalente de segurança, 36.2

A revisão equivalente segue a escolha expressa nesta conversa.
Não houve delegação a agentes auxiliares.

## Entradas e arquivos

A CLI usa parseArgs estrito e enum regional validado.
Argumentos de concorrência, isolamento ou demo são recusados.
Schemas passam pela validação e escape existentes do repositório.
O JSON de referência passa por schema de campos numéricos.
São obrigatórios dois modos históricos distintos, on e off.
A comparação detecta modos ausentes e diferenças sem arredondar.
Arquivos existentes são preservados com abertura exclusiva.
O entrypoint omite detalhes internos e valores de conexão.

## Dados e execução

A conexão de volume passa pela proteção existente do benchmark.
A operação recusa papéis privilegiados ou sem propriedade privada.
O catálogo é consultado somente pela view contratual existente.
A projeção usa o mesmo snapshot de ambas as execuções.
As únicas escritas da operação são os registros privados parametrizados.
A coleta real utilizou recomendacao_app, com C=8 e pool 10.
Os dois registros privados foram consultados e conferidos.
Nenhuma consulta às tabelas da API foi adicionada ao microsserviço.
As contagens estruturais usam o harness administrativo separado.
Nenhum segredo administrativo aparece nas entradas do lote.
Credenciais do volume foram geradas somente em memória.
Não foram alteradas variáveis persistidas de produção.

## Contraprovas

Os testes reais preservam contagens de singleton, fallback e região ausente.
Incluem projeção de produto oculto e base vazia.
Cada modo persiste seu próprio ID e hash com concorrência 8.
O teste da coleta grava JSON e diff e compara os dados lidos.
Os testes da CLI recusam opções inválidas e preservam arquivos anteriores.
A suíte existente cobre isolamento entre API e microsserviço.
O hash off da coleta real coincide com o hash anterior.

Não foram encontrados bloqueadores na revisão.
Nenhuma dependência npm foi adicionada ou atualizada.
O aviso TLS já existente permanece registrado nos logs.
