# Pendências de segurança para a AV2

Atualizado pela subtarefa 32.5, em 07/11/2026.

## Itens encerrados

- **L2: descartado por falta de contexto verificável.**
  O registro anterior continha somente um marcador vazio.
  A busca documental não encontrou descrição, impacto ou reprodução.
  O descarte não comprova correção de vulnerabilidade desconhecida.
  Evidências futuras exigem novo registro, com reprodução identificável.
- **L6: descartado por falta de contexto verificável.**
  Também não possui descrição recuperável nos documentos consultados.
  Aplicam-se a mesma limitação e condição de reabertura.
- **CSP e headers: implementação resolvida no frontend.**
  `frontend/next.config.ts` aplica `headers()` globalmente, inclusive arquivos estáticos.
  Inclui CSP efetiva, `nosniff`, referência restrita e permissões bloqueadas.
  O backend já aplica `helmet()` antes das rotas.
  Nenhuma alteração no backend foi necessária nesta subtarefa.
  Publicação e navegação produtiva também foram verificadas.

## Política e exceções

| Diretiva                                     | Valor e justificativa                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `default-src`                                | `'self'`: origem própria como padrão.                                         |
| `script-src`                                 | `'self' 'unsafe-inline'`: hidratação e payloads inline do Next.               |
| `style-src`                                  | `'self' 'unsafe-inline'`: estilos gerados pelo Next e React.                  |
| `img-src`                                    | `'self' data: blob: https://peqzo3marpkt7bsh.public.blob.vercel-storage.com`. |
| `connect-src`                                | `'self'`: chamadas passam pelo proxy `/api`.                                  |
| `font-src`                                   | `'self'`: `next/font` publica as fontes localmente.                           |
| `object-src`, `frame-src`, `frame-ancestors` | `'none'`: objetos, frames e incorporação bloqueados.                          |
| `base-uri`, `form-action`                    | `'self'`: base e formulários restritos à origem.                              |

`data:` permite imagens embutidas; `blob:` mantém a prévia fotográfica.
O upload envia multipart ao `/api`, sem conexão externa direta.
O domínio Blob exato foi confirmado pelo catálogo público.
Evidência: [origens atuais](../evidencias/PI4-32/32.5-headers/origens-producao.json).
O seed local usa imagens em `public/`.
O catálogo publicado usa o store Blob explicitamente permitido.
Não foram encontrados scripts externos no código da interface.
Figtree e Playfair Display são baixadas durante o build.
O navegador recebe essas fontes pela própria aplicação.

Scripts inline são necessários para preservar a geração estática.
Essa exceção reduz a proteção contra injeção inline.
Nonces exigiriam renderização dinâmica e mudanças fora desta subtarefa.
Não foram adicionados domínios genéricos HTTPS ou scripts terceiros.
`unsafe-eval` existe somente com `NODE_ENV=development`, para ferramentas Next.
O build de produção não autoriza `unsafe-eval`.
Referência: [CSP sem nonces no Next](https://nextjs.org/docs/app/guides/content-security-policy#without-nonces).

`X-Content-Type-Options` recebe `nosniff`.
`Referrer-Policy` recebe `strict-origin-when-cross-origin`.
`Permissions-Policy` bloqueia câmera, microfone, localização, pagamento e USB.
Também bloqueia captura de tela e tela cheia.
Selecionar arquivos locais continua permitido pelo navegador.

## Validação e publicação

Evidências e reprodução: [32.5](../evidencias/PI4-32/32.5-headers/README.md).
Deploy produtivo: `dpl_5TykqzWSVXL96KJKkCWc2zeikCR9`, em 07/11/2026.
Site: [Origem](https://origem-marketplace.vercel.app/).
Os quatro headers foram confirmados no endereço publicado.
Inclui páginas, arquivo estático, erro 404 e redirecionamentos protegidos.
Navegação em 360/1280 pixels registrou zero violações CSP.
Os dois uploads produtivos retornaram 200, com imagens carregadas.
O checkout local continua sem token Blob configurado.
A validação local usa disco; a pública exercitou Blob real.

## Demais registros anteriores

- **Hash de senha no backend:** o campo `senhaHash` já existe no schema Prisma; o cadastro real deve gerar o hash com bcrypt ou argon2 e nunca persistir nem trafegar a senha em texto puro.
