# Revisao equivalente de seguranca WEB-06

Data: 14/10/2026. Revisao realizada nesta conversa.
Pedro escolheu revisao equivalente, sem delegar security-auditor.

Foram revisados validators, repository, mapper, controller, rotas,
adapters HTTP, container e respostas reais do navegador.

| Controle | Evidencia |
|---|---|
| Inputs externos estritos | Zod rejeita UUIDs invalidos, IDs textuais malformados, extras, repeticoes e paginacao abusiva |
| SQL parametrizado | SQL_CATALOGO e uma constante; valores usam parametros posicionais, sem concatenacao de SQL |
| Busca literal | Escape de percentual, underscore e barra; tentativa de SQL injection retorna vazio |
| Visibilidade uniforme | Produto ativo, nao moderado, estoque positivo e artesao ativo no mesmo WHERE |
| Ocultacao de existencia | Ocultos e inexistentes devolvem o mesmo 404 sanitizado |
| Dados minimos | Mapper ProdutoDTO e select de avaliacoes/opcoes nao retornam email ou senhaHash |
| Cache | Leituras publicas usam no-store para evitar produto moderado em cache |
| Fronteira HTTP | Respostas desconhecidas recebem validacao antes de chegar aos hooks |
| Sem fallback local | Container HTTP nao consulta dados sinteticos locais |
| Escritas futuras | Mutacoes e listagem privada continuam explicitamente pendentes |
| Evidencias | Dados sinteticos, IDs temporarios e localhost; nenhum token, cookie ou URL de banco |

O teste inicial de cache falhou antes da implementacao.
A correcao adicionou no-store e o teste passou.
Os testes reais verificaram moderacao, estoque e artesao inativo.
O navegador comprovou ocultacao imediata e detalhe indisponivel.
Nenhum achado impeditivo identificado no escopo WEB-06.
