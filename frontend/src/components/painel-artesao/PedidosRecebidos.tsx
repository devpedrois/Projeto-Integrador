"use client";

import type { PedidosArtesaoService } from "@/services/contracts/pedidos-artesao.contract";
import { usePedidosRecebidos } from "@/hooks/use-pedidos-recebidos";
import { StatusDoItem } from "@/components/minha-conta/StatusDoItem";
import { BOTAO_SECUNDARIO_PEQUENO } from "@/components/formulario/estilos-botao";
import { formatarMoeda } from "@/utils/formatar-moeda";

export function PedidosRecebidos({
  service,
}: {
  service: PedidosArtesaoService;
}) {
  const fluxo = usePedidosRecebidos(service);
  const { estado } = fluxo;
  return (
    <section
      aria-label="Pedidos recebidos"
      className="flex min-w-0 flex-col gap-5"
    >
      <h1 className="m-0 font-display text-3xl text-fg-strong md:text-[40px]">
        Pedidos recebidos
      </h1>
      {fluxo.erroEnvio ? (
        <p role="alert" className="text-erro-700">
          {fluxo.erroEnvio}
        </p>
      ) : null}
      {estado.status === "carregando" ? (
        <p role="status">Carregando pedidos…</p>
      ) : estado.status === "erro" ? (
        <div>
          <p role="alert">Não foi possível carregar seus pedidos.</p>
          <button
            type="button"
            className={BOTAO_SECUNDARIO_PEQUENO}
            onClick={fluxo.recarregar}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {estado.dados.itens.length === 0 ? (
            <p>Nenhum pedido recebido.</p>
          ) : (
            <ul className="m-0 list-none space-y-5 p-0">
              {estado.dados.itens.map((pedido) => (
                <li
                  key={pedido.id}
                  className="min-w-0 rounded-card border border-border-subtle bg-surface-card p-4 shadow-card md:p-6"
                >
                  <h2 className="m-0 text-xl [overflow-wrap:anywhere]">
                    {pedido.numero ?? "Pedido sem número"}
                  </h2>
                  <dl className="my-4 grid min-w-0 gap-3 text-sm sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-fg-muted">Comprador</dt>
                      <dd className="m-0 [overflow-wrap:anywhere]">
                        {pedido.nomeComprador}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-fg-muted">Data do pedido</dt>
                      <dd className="m-0">
                        <time dateTime={pedido.criadoEm}>
                          {new Date(pedido.criadoEm).toLocaleString("pt-BR", {
                            timeZone: "America/Recife",
                          })}
                        </time>
                      </dd>
                    </div>
                  </dl>
                  <ul className="m-0 list-none space-y-3 p-0">
                    {pedido.itens.map((item) => (
                      <li
                        key={item.id}
                        className="min-w-0 rounded-lg bg-surface-raised p-4"
                      >
                        <h3 className="m-0 text-base font-semibold [overflow-wrap:anywhere]">
                          {item.nome}
                        </h3>
                        <dl className="my-3 grid gap-2 text-sm sm:grid-cols-3">
                          <div>
                            <dt className="text-fg-muted">Quantidade</dt>
                            <dd className="m-0">{item.quantidade}</dd>
                          </div>
                          <div>
                            <dt className="text-fg-muted">Preço unitário</dt>
                            <dd className="m-0">
                              {item.precoUnitario === null
                                ? "Não informado"
                                : formatarMoeda(item.precoUnitario)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-fg-muted">Subtotal</dt>
                            <dd className="m-0">
                              {item.subtotal === null
                                ? "Não informado"
                                : formatarMoeda(item.subtotal)}
                            </dd>
                          </div>
                        </dl>
                        <StatusDoItem
                          status={item.status}
                          enviadoEm={item.enviadoEm}
                        />
                        {item.status === "aguardando_envio" ? (
                          <div className="mt-4">
                            {fluxo.confirmando === item.id ? (
                              <fieldset
                                className="m-0 min-w-0 rounded-lg border border-border-strong p-3"
                                disabled={fluxo.salvando}
                              >
                                <legend className="px-1 text-sm font-semibold [overflow-wrap:anywhere]">
                                  Confirmar envio de {item.nome}
                                </legend>
                                <p className="mt-1 text-sm">
                                  Confirme somente após enviar este item.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                  <button
                                    type="button"
                                    className={BOTAO_SECUNDARIO_PEQUENO}
                                    onClick={() => {
                                      void fluxo.enviar();
                                    }}
                                  >
                                    {fluxo.salvando
                                      ? "Salvando…"
                                      : "Confirmar envio"}
                                  </button>
                                  <button
                                    type="button"
                                    className={BOTAO_SECUNDARIO_PEQUENO}
                                    onClick={() => fluxo.confirmar(null)}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </fieldset>
                            ) : (
                              <button
                                type="button"
                                className={BOTAO_SECUNDARIO_PEQUENO}
                                disabled={fluxo.salvando}
                                onClick={() => fluxo.confirmar(item.id)}
                              >
                                Marcar como enviado
                              </button>
                            )}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <p className="mb-0 mt-5 flex flex-wrap justify-between gap-2 border-t border-border-subtle pt-4 font-semibold">
                    <span>Subtotal dos seus itens</span>
                    <span>{formatarMoeda(pedido.subtotalArtesao)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
          {estado.dados.total > 0 ? (
            <nav
              aria-label="Paginação dos pedidos recebidos"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <button
                type="button"
                className={BOTAO_SECUNDARIO_PEQUENO}
                disabled={fluxo.offset === 0 || fluxo.salvando}
                onClick={() => fluxo.paginar(fluxo.offset - 10)}
              >
                Página anterior
              </button>
              <span className="text-sm">
                Página {Math.floor(fluxo.offset / 10) + 1}
              </span>
              <button
                type="button"
                className={BOTAO_SECUNDARIO_PEQUENO}
                disabled={
                  fluxo.offset + 10 >= estado.dados.total ||
                  fluxo.offset >= 10_000 ||
                  fluxo.salvando
                }
                onClick={() => fluxo.paginar(fluxo.offset + 10)}
              >
                Próxima página
              </button>
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}
