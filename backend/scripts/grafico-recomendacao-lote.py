import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


def gerar_grafico(json_path: Path, png_path: Path) -> None:
    if png_path.exists():
        raise ValueError("O PNG de destino precisa ser novo.")
    dados = json.loads(json_path.read_text(encoding="utf-8"))
    rodadas = dados["rodadas"]
    if (
        not dados["aprovado"]
        or len(rodadas) != 15
        or not all(r["identico"] for r in rodadas)
    ):
        raise ValueError("O grafico exige quinze rodadas identicas.")
    resumo = dados["resumo"]
    if [r["concorrencia"] for r in resumo] != [1, 4, 8]:
        raise ValueError("Concorrencias invalidas.")
    fig, eixos = plt.subplots(1, 2, figsize=(11, 5), layout="constrained")
    configuracoes = [r["concorrencia"] for r in resumo]
    for eixo, campo, titulo in zip(
        eixos,
        ["throughput", "speedup"],
        ["Throughput, produtos/s", "Speedup sobre C=1"],
    ):
        valores = [r[campo] for r in resumo]
        eixo.plot(configuracoes, valores, marker="o", color="#9b482d", linewidth=2)
        eixo.set_xticks(configuracoes)
        eixo.set_xlabel("Concorrencia C; pool = C+2")
        eixo.set_ylabel(titulo)
        eixo.set_ylim(bottom=0)
        eixo.grid(axis="y", alpha=0.3)
        for c, valor in zip(configuracoes, valores):
            eixo.annotate(
                f"{valor:.2f}",
                (c, valor),
                xytext=(0, 9),
                textcoords="offset points",
                ha="center",
            )
    eixos[1].plot(
        configuracoes, configuracoes, linestyle="--", color="#777777", label="Ideal"
    )
    eixos[1].legend()
    fig.suptitle(
        f"30.6: Strategy de categoria, {rodadas[0]['produtos']} produtos\n"
        "5 rodadas por C; 1 aquecimento descartado; mediana de 4 medicoes"
    )
    fig.savefig(png_path, dpi=160)
    plt.close(fig)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(
            "Uso: python scripts/grafico-recomendacao-lote.py resultado.json throughput.png"
        )
    gerar_grafico(Path(sys.argv[1]), Path(sys.argv[2]))
