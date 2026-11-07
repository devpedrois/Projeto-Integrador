# Revisão equivalente de segurança, 35.6

O responsável escolheu revisão equivalente nesta conversa.
Essa escolha substitui a delegação ao agente security-auditor.

## Entradas e fronteiras

- Concorrência inteira validada entre 1 e 8.
- Booleano regional validado sem coerção permissiva.
- Schemas validados e escapados com escapeIdentifier.
- CLI usa parseArgs estrito e mensagens sanitizadas.
- Argumentos desconhecidos e valores ausentes são recusados.
- Arquivos existentes são preservados com abertura exclusiva.

## PostgreSQL e permissões

- Valores do registro privado usam parâmetros PostgreSQL.
- A conexão exige proprietário restrito do schema privado.
- O catálogo é consultado exclusivamente pelas views contratuais.
- Leitores usam snapshots compartilhados somente leitura.
- O escritor reservado pertence ao mesmo pool C+2.
- A persistência não utiliza conexões administrativas.
- Uma inserção e uma atualização mantêm uma linha.
- Falhas deixam registro incompleto, sem simular sucesso.
- Nenhum retry pode duplicar silenciosamente uma execução.
- Erros interrompem novas tarefas e aguardam tarefas pendentes.
- O fechamento destrói as sessões e desfaz transações leitoras.

## Contraprovas automatizadas

Os testes reais conferem quinze registros do benchmark.
Comparam os hashes persistidos com os resultados efetivos.
Verificam C=1 e C=4 com regional ligado e desligado.
Também cobrem concorrência inválida, snapshots e sobreposição recusada.
Revogar leitura durante a seleção produz registro incompleto.
A CLI real grava JSON e preserva arquivos existentes.
A suíte existente verifica isolamento entre API e microsserviço.

## Ambiente e evidências

A coleta usa exclusivamente a branch sintética de volume.
O benchmark recusa produção e aliases das bases padrão.
Credenciais de preparação são geradas somente na memória.
As evidências públicas omitem URLs e segredos do banco.
A versão antiga do lote foi removida do backend.
Não foram encontrados bloqueadores na revisão de código.
O aviso TLS existente do driver permanece nos logs.
Nenhuma dependência npm foi adicionada ou atualizada.


## Conferência da coleta real

A branch de volume continha 1.000 produtos elegíveis.
O papel recomendacao_app não leu Produto, Usuario ou Pedido.
Quinze execuções geraram exatamente quinze linhas privadas concluídas.
Todos os registros persistiram o hash conferido independentemente.
A sondagem final encontrou apenas uma sessão remota ociosa.
Nenhuma transação do lote permanecia aberta nesse instante.
As sondagens diagnósticas não alteraram dados do catálogo.
