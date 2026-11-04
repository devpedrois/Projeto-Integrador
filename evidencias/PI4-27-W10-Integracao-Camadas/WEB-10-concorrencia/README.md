# WEB-10: concorrencia autenticada

Executado em 14/10/2026 na branch codex/web-10-concorrencia-checkout.
Aplicacao Express real e PostgreSQL real em schema temporario.
Nenhum banco ou repository foi mockado.

## Comando unico

Na raiz do repositorio:

```powershell
npm --prefix backend run test:concorrencia
```

O script configura o servidor local e prepara seus dados.
Usa DATABASE_URL e DIRECT_URL da mesma branch Neon de teste.
O padrao cria 50 compradores via POST /auth/register.
Emails: concorrencia+1@origem.test ate concorrencia+50@origem.test.
Cada conta faz POST /auth/login e usa seu proprio cookie.
Cookies e senhas ficam em memoria e nao aparecem nesta evidencia.

## Saida real

Arquivo: saida-3-rodadas.txt. Exit code: exit-code.txt.

| Rodada | Sucessos 201 | Conflitos 409 | Estoque final | Pedidos do produto |
|---|---:|---:|---:|---:|
| 1 | 1 | 49 | 0 | 1 |
| 2 | 1 | 49 | 0 | 1 |
| 3 | 1 | 49 | 0 | 1 |

N requisicoes de compradores distintos usam Promise.all em cada rodada.
Cada produto e criado com estoque zero e atualizado para um.
O body leva somente itens; identidade vem da sessao validada.
Estoque final e pedidos do produto sao consultados por SELECT.
O resumo confirmou 50 cadastros e 50 logins reais.
O comando terminou com exit code zero e schemaRemovido true.

conferir-saida.mjs validou a saida e consultou information_schema.schemata.
O schema da execucao nao existia depois do comando.
resultado.json guarda as metricas e essa verificacao real de limpeza.
O encerramento remove todos os dados sinteticos e fecha o servidor.

## Testes adicionais

Os testes do CLI conferem tres rodadas com cinco compradores.
Rejeitam N invalido, production e a base identificada como deploy.
O teste da porta ocupada confirma exit code 1 e limpeza do schema.
O teste de limpeza consulta somente o schema da propria execucao.
Os testes de metricas reprovam sucesso duplicado, estoque negativo,
estoque restante, conflitos incorretos e contagem incorreta de pedidos.
18 testes novos passaram na rodada direcionada.

## Revisao equivalente de seguranca

Mantida nesta conversa conforme escolha previa do usuario.
Revisados argumentos, ambiente, SQL, autenticacao, saida e limpeza.

- Inputs CLI possuem limites numericos antes da conexao.
- Production e a base de deploy sao recusados.
- URLs invalidas recebem mensagens com nomes de variaveis somente.
- O servidor escuta exclusivamente em loopback.
- JWT usa segredo efemero; cadastro e login usam rotas reais.
- Nenhuma senha, hash, cookie ou URL aparece na saida.
- SELECT do produto usa parametro SQL.
- Nomes de schemas sao gerados internamente, sem input externo.
- DROP SCHEMA atua somente sobre o schema criado pela execucao.
- Finalmente fecha servidor e banco, incluindo falha de inicializacao.

Nao foram encontrados achados restantes no escopo revisado.
Nenhuma rota, repository, schema de dominio ou worker foi alterado.
O helper usa dez conexoes e esperas de transacao de 60 segundos.
Esses limites pertencem somente ao cliente do benchmark.
Os locks de producao permanecem inalterados.

## Documentacao

CONCURRENCY.md foi atualizado com comando, parametros e invariantes.
O roteiro docs/apresentacao-fccpd/03-roteiro-testes-evidencias.md nao existia.
Esse arquivo foi criado com o procedimento validado.
Os documentos auxiliares e evidencias seguem ignorados pelo Git existente.
Nao houve commit, push ou deploy.

## Verificacao final

- Suite backend completa: 412 testes em 43 arquivos passaram.
- Lint e typecheck backend passaram.
- Prettier e verificacao de espacos do diff passaram.
- Saida do comando unico: tres rodadas aprovadas com 50 compradores.
- Limpeza: schema ausente em SELECT real apos o encerramento.
- Revisao equivalente: sem achados restantes no escopo.

O aviso SSL preexistente do pg permanece na saida bruta.
resumo-3-rodadas.png apresenta as metricas lidas de resultado.json.
E um resumo visual da saida real, sem representar captura nativa do terminal.
