"use client";

import type { PedidosService } from "@/services/contracts/pedidos.contract";
import type { DetalhePedido, ResumoPedido, StatusPedido } from "@/types/pedido";
import { useMeusPedidos } from "@/hooks/use-meus-pedidos";
import { Icone } from "@/components/vitrine/Icone";
import { BOTAO_SECUNDARIO_PEQUENO } from "@/components/formulario/estilos-botao";
import { formatarMoeda } from "@/utils/formatar-moeda";

const ROTULOS: Record<StatusPedido, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};
const CORES: Record<StatusPedido, string> = {
  pendente: "bg-aviso-50 text-aviso-700",
  confirmado: "bg-sucesso-50 text-sucesso-700",
  cancelado: "bg-erro-50 text-erro-700",
};
const FORMATADOR_DATA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Recife",
});
function valor(value: number | null): string {
  return value === null ? "Não informado" : formatarMoeda(value);
}

function StatusDoPedido({ pedido }: { pedido: ResumoPedido }) {
  const pagamento = pedido.pagamento;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span
        className={`rounded-pill px-3 py-1 font-semibold ${CORES[pedido.status]}`}
      >
        {ROTULOS[pedido.status]}
      </span>
      <span
        className={
          pagamento?.status === "recusado" ? "text-erro-700" : "text-fg-muted"
        }
      >
        {pagamento
          ? `Pagamento ${pagamento.status}`
          : "Sem pagamento registrado"}
      </span>
    </div>
  );
}

function ErroPedidos({
  mensagem,
  tentar,
}: {
  mensagem: string;
  tentar: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border-subtle bg-surface-card p-5">
      <p role="alert" className="m-0 text-erro-700">
        {mensagem}
      </p>
      <button
        type="button"
        className={BOTAO_SECUNDARIO_PEQUENO}
        onClick={tentar}
      >
        Tentar novamente
      </button>
    </div>
  );
}

function DetalheDoPedido({ pedido }: { pedido: DetalhePedido }) {
  return (
    <section
      aria-label="Detalhe do pedido"
      className="min-w-0 rounded-card border border-border-subtle bg-surface-card p-5 md:p-6"
    >
      <h3 className="m-0 break-all text-xl">
        {pedido.numeroConfirmacao ?? "Pedido sem número"}
      </h3>
      <p className="mt-2 mb-3 text-sm text-fg-muted">
        {FORMATADOR_DATA.format(new Date(pedido.criadoEm))}
      </p>
      <StatusDoPedido pedido={pedido} />
      <h4 className="mt-6 mb-3 font-semibold">Itens do pedido</h4>
      {pedido.itens.length === 0 ? (
        <p>Nenhum item registrado.</p>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {pedido.itens.map((item, indice) => (
            <li
              key={`${item.produtoId}-${indice}`}
              className="min-w-0 rounded-lg bg-surface-raised p-4"
            >
              <p className="m-0 break-words font-semibold text-fg-strong">
                {item.nome}
              </p>
              <dl className="mt-2 mb-0 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-fg-muted">Quantidade</dt>
                  <dd className="m-0">{item.quantidade}</dd>
                </div>
                <div>
                  <dt className="text-fg-muted">Preço unitário</dt>
                  <dd className="m-0 break-words">
                    {valor(item.precoUnitario)}
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-muted">Subtotal</dt>
                  <dd className="m-0 break-words">{valor(item.subtotal)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-border-subtle pt-4 font-semibold">
        <span>Total do pedido</span>
        <span>{valor(pedido.total)}</span>
      </div>
      <h4 className="mt-6 mb-3 font-semibold">Pagamento</h4>
      {pedido.pagamento ? (
        <dl className="m-0 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-fg-muted">Método</dt>
            <dd className="m-0">Pix simulado</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Valor</dt>
            <dd className="m-0">{valor(pedido.pagamento.valor)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Data do pagamento</dt>
            <dd className="m-0">
              {FORMATADOR_DATA.format(new Date(pedido.pagamento.dataPagamento))}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="m-0 text-sm text-fg-muted">
          Pagamento não registrado neste pedido.
        </p>
      )}
    </section>
  );
}

export function MeusPedidos({ service }: { service: PedidosService }) {
  const historico = useMeusPedidos(service);
  const { lista, detalhe } = historico;
  return (
    <section
      aria-labelledby="titulo-meus-pedidos"
      className="flex min-w-0 flex-col gap-4"
    >
      <h2 id="titulo-meus-pedidos" className="m-0 text-2xl md:text-[28px]">
        Meus pedidos
      </h2>
      {historico.pedidoId ? (
        <>
          <button
            type="button"
            onClick={historico.voltar}
            className={`${BOTAO_SECUNDARIO_PEQUENO} self-start`}
          >
            Voltar aos pedidos
          </button>
          {detalhe.status === "carregando" ? (
            <p role="status">Carregando pedido…</p>
          ) : detalhe.status === "erro" ? (
            <ErroPedidos
              mensagem={detalhe.mensagem}
              tentar={historico.recarregarDetalhe}
            />
          ) : (
            <DetalheDoPedido pedido={detalhe.dados} />
          )}
        </>
      ) : lista.status === "carregando" ? (
        <p role="status">Carregando pedidos…</p>
      ) : lista.status === "erro" ? (
        <ErroPedidos
          mensagem={lista.mensagem}
          tentar={historico.recarregarLista}
        />
      ) : lista.dados.total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong bg-surface-raised p-6 text-center">
          <Icone nome="pacote" tamanho={28} />
          <h3 className="m-0 text-xl">Seus pedidos vão aparecer aqui</h3>
          <p className="m-0 text-sm text-fg-muted">
            Ao confirmar uma compra, acompanhe seu pedido nesta área.
          </p>
        </div>
      ) : (
        <>
          <ul className="m-0 list-none space-y-3 p-0">
            {lista.dados.itens.map((pedido) => (
              <li key={pedido.id} className="min-w-0">
                <button
                  type="button"
                  aria-label={`Ver pedido ${pedido.numeroConfirmacao ?? pedido.id}`}
                  onClick={() => historico.selecionar(pedido.id)}
                  className="flex w-full min-w-0 flex-col gap-3 rounded-card border border-border-subtle bg-surface-card p-5 text-left shadow-card transition-colors hover:border-border-strong"
                >
                  <div className="flex w-full min-w-0 flex-wrap justify-between gap-2 font-semibold text-fg-strong">
                    <span className="break-all">
                      {pedido.numeroConfirmacao ?? "Pedido sem número"}
                    </span>
                    <span>{valor(pedido.total)}</span>
                  </div>
                  <time
                    dateTime={pedido.criadoEm}
                    className="text-sm text-fg-muted"
                  >
                    {FORMATADOR_DATA.format(new Date(pedido.criadoEm))}
                  </time>
                  <StatusDoPedido pedido={pedido} />
                  <span className="text-sm font-semibold text-fg-link">
                    Ver detalhes
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <nav
            aria-label="Paginação dos pedidos"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <button
              type="button"
              className={BOTAO_SECUNDARIO_PEQUENO}
              disabled={historico.pagina === 1}
              onClick={() => historico.mudarPagina(historico.pagina - 1)}
            >
              Página anterior
            </button>
            <span className="text-sm text-fg-muted">
              Página {historico.pagina} de{" "}
              {Math.max(1, Math.ceil(lista.dados.total / lista.dados.limite))}
            </span>
            <button
              type="button"
              className={BOTAO_SECUNDARIO_PEQUENO}
              disabled={
                historico.pagina * lista.dados.limite >= lista.dados.total
              }
              onClick={() => historico.mudarPagina(historico.pagina + 1)}
            >
              Próxima página
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
