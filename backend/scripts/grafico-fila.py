import csv
import statistics
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


def gerar_grafico(csv_path: Path, png_path: Path) -> None:
    if png_path.exists():
        raise ValueError("O PNG de destino precisa ser novo.")
    with csv_path.open(encoding="utf-8") as arquivo:
        linhas = list(arquivo)
    if not any("NOTIFICACAO_LATENCIA_MS=200" in linha for linha in linhas if linha.startswith("#")):
        raise ValueError("CSV sem declaracao da latencia simulada.")
    dados = list(csv.DictReader(linha for linha in linhas if not linha.startswith("#")))
    medicoes = [r for r in dados if r["aquecimento"] == "false"]
    if len(medicoes) != 15 or any(r["valida"] != "true" or int(r["itens"]) != 1000 for r in medicoes):
        raise ValueError("O grafico exige quinze rodadas validas.")
    workers = [1, 2, 4]
    throughput = []
    for quantidade in workers:
        tempos = [float(r["duracao_ms"]) for r in medicoes if int(r["workers"]) == quantidade]
        if len(tempos) != 5 or any(t <= 0 for t in tempos):
            raise ValueError("Cada W precisa ter cinco medicoes positivas.")
        throughput.append(1000 / (statistics.median(tempos) / 1000))
    fig, eixo = plt.subplots(figsize=(9, 5.5), layout="constrained")
    eixo.plot(workers, throughput, marker="o", color="#9b482d", linewidth=2)
    eixo.set_xticks(workers)
    eixo.set_ylim(bottom=0)
    eixo.set_xlabel("Processos worker, W; concorrência interna = 1")
    eixo.set_ylabel("Throughput, jobs/s")
    eixo.set_title("Fila pg-boss: throughput por quantidade de workers\nLatência simulada de canal externo: 200 ms por job")
    eixo.grid(axis="y", alpha=0.3)
    for w, valor in zip(workers, throughput):
        eixo.annotate(f"{valor:.3f}", (w, valor), xytext=(0, 10), textcoords="offset points", ha="center")
    fig.suptitle("1.000 jobs; mediana de 5 rodadas; 1 aquecimento descartado por W", fontsize=10)
    fig.savefig(png_path, dpi=160)
    plt.close(fig)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Uso: python scripts/grafico-fila.py rodadas.csv throughput.png")
    gerar_grafico(Path(sys.argv[1]), Path(sys.argv[2]))
