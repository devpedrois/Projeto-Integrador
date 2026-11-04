# IA.2: peças relacionadas no detalhe

Data: 25/10/2026. Responsável: Eliziane. Revisor indicado: Pedro.
Branch: `codex/ia2-carrossel-relacionados`.

## Resultado

O carrossel existente foi preservado.
O hook exclui o produto atual antes de limitar.
Exibe até oito itens, preservando a ordenação recebida.
Uma resposta contendo somente o produto atual produz vazio.
O erro oferece uma nova tentativa explícita.
A nova tentativa consulta o mesmo service e contexto.
O detalhe continua visível durante loading e erro.
Não foi implementado o fallback T10.3.

## TDD e validações

- `red.txt`: seis falhas esperadas e trinta testes aprovados.
- `green.txt`: 36 testes direcionados aprovados, em três arquivos.
- `frontend-testes.txt`: 942 testes aprovados, em cem arquivos.
- `frontend-lint.txt`: lint aprovado.
- `frontend-typecheck.txt`: typecheck aprovado.
- `formatacao.txt`: Prettier aprovado nos arquivos alterados de código.
- `revisao-seguranca.md`: revisão equivalente autorizada nesta conversa.

Foram adicionados sete casos ao teste de componente existente.
O caso de erro passou a verificar recuperação real.
Há resposta excedente com doze itens e ordem conferida.
O produto atual aparece nas posições zero, quatro e dez.
Também há loading e duas respostas consideradas vazias.
Os doubles são de services, sem mocks de repositories.

## Capturas HTTP reais

Frontend Next.js local, selecionado explicitamente em modo HTTP.
API Express local, consultando PostgreSQL Neon real.
Seed oficial sintético, aplicado somente em schema temporário.
Nenhuma resposta foi interceptada ou substituída no navegador.

| Captura | Produto aberto | Categoria | Relacionados |
|---|---|---|---:|
| `produto-1-network.png` | Pulseira em Miçangas | Bijuteria e Acessórios Artesanais | 5 |
| `produto-2-network.png` | Boneca de Barro Pintada | Cerâmica e Barro | 5 |
| `produto-3-network.png` | Colher de Pau Esculpida | Madeira Entalhada e Marcenaria Artesanal | 5 |

As capturas incluem Network instrumentado pelo Playwright.
O painel identifica explicitamente essa instrumentação visual.
Ele apresenta método, URL pública e status realmente observados.
Não representa a interface nativa do Chrome DevTools.
`network.json` preserva as requisições observadas.
`smoke.json` preserva respostas, itens exibidos e categorias.
Nos três casos, a resposta conferiu com o carrossel.
Não houve repetição do produto atual ou erros JavaScript.

O backend já limita a oito itens normalmente.
O cenário excedente foi validado pelo teste de componente.
Ele não foi forçado ou fabricado nas capturas HTTP.

A responsividade passou em 360, 768 e 1280 pixels.
Os cards mantiveram 260 pixels, sem estouro horizontal da página.
Essas larguras foram verificadas nos três produtos.

## Reprodução

Requer Node, Chrome instalado e dependências dos projetos.
O PostgreSQL deve estar configurado no ambiente backend.
O caminho Playwright está explícito no script desta máquina.
As portas locais utilizadas são 3102 e 4102.

Na raiz do repositório:

```powershell
cd backend
node node_modules/tsx/dist/cli.mjs ../evidencias/IA.2/capturar-http.mjs
```

O script cria o schema, carrega o seed e inicia os servidores.
Seleciona o acesso visitante e captura três categorias distintas.
Ao terminar, encerra os processos e remove seu schema.
Uma conexão independente confirma a ausência desse schema.
Os arquivos gerados contêm somente dados públicos sintéticos.

## Limpeza e limites

`limpeza.json` confirma a remoção do schema da execução final.
`schema-captura.json` registra o nome criado pela execução final.
`smoke-final-log.txt` registra a execução concluída.

A primeira tentativa restrita falhou por resolução DNS.
O log dessa tentativa está em `smoke-log.txt`.
A primeira execução com acesso externo aguardou o modo visitante.
Seu helper inicial não removeu o schema pelo rollback.
`smoke-real-log.txt` preserva a falha da checagem de limpeza.
O schema foi identificado pelos horários exatos dos carrinhos sintéticos.
Sua remoção foi conferida em `limpeza-primeira-tentativa.json`.
A execução final usou o helper existente com remoção explícita.
Nenhum helper ou migration backend foi alterado nesta subtarefa.

Os logs incluem avisos existentes de React e conexão PostgreSQL.
As validações automatizadas abrangem a suíte frontend completa.
O backend real foi exercitado pelas chamadas HTTP do smoke.
Não houve deploy, commit ou push.
A pasta `evidencias/` permanece ignorada pelo Git do projeto.
