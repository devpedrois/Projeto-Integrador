# 32.5: cabeçalhos de segurança

Validação local executada em 07/11/2026.
Branch: `codex/32-5-security-headers`.
Sem commit ou push nesta execução.
Publicação produtiva autorizada explicitamente durante a execução.

## Resultado local

- Build de produção Next.js 15.5.25 gerado com sucesso.
- API Express e PostgreSQL reais, sem repositories simulados.
- Schema temporário criado pelo helper existente e posteriormente removido.
- Vinte etapas concluídas entre 360 e 1280 pixels.
- Zero eventos `securitypolicyviolation` durante todos os fluxos.
- Zero mensagens de violação de CSP no console.
- Doze respostas documentais registradas com os quatro headers esperados.
- Checkout criou pedidos e apresentou a confirmação real.
- Upload multipart persistiu arquivo local e atualizou PostgreSQL.

Fluxos: vitrine, produto, login, carrinho, checkout e confirmação.
Também: painel artesão, prévia fotográfica, upload e painel administrativo.

Resultado: [JSON da navegação](9efbb144-7ebf-484d-85f4-e26dbc821ae3/resultado.json).
Headers e console: [captura do relatório](9efbb144-7ebf-484d-85f4-e26dbc821ae3/headers-console.png).
Imagens: [vitrine](9efbb144-7ebf-484d-85f4-e26dbc821ae3/1280-vitrine.png),
[checkout](9efbb144-7ebf-484d-85f4-e26dbc821ae3/1280-checkout.png),
[prévia](9efbb144-7ebf-484d-85f4-e26dbc821ae3/1280-foto-previa.png),
[upload](9efbb144-7ebf-484d-85f4-e26dbc821ae3/1280-foto-enviada.png),
[admin](9efbb144-7ebf-484d-85f4-e26dbc821ae3/1280-admin.png).

O console registra respostas 401 esperadas durante sessões anônimas.
Também registra um 404; nenhuma mensagem representa bloqueio CSP.
Não alegamos console sem quaisquer erros HTTP.

## Inspeção e exceções

Os rewrites `/api/docs/` e `/api/:path*` foram preservados.
O navegador chama apenas `/api`, na mesma origem.
O backend continua usando `helmet()` antes das rotas.
Catálogo e retratos sintéticos usam arquivos de `public/`.
O catálogo público usa exclusivamente o domínio Blob identificado.
Fonte: [origens públicas consultadas](origens-producao.json).
Figtree e Playfair Display são publicadas pelo `next/font`.
Não foram encontrados scripts externos na interface.

Exceções justificadas:

- `script-src 'unsafe-inline'`: hidratação e payloads inline do Next.
  Preserva páginas estáticas; nonces exigiriam renderização dinâmica.
  Permitir inline reduz a proteção contra injeção inline.
- `style-src 'unsafe-inline'`: compatibilidade com estilos Next e React.
  O anunciador de rotas do Next define estilos inline.
- `img-src data:`: imagens embutidas solicitadas na política.
- `img-src blob:`: URLs temporárias da prévia de foto.
- `img-src https://peqzo3marpkt7bsh.public.blob.vercel-storage.com`: store público utilizado.
  A origem exata foi conferida no catálogo publicado.
- `script-src 'unsafe-eval'`: somente em desenvolvimento, para ferramentas Next.
  Ausente na configuração e nas respostas do build produtivo.

## Headers HTTP adicionais

[Respostas HTTP](headers-http.json) incluem páginas, 404 e redirecionamento protegido.
`/api/health` conserva os headers enviados pelo Helmet do backend.
Esse proxy recebe `Referrer-Policy: no-referrer` e CSP própria.
Não recebe `Permissions-Policy` da configuração do frontend.
O fechamento da 32.5 cobre os documentos da interface.
Não altera políticas do Express, conforme escopo solicitado.

## TDD e verificações

Primeiro, três testes falharam porque `headers()` estava ausente.
Após implementação, os três testes passaram repetidamente.
Restringir ao host Blob exato repetiu o ciclo vermelho/verde.
O teste lê `next.config.ts`, sem pesquisar texto-fonte.
Confere cada header, diretivas e diferença entre desenvolvimento/produção.

Comandos frontend:

```powershell
npm test
npm test -- tests/config/docs-proxy.test.ts
npm test -- tests/config/security-headers.test.ts
npm run lint
npm run typecheck
$env:BACKEND_URL='http://127.0.0.1:3415'
$env:NEXT_PUBLIC_DATA_SOURCE='http'
npm run build
```

A suíte completa passou 1029 testes inicialmente.
Dois testes do proxy falharam com `connect EACCES`.
Ambos passaram na repetição com rede local autorizada.
A repetição completa passou os 1031 testes, em 110 arquivos.
Log final: [suíte frontend](frontend-suite-final.txt).
Lint e typecheck frontend passaram.
Typecheck backend e lint do roteiro também passaram.
Prettier e `git diff --check` passaram.
Build final: [log produtivo](build-final.txt).
Navegação final: [log dos fluxos](navegacao-final.txt).
O build conserva o aviso existente sobre ESLint Next.
A suíte conserva um aviso React sobre `act`.

## Reprodução da navegação

Requer `backend/.env` local, ignorado, com `DIRECT_URL` de desenvolvimento.
O helper existente cria schema isolado, executando migrations reais.
Não aponta o roteiro para ambiente produtivo.
Primeiro gere o build usando as variáveis acima.
Libere as portas locais 3115 e 3415.
Depois execute dentro de `backend/`:

```powershell
node --import tsx scripts/security-headers.evidence.mjs
```

Opcional: configure `E2E_CHROMIUM_EXECUTABLE_PATH` para outro Chromium instalado.
O padrão local utiliza o Chrome instalado no Windows.
O roteiro coleta eventos CSP e mensagens desde o carregamento.
Não intercepta respostas de API nem simula PostgreSQL.
Usa autenticação real, dados sintéticos e usuários do seed.
Arquivos de upload ficam em `.audit-private`, ignorados pelo Git.
O bloco final encerra servidores e remove o schema.

Tentativas anteriores preservadas para rastreabilidade:

- `caaf4c49-250d-4e38-a9f0-fc56ae4c9d21`: seletor exigia região exclusiva da busca.
- `904d7ea8-20ad-498d-aae2-3ad247e5bc6a`: espera inicial insuficiente no roteiro.

Ambas falharam antes da navegação completa, sem violações CSP.
O roteiro corrigido completou a execução identificada acima.

## Revisão equivalente de segurança

Revisão realizada neste chat, conforme escolha explícita do responsável.
Não houve delegação ao `security-auditor`.

- A alteração não muda autenticação, papéis ou autorização.
- O token Blob permanece exclusivo do backend.
- Nenhuma credencial, cookie ou corpo de login foi registrado.
- Fontes e conexões não recebem autorização HTTPS genérica.
- Objetos, frames e incorporação da interface são bloqueados.
- Base e formulários permanecem restritos à origem própria.
- Câmera, microfone, localização e pagamentos ficam desabilitados.
- Upload por seletor de arquivos continuou funcionando.
- CSP não substitui validação, transações ou autorização do backend.
- SQL, estoque e processamento da fila não foram alterados.

Risco residual: execução inline permitida para compatibilidade Next.
Está registrado no documento de segurança atualizado.
L2/L6 foram descartados, sem inventar vulnerabilidades ou correções.

## Publicação e aceite produtivo

O checkout não contém `BLOB_READ_WRITE_TOKEN` configurado.
O teste local comprova prévia, multipart, persistência e renderização same-origin.
O teste público também exercitou o Vercel Blob real.
Os uploads retornaram 200 em ambos os tamanhos.
As novas fotos carregaram pelo domínio explicitamente permitido.

Produção: [Origem](https://origem-marketplace.vercel.app/).
Deployment: `dpl_5TykqzWSVXL96KJKkCWc2zeikCR9`, status `Ready`.
[Inspeção Vercel](https://vercel.com/dev-pedrois/origem-marketplace/5TykqzWSVXL96KJKkCWc2zeikCR9).
O domínio principal recebeu o deployment publicado por CLI.
Não houve commit ou push para realizar essa publicação.

O pacote foi conferido via `deploy --dry --json`.
A simulação inicial revelou arquivos privados e evidências extras.
Nenhum desses arquivos foi enviado à Vercel.
`.vercelignore` passou a permitir somente o frontend necessário.
O pacote final possui 198 arquivos, totalizando 847306 bytes.
Os testes da lista comprovaram ausência de arquivos `.env`.
Também comprovaram presença das configurações e fontes necessárias.
Resumo: [pacote validado](pacote-deploy.json).
Referência: [exclusões Vercel](https://vercel.com/docs/deployments/vercel-ignore).

Uma primeira tentativa usou filtragem incorreta, sem arquivos.
Deployment: `dpl_DjD5oMpgQbSUutzN1McxqPss77sq`, status `Error`.
A filtragem foi corrigida e conferida antes da repetição.
O deployment válido foi confirmado por inspeção e HTTP público.

Os quatro headers aparecem em oito verificações HTTP públicas.
Inclui arquivo SVG, erro 404 e redirecionamentos sem sessão.
Prova: [headers públicos](producao-headers.json).

A navegação pública completou dezoito etapas em 360/1280 pixels.
Foram zero eventos e zero mensagens de violação CSP.
As contas utilizadas para cadastro e upload são sintéticas exclusivas.
Permaneceram quatro contas de validação e dois carrinhos sintéticos.
Nenhum pedido produtivo foi confirmado nessa verificação.
Não houve alteração de contas existentes, estoque ou pagamentos.
O login administrativo foi usado somente para leitura.

Resultado: [navegação pública](producao/4c84aec3-4a20-4aee-8047-f18d4a64b94f/resultado.json).
Headers e console: [captura pública](producao/4c84aec3-4a20-4aee-8047-f18d4a64b94f/headers-console.png).
Log: [execução pública](producao-navegacao.txt).
Imagens: [vitrine](producao/4c84aec3-4a20-4aee-8047-f18d4a64b94f/1280-vitrine.png),
[checkout](producao/4c84aec3-4a20-4aee-8047-f18d4a64b94f/1280-checkout.png),
[foto no Blob](producao/4c84aec3-4a20-4aee-8047-f18d4a64b94f/1280-foto-enviada.png),
[admin](producao/4c84aec3-4a20-4aee-8047-f18d4a64b94f/1280-admin.png).

Reprodução pública, dentro de `frontend/`:

```powershell
node e2e/security-headers-production.evidence.mjs
```

Esse roteiro cria novas contas sintéticas e envia novas fotos.
Não executa limpeza destrutiva de dados produtivos.
