# Revisão equivalente de segurança: 35.1

Data: 04/11/2026.
O responsável escolheu revisão equivalente nesta conversa.
O agente security-auditor não foi delegado por essa escolha.

## Fronteiras revisadas

- Zod valida UUIDs, limites, campos extras e configuração.
- Falhas de configuração imprimem somente nomes de variáveis.
- Autenticação precede interpretação do JSON nas rotas protegidas.
- Tokens são reduzidos a hashes SHA-256 de tamanho fixo.
- A comparação usa timingSafeEqual e nunca ecoa entradas.
- Helmet está ativo e o JSON tem limite de 4 KiB.
- Falhas de PostgreSQL e HTTP não retornam detalhes internos.
- O repository consulta somente as duas views contratadas.
- Valores SQL são parâmetros; identificadores usam escapeIdentifier.
- Senhas de papéis usam escapeLiteral no bootstrap administrativo.
- O runtime não recebe BOOTSTRAP_DATABASE_URL no arquivo local.
- Papéis privilegiados ou com herança são recusados pelo bootstrap.
- Privilégios antigos do microsserviço são revogados antes dos grants.
- Acesso residual via PUBLIC ou propriedade causa falha transacional.
- O schema privado revoga acessos de PUBLIC e da API.
- Migrations privadas exigem o proprietário do schema.
- Advisory locks e checksums protegem a aplicação das migrations.

## Verificações reais

Os testes usam PostgreSQL, sem mocks de repositories.
O papel do microsserviço lê ambas as views.
SELECT, INSERT e UPDATE nas tabelas de domínio são negados.
O papel do microsserviço insere em execucao_lote.
O papel da API não lê essa tabela privada.
O papel da API também não pode assumir o papel do microsserviço.
O bootstrap rejeita papéis administrativos como runtime.
As verificações cobrem reaplicação e permissões antigas por coluna.
O SQL manual equivalente também foi executado em transação revertida.

A API local usa origem_api_app, sem privilégios administrativos.
Seu health, suas recomendações e o pg-boss foram verificados.
A transferência da fila foi expressamente autorizada e preservou dados.
As senhas reais foram gravadas apenas nos arquivos .env ignorados.
A varredura dos arquivos versionáveis não encontrou essas credenciais.
O npm audit de runtime reportou zero vulnerabilidades.

## Limites

A conexão administrativa permanece capaz de administrar os dois serviços.
Ela não deve ser usada como conexão de runtime.
A configuração local não modifica variáveis do Render ou GitHub.
Nenhuma mudança foi publicada nesta revisão.
O CI remoto depende da publicação autorizada da branch.
O teste do SQL manual validou o bloco PostgreSQL executável.
O cliente psql não estava instalado para validar suas metacommands.

Resultado: nenhuma pendência de segurança identificada no escopo revisado.
