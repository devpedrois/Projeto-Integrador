"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Icone } from "@/components/vitrine/Icone";
import { renderizarVaso } from "@/components/vitrine/vaso-render";

const DIAMETRO = 240;
const ATRASO = 0.35;
const MASCARA_VAZIA = "linear-gradient(transparent,transparent)";

interface Ponto {
  x: number;
  y: number;
}

function prefereMenosMovimento(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HeroVaso() {
  const palcoRef = useRef<HTMLDivElement>(null);
  const realRef = useRef<HTMLCanvasElement>(null);
  const desenhoRef = useRef<HTMLCanvasElement>(null);
  const [pronto, setPronto] = useState(false);
  const [completo, setCompleto] = useState(false);

  const animacao = useRef({
    pos: { x: 0.5, y: 0.5 } as Ponto,
    alvo: { x: 0.5, y: 0.5 } as Ponto,
    raio: 0,
    ativo: false,
    completo: false,
    ultimo: 0,
    quadro: 0,
    mascara: "",
  });

  const quadro = useCallback((agora: number) => {
    const estado = animacao.current;
    const palco = palcoRef.current;
    const real = realRef.current;
    estado.quadro = 0;
    if (!palco || !real) return;

    const dt = estado.ultimo ? Math.min(0.05, (agora - estado.ultimo) / 1000) : 0.016;
    estado.ultimo = agora;
    const w = palco.clientWidth;
    const h = palco.clientHeight;
    const reduzir = prefereMenosMovimento();
    const base = (DIAMETRO / 2) * Math.min(1.3, Math.max(0.6, w / 600));
    const alvo = estado.completo ? { x: 0.5, y: 0.5 } : estado.alvo;
    const raioAlvo = estado.completo ? Math.hypot(w, h) * 0.62 : estado.ativo ? base : 0;
    const kp = reduzir ? 1 : 1 - Math.exp(-dt * (4 + 36 * (1 - ATRASO)));
    const kr = reduzir ? 1 : 1 - Math.exp(-dt * (estado.completo ? 5 : 9));

    estado.pos.x += (alvo.x - estado.pos.x) * kp;
    estado.pos.y += (alvo.y - estado.pos.y) * kp;
    estado.raio += (raioAlvo - estado.raio) * kr;
    if (Math.abs(raioAlvo - estado.raio) < 0.3) estado.raio = raioAlvo;

    const r = estado.raio;
    const x = (estado.pos.x * w).toFixed(1);
    const y = (estado.pos.y * h).toFixed(1);
    const mascara =
      r < 0.5
        ? MASCARA_VAZIA
        : `radial-gradient(circle at ${x}px ${y}px, #000 0px, #000 ${(r * 0.42).toFixed(1)}px, rgba(0,0,0,.82) ${(r * 0.6).toFixed(1)}px, rgba(0,0,0,.38) ${(r * 0.8).toFixed(1)}px, transparent ${r.toFixed(1)}px)`;
    if (mascara !== estado.mascara) {
      real.style.webkitMaskImage = mascara;
      real.style.maskImage = mascara;
      estado.mascara = mascara;
    }

    const parado =
      estado.raio === raioAlvo &&
      Math.abs(alvo.x - estado.pos.x) < 0.001 &&
      Math.abs(alvo.y - estado.pos.y) < 0.001;
    if (parado) {
      estado.ultimo = 0;
      return;
    }
    estado.quadro = requestAnimationFrame(quadro);
  }, []);

  const animar = useCallback(() => {
    if (animacao.current.quadro || typeof requestAnimationFrame !== "function") return;
    animacao.current.quadro = requestAnimationFrame(quadro);
  }, [quadro]);

  useEffect(() => {
    const real = realRef.current;
    const desenho = desenhoRef.current;
    if (!real || !desenho || typeof ImageData === "undefined") return;

    const espera = window.setTimeout(() => {
      if (renderizarVaso(real, desenho)) setPronto(true);
    }, 40);
    const estado = animacao.current;

    return () => {
      window.clearTimeout(espera);
      if (estado.quadro) cancelAnimationFrame(estado.quadro);
    };
  }, []);

  function posicao(evento: ReactPointerEvent<HTMLDivElement>): Ponto {
    const caixa = evento.currentTarget.getBoundingClientRect();
    return {
      x: (evento.clientX - caixa.left) / caixa.width,
      y: (evento.clientY - caixa.top) / caixa.height,
    };
  }

  function aoMover(evento: ReactPointerEvent<HTMLDivElement>): void {
    const estado = animacao.current;
    const ponto = posicao(evento);
    if (!estado.ativo) estado.pos = { ...ponto };
    estado.alvo = ponto;
    estado.ativo = true;
    animar();
  }

  function aoSair(): void {
    animacao.current.ativo = false;
    animar();
  }

  function aoSoltar(evento: ReactPointerEvent<HTMLDivElement>): void {
    if (evento.pointerType !== "mouse") aoSair();
  }

  function alternarCompleto(): void {
    const proximo = !completo;
    animacao.current.completo = proximo;
    setCompleto(proximo);
    animar();
  }

  return (
    <section
      aria-labelledby="vaso-titulo"
      className="bg-surface-page px-[var(--container-pad)] py-[clamp(48px,8vw,112px)]"
    >
      <div className="mx-auto flex max-w-[var(--container-max)] flex-wrap items-center gap-[clamp(32px,6vw,80px)]">
        <div className="flex max-w-[460px] flex-[1_1_320px] flex-col gap-5">
          <h1
            id="vaso-titulo"
            className="m-0 font-display text-[clamp(40px,5.4vw,72px)] leading-[1.04] font-semibold tracking-display text-balance text-fg-strong"
          >
            Da terra, nasce a forma.
          </h1>
          <p className="m-0 max-w-[380px] text-[19px] leading-[1.55] text-fg-muted">
            Cada curva guarda um gesto. Cada peça, uma história.
          </p>
          <div className="mt-3 flex flex-col items-start gap-4 border-t border-border-default pt-6">
            <span className="flex items-center gap-2 text-body-sm text-fg-subtle">
              <Icone nome="cursor" tamanho={16} />
              Passe o cursor e descubra os detalhes.
            </span>
            <button
              type="button"
              aria-pressed={completo}
              aria-controls="vaso-palco"
              onClick={alternarCompleto}
              className="inline-flex h-[var(--control-h-sm)] items-center gap-2 rounded-control border border-border-strong bg-surface-card px-3.5 text-sm font-semibold whitespace-nowrap text-fg-strong transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-secondary-hover active:translate-y-px"
            >
              <Icone nome={completo ? "lapis" : "olho"} tamanho={16} />
              {completo ? "Voltar ao desenho" : "Ver peça completa"}
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[680px] min-w-0 flex-[1.35_1_400px]">
          <div
            id="vaso-palco"
            ref={palcoRef}
            role="img"
            aria-label={
              completo
                ? "Vaso de argila modelado à mão, em cerâmica terracota fosca, com poros, marcas do torno e sombra suave sobre fundo claro."
                : "Vaso de argila modelado à mão, desenhado a grafite sobre papel. Ao passar o cursor, aparece a versão em cerâmica terracota."
            }
            onPointerEnter={aoMover}
            onPointerDown={aoMover}
            onPointerMove={aoMover}
            onPointerLeave={aoSair}
            onPointerUp={aoSoltar}
            onPointerCancel={aoSair}
            className="relative aspect-[4/5] w-full touch-pan-y overflow-hidden rounded-card border border-border-subtle bg-[#f7f3eb] shadow-card select-none [-webkit-tap-highlight-color:transparent]"
          >
            <canvas ref={desenhoRef} aria-hidden="true" className="absolute inset-0 block size-full" />
            <canvas
              ref={realRef}
              aria-hidden="true"
              className="absolute inset-0 block size-full [mask-image:linear-gradient(transparent,transparent)]"
            />
            {!pronto ? (
              <div className="absolute inset-0 grid place-items-center bg-[#f7f3eb]">
                <span className="font-display text-lg text-fg-subtle italic">Moldando a peça…</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
