"use client";

import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import { useComentariosProduto } from "@/hooks/use-comentarios-produto";
import { BOTAO_SECUNDARIO_PEQUENO } from "@/components/formulario/estilos-botao";

const DATA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Recife",
});

export function ComentariosProduto({
  service,
  produtoId,
}: {
  service: AvaliacoesService;
  produtoId: string;
}) {
  const { estado, pagina, navegar, recarregar } = useComentariosProduto(
    service,
    produtoId,
  );
  return (
    <section
      aria-label="Avaliações do produto"
      className="mt-10 min-w-0 rounded-card border border-border-subtle bg-surface-card p-5 shadow-card sm:mt-14 sm:p-6"
    >
      <h2 className="m-0 font-display text-2xl font-semibold text-fg-strong">
        Avaliações
      </h2>
      {estado.status === "carregando" ? (
        <p role="status" className="mb-0 mt-4 text-fg-muted">
          Carregando avaliações…
        </p>
      ) : estado.status === "erro" ? (
        <div className="mt-4 flex flex-col items-start gap-3">
          <p role="alert" className="m-0 text-erro-700">
            Não foi possível carregar as avaliações.
          </p>
          <button
            type="button"
            onClick={recarregar}
            className={BOTAO_SECUNDARIO_PEQUENO}
          >
            Tentar novamente
          </button>
        </div>
      ) : estado.status === "vazio" ? (
        <p className="mb-0 mt-4 text-fg-muted">
          Nenhuma avaliação registrada ainda.
        </p>
      ) : (
        <>
          <ul className="m-0 mt-4 list-none divide-y divide-border-subtle p-0">
            {estado.dados.itens.map((item) => (
              <li key={item.id} className="min-w-0 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-fg-strong">
                    Nota {item.nota} de 5
                  </span>
                  <time dateTime={item.criadoEm} className="text-fg-muted">
                    {DATA.format(new Date(item.criadoEm))}
                  </time>
                </div>
                <p className="mb-0 mt-2 break-words whitespace-pre-line text-fg-body">
                  {item.comentario ?? "Avaliação sem comentário."}
                </p>
              </li>
            ))}
          </ul>
          <nav
            aria-label="Paginação das avaliações"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4"
          >
            <button
              type="button"
              onClick={() => navegar(pagina - 1)}
              disabled={pagina === 1}
              className={BOTAO_SECUNDARIO_PEQUENO}
            >
              Anterior
            </button>
            <span className="text-sm text-fg-muted">
              Página {pagina} de {Math.ceil(estado.dados.resumo.total / 10)}
            </span>
            <button
              type="button"
              onClick={() => navegar(pagina + 1)}
              disabled={pagina * 10 >= estado.dados.resumo.total}
              className={BOTAO_SECUNDARIO_PEQUENO}
            >
              Próxima
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
