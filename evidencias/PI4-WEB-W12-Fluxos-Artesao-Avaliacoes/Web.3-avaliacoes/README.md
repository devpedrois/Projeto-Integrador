# Web.3: avaliações de produto

Responsável: Luiz Rocha. Revisor informado: Pedro.
Branch: `codex/web3-product-reviews`.
Data: 22/10/2026.

## Evidências

| Arquivo | O que comprova |
|---|---|
| `backend-testes.txt` | Suíte completa do backend com PostgreSQL real |
| `frontend-testes.txt` | Suíte completa do frontend |
| `01-formulario-desktop.jpg` | Formulário por item no pedido confirmado |
| `02-validacao-sem-nota.jpg` | Bloqueio de envio sem nota |
| `03-avaliacao-sucesso.jpg` | Sucesso após POST real no site local |
| `04-duplicada-segunda-aba.jpg` | Mensagem após tentativa duplicada em outra aba |
| `05-mobile-360.jpg` | Layout móvel, com opções de nota quebrando linha |
| `06-tablet-768.jpg` | Layout em tablet |
| `07-desktop-1280.jpg` | Layout em desktop e estado já avaliado |
| `08-nota-media-produto.jpg` | Produto exibindo nota 5,0 e uma avaliação |
| `09-comentario-501.jpg` | Erro de comentário com 501 caracteres |
| `revisao-seguranca.md` | Revisão equivalente autorizada nesta conversa |
| `servidor-visual.mts` | Preparação reproduzível da API visual isolada |

As capturas são do Next.js real consumindo Express e PostgreSQL real.
Não houve interceptação de rede nem inserção de conteúdo no DOM.
Emails, nomes, senha de acesso e pedidos são sintéticos.
A senha e o cookie não aparecem nas capturas.
Esta é validação local, sem representar deploy publicado.

## TDD e validações

Os 17 testes de integração foram escritos antes da API.
A execução inicial confirmou a rota ausente retornando 404.
Após implementar, os 17 testes passaram no PostgreSQL real.

Testes de validator, adapter e formulário precederam o frontend.
Confirmaram métodos e formulário ausentes antes da implementação.
Depois, os 30 testes novos passaram.
A revisão adicionou um caso de UUID aceito somente pelo cliente.
O teste reproduziu a diferença antes da correção de paridade.
A suíte completa do frontend passou com 874 testes em 92 arquivos.
O backend passou com 647 testes em 61 arquivos.
Dois stubs antigos foram ajustados para incluir o novo service.

Lint, typecheck e Prettier passaram nos dois projetos.
O teste de OpenAPI precedeu a documentação e detectou sua ausência.
As suítes completas são preservadas nos logs desta pasta.
Avisos existentes de pg e React act aparecem nesses logs.

## Conferência visual

Uma compradora sintética acessou um pedido confirmado com dois produtos.
Enviar sem nota mostrou a validação, sem criar avaliação.
Uma segunda aba abriu esse mesmo pedido antes da primeira avaliação.
A primeira aba enviou nota 5 e recebeu sucesso.
A segunda aba tentou avaliar novamente e mostrou “já avaliou”.
O detalhe público exibiu nota 5,0 e uma avaliação.
Um comentário de 501 caracteres mostrou o erro de tamanho.

| Viewport solicitado | Largura útil | Largura do documento |
|---|---:|---:|
| 360px | 345px | 345px |
| 768px | 753px | 753px |
| 1280px | 1265px | 1265px |

Os 15px de diferença correspondem à barra vertical.
Não houve rolagem horizontal nas três larguras.
O viewport temporário foi restaurado ao padrão.

## Reprodução

Dentro de `backend/`, com DIRECT_URL local configurada:

```powershell
node node_modules/tsx/dist/cli.mjs ../evidencias/PI4-WEB-W12-Fluxos-Artesao-Avaliacoes/Web.3-avaliacoes/servidor-visual.mts
```

Em outro terminal, dentro de `frontend/`:

```powershell
$env:BACKEND_URL='http://127.0.0.1:3333'
$env:NEXT_PUBLIC_DATA_SOURCE='http'
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000
```

Conta sintética exclusiva desse schema:
`web3-compradora@teste.origem`, senha `SenhaSinteticaWeb3!`.
Acesse Minha conta, abra o pedido e avalie um item.
Ctrl+C na API fecha o servidor e remove seu schema temporário.

API.md e CLAUDE.md foram atualizados localmente, permanecendo ignorados.
A regra de compra verificada pertence à Web.4, commit 09.
Não houve deploy, commit ou push nesta entrega.
Os servidores visuais foram encerrados; seu schema foi removido.
