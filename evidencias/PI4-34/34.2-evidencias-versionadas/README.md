# 34.2: evidências acessíveis fora da máquina

Execução local em 04/11/2026, fuso America/Sao_Paulo.
Branch: `codex/34-2-evidencias-versionadas`.
Base inicial: `619a815`.

## Arquivos desta subtarefa

- [Varredura, padrões procurados e resultados](varredura-padroes-e-resultado.md).
- [Tamanho adicionado](tamanho-adicionado.md).
- [Lista dos vídeos para anexar](videos-jira.md).
- [Pasta local com os 19 vídeos](videos-para-anexar/).

Os vídeos foram copiados, preservando seus caminhos originais.
As cópias permanecem ignoradas pelo Git.

## Seleção e tamanho

O inventário inicial encontrou 38.863 arquivos.
O total era 1.334.826.310 bytes, ou 1.272,99 MiB.
Cópias de dependências e builds formavam a maior parte.
A seleção não inclui essas cópias nem seus metadados.

Inventários:

- [Inventário inicial por pasta e extensão](inventory-before.json).
- [Inventário atualizado e tamanho elegível](inventory.json).
- [Tamanho preparado no índice](tamanho-adicionado.json).

O limite de conferência desta carga é 64 MiB.
A seleção preparada ocupa aproximadamente 50,04 MiB.
O crescimento observado dos objetos Git foi 34,34 MiB.
Metadados finais da auditoria acrescentam poucos KiB.
O staging foi conferido antes de qualquer commit.
Não houve commit, push, publicação ou anexo externo.

## Política aplicada

A regra ampla foi substituída por uma lista permitida.
Arquivos aceitos: md, txt, csv, json, sql, png e jpg.
Todos os demais formatos continuam ignorados na pasta.
Isso inclui vídeos, GIFs, arquivos compactados e traces.
Também ficam ignorados quaisquer arquivos de ambiente.

Exclusões explícitas preservam dependências, builds, checkouts e cobertura.
Relatórios HTML do Playwright também ficam excluídos.
Relatórios textuais resumidos e prints permanecem disponíveis.
Os arquivos locais excluídos não foram apagados.

Logs recebem cópias .txt, mantendo os originais locais .log.
Os rastreamentos antigos .log saem do índice, preservando arquivos.
Links Markdown foram atualizados quando a cópia correspondente existe.
Uma repetição não restaura credenciais em cópias já sanitizadas.
O [relatório de conversão](normalize.json) lista os caminhos correspondentes.
O [relatório de links](links.json) identifica os documentos corrigidos.

## Varredura textual

Foram conferidas conexões de banco, credenciais e cookies de sessão.
Também foram conferidos autenticação de serviço e armazenamento.
As senhas foram comparadas com os seeds sintéticos atuais.
Segredos configurados localmente foram pesquisados sem exibir seus valores.
Arquivos UTF-16 mantêm sua codificação durante a anonimização.
JSON válido permanece válido após a substituição.
Contagens, resultados e valores de medição foram preservados.

- [Achados antes da anonimização](scan-before.json).
- [Arquivos anonimizados e categorias](sanitize.json).
- [Varredura textual final](scan-final.json).
- [Varredura dos blobs efetivamente preparados no índice](scan-index.json).

Achados incluem marcadores e exemplos, além de valores.
Portanto, a contagem inicial não representa vazamentos confirmados.
Os relatórios de auditoria não registram os valores encontrados.

## Imagens

A verificação usou OCR local, sem envio de imagens.
Imagens grandes foram divididas em regiões sobrepostas, sem redução.
Imagens idênticas reutilizaram o resultado pelo hash de conteúdo.
A API utilizada é documentada pela [Microsoft](https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine.recognizeasync).

O [OCR inicial](ocr.json) inclui quatro ícones posteriormente excluídos.
A [conferência final](ocr-review.json) valida os hashes da seleção atual.
Foram encontradas somente palavras de um rótulo de configuração.
A inspeção visual confirmou o valor integralmente oculto por pontos.
A imagem original foi preservada, sem alteração visual.
Essa exceção é limitada ao arquivo, hash e categoria registrados.
Uma alteração da imagem invalida a revisão.
Tokens de sessão e conexões nunca recebem essa exceção.

A [revisão visual](image-reviews.json) registra essa decisão.
OCR reduz o risco, sem substituir inspeção de futuros prints.

## Vídeos para o Jira

Foram localizados 19 vídeos de evidência.
Nenhum GIF acima de 5 MiB integra os artefatos selecionáveis.
Os vídeos permanecem locais e fora do Git.
A relação identifica caminhos completos e tamanhos individuais.

- [Lista dos anexos](videos-jira.md).
- [Lista em CSV](videos-jira.csv).

Não houve envio automático ou anexo ao Jira.

## Verificação e reprodução

Os testes exercitam as regras reais de um repositório Git temporário.
Incluem formatos aceitos, ambientes, traces, cobertura e cópias de build.
Também incluem JSON aninhado, cookies e credenciais sintéticas.
Conferem UTF-16, logs idempotentes e revisão limitada pelo hash.

[Saída dos testes](testes.txt).

Resultado: 32 testes aprovados, sem falhas.
Varreduras textuais e do índice: zero ocorrências.
OCR: 281 imagens conferidas, sem credenciais identificadas.

```powershell
node --test scripts/evidence-audit.test.mjs
node scripts/evidence-audit.mjs inventory
node scripts/evidence-audit.mjs normalize
node scripts/evidence-audit.mjs sanitize
node scripts/evidence-audit.mjs scan
node scripts/evidence-audit.mjs ocr
node scripts/evidence-audit.mjs scan-index
```

O OCR exige Windows e acesso aos arquivos pelo runtime nativo.
`ocr-review` reutiliza o OCR salvo somente com hashes válidos.
A conferência do índice lê os blobs preparados, incluindo imagens.
Nenhum teste da aplicação precisou ser modificado nesta subtarefa.

Foi realizada revisão equivalente de segurança nesta conversa.
Ela seguiu a preferência já autorizada, sem delegação adicional.
