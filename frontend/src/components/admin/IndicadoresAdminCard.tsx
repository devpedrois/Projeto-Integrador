"use client";

import type { IndicadoresAdminService } from "@/services/contracts/indicadores-admin.contract";
import { useIndicadoresAdmin } from "@/hooks/use-indicadores-admin";
import { formatarMoedaDecimal } from "@/utils/formatar-moeda-decimal";
import { BOTAO_SECUNDARIO_PEQUENO } from "@/components/formulario/estilos-botao";

const FORMATADOR_DATA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Recife",
});
const FORMATADOR_CONTADOR = new Intl.NumberFormat("pt-BR");

export function IndicadoresAdminCard({
  service,
}: {
  service: IndicadoresAdminService;
}) {
  const { estado, recarregar } = useIndicadoresAdmin(service);
  return (
    <section
      aria-label="Indicadores da plataforma"
      className="min-w-0 rounded-card border border-border-subtle bg-surface-card p-5 shadow-sm md:p-6"
    >
      <h2 className="m-0 font-display text-xl font-semibold text-fg-strong">
        Indicadores da plataforma
      </h2>
      {estado.status === "carregando" ? (
        <p role="status" className="mb-0 mt-4 text-sm text-fg-muted">
          Carregando indicadores…
        </p>
      ) : estado.status === "erro" ? (
        <div className="mt-4 flex flex-col items-start gap-3">
          <p role="alert" className="m-0 text-sm text-erro-700">
            Não foi possível carregar os indicadores.
          </p>
          <button
            type="button"
            className={BOTAO_SECUNDARIO_PEQUENO}
            onClick={recarregar}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {estado.status === "vazio" ? (
            <p className="mb-0 mt-4 text-sm text-fg-muted">
              Nenhuma atividade registrada ainda.
            </p>
          ) : null}
          <dl className="mb-0 mt-5 grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Artesãos ativos",
                FORMATADOR_CONTADOR.format(estado.dados.artesaosAtivos),
              ],
              [
                "Produtos ativos",
                FORMATADOR_CONTADOR.format(estado.dados.produtosAtivos),
              ],
              [
                "Pedidos confirmados",
                FORMATADOR_CONTADOR.format(estado.dados.pedidosConfirmados),
              ],
              [
                "Receita total",
                formatarMoedaDecimal(estado.dados.receitaTotal),
              ],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="min-w-0">
                <dt className="text-sm text-fg-muted">{rotulo}</dt>
                <dd className="m-0 mt-2 break-words font-display text-3xl font-semibold tabular-nums text-fg-strong">
                  {valor}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mb-0 mt-5 text-sm text-fg-muted">
            Atualizado em{" "}
            <time dateTime={estado.dados.atualizadoEm}>
              {FORMATADOR_DATA.format(new Date(estado.dados.atualizadoEm))}
            </time>
          </p>
        </>
      )}
    </section>
  );
}
