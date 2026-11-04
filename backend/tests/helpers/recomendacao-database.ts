import { criarBancoAuth } from "./auth-database.js";
import { iniciarRecomendacao } from "../../scripts/helpers/recomendacao-runtime.js";
import { HttpRecomendacaoClient } from "../../src/integrations/recommendation/http-recomendacao.client.js";

export async function criarBancoRecomendacao() {
  const banco = await criarBancoAuth();
  try {
    const micro = await iniciarRecomendacao({
      databaseUrl: process.env.DIRECT_URL as string,
      apiSchema: banco.schema,
      ...(process.env.RECOMENDACAO_SERVICE_TOKEN
        ? { token: process.env.RECOMENDACAO_SERVICE_TOKEN }
        : {}),
    });
    return {
      ...banco,
      micro,
      environment: micro.environment,
      client: new HttpRecomendacaoClient(micro.environment),
      async fechar() {
        try {
          await micro.parar();
        } finally {
          await banco.fechar();
        }
      },
    };
  } catch (error) {
    await banco.fechar();
    throw error;
  }
}
