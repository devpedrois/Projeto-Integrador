# Web.6: revisão equivalente nesta conversa

Responsável e revisor indicado: Pedro.
Modalidade autorizada: revisão equivalente, sem delegação ao security-auditor.

## Resultado

Nenhum achado novo bloqueante no escopo do upload.
Autenticação e papel são verificados antes do parser.
Usuário ativo e papel atual vêm do PostgreSQL.
O corpo multipart aceita apenas um arquivo `foto`.
O parser limita armazenamento a 2 MiB.
MIME e assinatura precisam corresponder a JPG ou PNG.
Nome e extensão são gerados pelo servidor.
Nenhum nome do cliente participa do caminho.
O serviço atualiza somente o perfil da sessão.
Exclusão exige origem e prefixo do próprio usuário.
O teste de URL alheia injetada preserva o terceiro.
Concorrência usa o bloqueio já existente de Usuario.
O banco real e os arquivos confirmaram substituição concorrente.
Falha transacional removeu o arquivo novo do disco.
Falha do storage não alterou a foto persistida.
Erros do provider são convertidos em mensagem genérica.
Credenciais não são retornadas nem registradas por esses caminhos.
O frontend importa contratos HTTP, sem SDK ou token Blob.
O cliente não reenvia uma foto antiga no PATCH.

## Dependências

O SDK foi fixado em `@vercel/blob` 2.4.0.
A escolha segue a correção indicada pelo npm audit.
Essa versão mantém a API necessária de `put` e `del`.
O parser instalado é Multer 2.5.0.
`npm-audit-final.json` registra 12 alertas no backend.
São três moderados, oito altos e um crítico.
As versões afetadas já existiam no lockfile de HEAD.
`audit-comparacao.json` confirma a comparação por pacote.
Nenhum alerta restante envolve dependências novas do upload.
Não foram aplicadas atualizações gerais fora da Web.6.
O alerta crítico existente afeta `proxy-addr`.

## Limites

Vercel Blob real não foi acionado nesta validação.
Os testes usam a interface com arquivos temporários reais.
Configuração de produção exige store público e token backend.
Assinaturas binárias não substituem decodificação integral da imagem.
Esse controle atende ao requisito solicitado de magic bytes.
Blob e PostgreSQL não compartilham uma transação distribuída.
Falha definitiva de exclusão ou interrupção pode deixar órfãos.
Após commit, falha de exclusão retorna 503 conservando a foto nova.
Fotos antigas externas permanecem sob gestão dos serviços originais.
