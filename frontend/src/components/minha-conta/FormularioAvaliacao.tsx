"use client";

import { useId, useState, type FormEvent } from "react";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import { useAvaliacaoProduto } from "@/hooks/use-avaliacao-produto";
import {
  avaliacaoValida,
  validarAvaliacao,
  type ErrosAvaliacao,
} from "@/validators/avaliacao.validator";
import { BOTAO_SECUNDARIO_PEQUENO } from "@/components/formulario/estilos-botao";

export function FormularioAvaliacao({
  service,
  produtoId,
  nomeProduto,
  compradorId,
}: {
  service: AvaliacoesService;
  produtoId: string;
  nomeProduto: string;
  compradorId: string;
}) {
  const id = useId();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [erros, setErros] = useState<ErrosAvaliacao>({});
  const { estado, enviar, tentarNovamente } = useAvaliacaoProduto(
    service,
    produtoId,
    compradorId,
  );

  function submeter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { produtoId, nota, comentario };
    const validacao = validarAvaliacao(input);
    setErros(validacao);
    if (avaliacaoValida(validacao)) void enviar(input);
  }

  if (estado === "carregando")
    return (
      <p role="status" className="mt-4 text-sm text-fg-muted">
        Carregando sua avaliação…
      </p>
    );
  if (estado === "sucesso")
    return (
      <p role="status" className="mt-4 text-sm font-semibold text-sucesso-700">
        Avaliação enviada com sucesso.
      </p>
    );
  if (estado === "ja-avaliado")
    return (
      <p role="status" className="mt-4 text-sm text-fg-muted">
        Você já avaliou este produto.
      </p>
    );
  if (estado === "erro-leitura")
    return (
      <div className="mt-4 space-y-2">
        <p role="alert" className="text-sm text-erro-700">
          Não foi possível consultar sua avaliação.
        </p>
        <button
          type="button"
          className={BOTAO_SECUNDARIO_PEQUENO}
          onClick={tentarNovamente}
        >
          Tentar novamente
        </button>
      </div>
    );

  return (
    <form
      aria-label={`Avaliar ${nomeProduto}`}
      noValidate
      onSubmit={submeter}
      className="mt-4 space-y-4 border-t border-border-subtle pt-4"
    >
      <fieldset
        disabled={estado === "enviando"}
        className="m-0 min-w-0 space-y-4 border-0 p-0"
      >
        <legend className="font-semibold text-fg-strong">
          Avaliar produto
        </legend>
        <fieldset
          className="m-0 min-w-0 border-0 p-0"
          aria-describedby={erros.nota ? `${id}-nota-erro` : undefined}
        >
          <legend className="mb-2 text-sm font-semibold">Sua nota</legend>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((valor) => (
              <label
                key={valor}
                className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-control border px-3 text-sm ${nota === valor ? "border-barro-700 bg-barro-50 text-barro-700" : "border-border-strong bg-surface-card"}`}
              >
                <input
                  type="radio"
                  name={`${id}-nota`}
                  value={valor}
                  checked={nota === valor}
                  onChange={() => setNota(valor)}
                  aria-label={`${valor} ${valor === 1 ? "estrela" : "estrelas"}`}
                  aria-invalid={Boolean(erros.nota)}
                />
                {valor}
              </label>
            ))}
          </div>
          {erros.nota ? (
            <p
              id={`${id}-nota-erro`}
              role="alert"
              className="mt-2 text-sm text-erro-700"
            >
              {erros.nota}
            </p>
          ) : null}
        </fieldset>
        <div>
          <label
            htmlFor={`${id}-comentario`}
            className="mb-2 block text-sm font-semibold"
          >
            Comentário opcional
          </label>
          <textarea
            id={`${id}-comentario`}
            value={comentario}
            onChange={(event) => setComentario(event.target.value)}
            rows={3}
            aria-invalid={Boolean(erros.comentario)}
            aria-describedby={`${id}-comentario-limite${erros.comentario ? ` ${id}-comentario-erro` : ""}`}
            className="block w-full min-w-0 resize-y rounded-control border border-border-strong bg-surface-card p-3 text-base"
          />
          <p
            id={`${id}-comentario-limite`}
            className="mt-1 text-xs text-fg-muted"
          >
            {comentario.trim().length}/500 caracteres
          </p>
          {erros.comentario ? (
            <p
              id={`${id}-comentario-erro`}
              role="alert"
              className="mt-2 text-sm text-erro-700"
            >
              {erros.comentario}
            </p>
          ) : null}
        </div>
        {erros.produtoId ? (
          <p role="alert" className="text-sm text-erro-700">
            {erros.produtoId}
          </p>
        ) : null}
        {estado === "erro-envio" ? (
          <p role="alert" className="text-sm text-erro-700">
            Não foi possível enviar sua avaliação.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={estado === "enviando"}
          className={BOTAO_SECUNDARIO_PEQUENO}
        >
          {estado === "enviando" ? "Enviando…" : "Enviar avaliação"}
        </button>
      </fieldset>
    </form>
  );
}
