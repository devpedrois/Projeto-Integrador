import { randomUUID } from "node:crypto";
import { escapeIdentifier } from "pg";
import type { PoolClient } from "pg";
import { schemaName } from "../config/environment.js";

export class ExecucaoLoteRepository {
  private readonly tabela: string;

  constructor(
    private readonly client: PoolClient,
    schema: string,
  ) {
    this.tabela = `${escapeIdentifier(schemaName.parse(schema))}.execucao_lote`;
  }

  async iniciar(
    concorrencia: number,
    reforcoRegional: boolean,
  ): Promise<string> {
    const id = randomUUID();
    await this.client.query(
      `INSERT INTO ${this.tabela} (id,"iniciadoEm",concorrencia,"reforcoRegional") VALUES ($1,clock_timestamp(),$2,$3)`,
      [id, concorrencia, reforcoRegional],
    );
    return id;
  }

  async finalizar(
    id: string,
    produtosProcessados: number,
    duracaoMs: number,
    hashResultado: string,
  ): Promise<void> {
    await this.client.query(
      `UPDATE ${this.tabela} SET "finalizadoEm"=clock_timestamp(),"produtosProcessados"=$2,"duracaoMs"=$3,"hashResultado"=$4 WHERE id=$1`,
      [id, produtosProcessados, duracaoMs, hashResultado],
    );
  }

  async consultar(ids: string[]) {
    return (
      await this.client.query(
        `SELECT *,current_user AS "papelConsulta" FROM ${this.tabela} WHERE id=ANY($1::uuid[]) ORDER BY "iniciadoEm",id`,
        [ids],
      )
    ).rows as Record<string, unknown>[];
  }
}
