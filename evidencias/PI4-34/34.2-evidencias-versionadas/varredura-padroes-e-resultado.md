# 34.2: padrões procurados e resultados

Data da auditoria: 04/11/2026.

Os padrões abaixo descrevem a busca realizada.
As partes são separadas para evitar falsos positivos documentais.
Nenhum valor de credencial integra este relatório.

| Categoria | Padrão procurado |
|---|---|
| Conexões PostgreSQL | `postgres` ou `postgresql`, seguidos de `://`; inclui barras escapadas |
| JWT | Prefixo `eyJ` seguido de conteúdo Base64URL |
| Cookie de sessão | Nome `origem_sessao` seguido de `=` |
| Token de serviço | `X-Service` seguido de `-Token` |
| Token do Blob | `BLOB_READ_WRITE` seguido de `_TOKEN` |
| Senhas sintéticas | Valores extraídos dos seeds atuais, sem publicação das senhas |
| Campos de senha | Campos `senha` e `password` com valores preenchidos |
| Segredos locais conhecidos | Valores configurados localmente, comparados somente em memória |

## Resultados

- A busca inicial identificou 17 arquivos para anonimização.
- Essa contagem inclui exemplos e nomes de configurações.
- Os valores foram substituídos, preservando resultados e contagens.
- A varredura textual final não identificou ocorrências.
- A conferência dos arquivos preparados também ficou limpa.
- O OCR conferiu 281 imagens, sem erros de leitura.
- Um rótulo de configuração recebeu revisão visual.
- Seu valor estava oculto integralmente por pontos.
- A decisão está vinculada ao hash exato da imagem.

Os relatórios finais podem ser renovados após alterações documentais.
Suas contagens refletem os arquivos efetivamente conferidos.

## Relatórios

- [Achados anteriores](scan-before.json).
- [Anonimização realizada](sanitize.json).
- [Resultado textual final](scan-final.json).
- [Resultado dos arquivos preparados](scan-index.json).
- [Resultado do OCR](ocr-review.json).
- [Revisão visual documentada](image-reviews.json).
