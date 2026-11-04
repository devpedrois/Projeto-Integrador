# Preparação dos providers

Vitest backend instalado: `5.0.0`.
Vitest frontend instalado: `2.1.9`.
Nenhum provider V8 estava inicialmente disponível.

A instalação direta backend encontrou erro interno do npm.
O erro foi `Cannot read properties of null (reading edgesOut)`.
O npm falhou ainda na construção da árvore ideal.
Nenhum teste foi executado por essa tentativa.

A instalação direta frontend alterou dependências transitivas locais.
`npm ci --ignore-scripts` restaurou integralmente seu lock antes das suítes.
Não foram alterados manifests nem arquivos lock rastreados.

As instalações passaram dentro de dois diretórios `.runtime` isolados.
As tentativas usando prefix relativo tinham falhado por ENOENT.
Executar npm diretamente em cada diretório resolveu a preparação.
`--legacy-peer-deps` impediu instalar outro Vitest nesse runtime.
`--ignore-scripts` impediu hooks adicionais de instalação.
Quatro junctions conectam providers e os respectivos Vitest originais.

Versões finais:

| Projeto  | Vitest | Provider V8 |
| -------- | ------ | ----------- |
| Backend  | 5.0.0  | 5.0.0       |
| Frontend | 2.1.9  | 2.1.9       |

Os hashes produtivos estão registrados em `01-congelamento.json`.
Ambos providers foram carregados nas execuções reais de cobertura.
Os problemas de preparação foram resolvidos antes dessas execuções.
Não representam reprovações dos testes solicitados.
