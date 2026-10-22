# Logins de teste (seed sintetico)

> Credenciais sinteticas da Fake API e do seed demo do backend.
> Nao sao dados reais. Nao usar fora de ambiente local de desenvolvimento.

| Papel | Email | Senha |
|---|---|---|
| Comprador | ana.compradora@origem.test | senha-sintetica-comprador |
| Comprador | bruno.comprador@origem.test | senha-sintetica-comprador-02 |
| Artesao | joao.artesao@origem.test | senha-sintetica-artesao |
| Artesao | maria.artesa@origem.test | senha-sintetica-artesao-02 |
| Admin | admin@origem.test | senha-sintetica-admin |

## Seed backend BD-05

Execute `npm run db:seed` em `backend/` apos as migrations.
As cinco contas recebem hash bcrypt de custo 10.
O seed usa upsert e pode ser repetido sem duplicacao.
IDs frontais textuais recebem UUIDs determinísticos no backend.
UUIDs validos existentes sao preservados.
Maria permanece com perfil incompleto e `regiaoId` nulo,
pois a Fake API nao informa sua regiao.
As fotos conservam os caminhos relativos do frontend.

O volume usa exclusivamente uma branch de teste do Neon.
Configure `DATABASE_URL` dessa branch e `ALLOW_VOLUME_SEED=1`.
Configure `DATABASE_URL_DEPLOY` para bloquear tambem o endpoint do deploy.
Execute `npm run db:seed:volume`.
O script rejeita o deploy, inclusive sua variante com pooler.
O seed nao apaga registros preexistentes.
Contagens totais esperadas pressupõem uma base limpa.
Nunca registre senhas, hashes ou URLs nas evidencias.

## Roteiro de teste manual das rotas protegidas

1. Aba anonima (sem sessao) em `/painel-artesao`, `/admin`, `/minha-conta`.
   Cada uma deve redirecionar para `/login?redirect=<rota>`.
2. Logar como comprador. Tentar `/painel-artesao` e `/admin` na URL.
   Ambas devem mostrar "Acesso negado". `/minha-conta` deve abrir.
3. Logar como artesao. `/painel-artesao` abre. `/admin` nega.
4. Logar como admin. `/admin` abre.
5. Recarregar (F5) em rota protegida logado. Nao pode piscar tela
   protegida nem deslogar.
