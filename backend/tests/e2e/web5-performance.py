import csv
import json
import os
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[3]
output = root / "evidencias/PI4-WEB-W12-Fluxos-Artesao-Avaliacoes/Web.5-indicadores-artesao"
output.mkdir(parents=True, exist_ok=True)
base = os.environ.get("WEB5_FRONTEND_URL", "http://127.0.0.1:3005")
seletor = 'section[aria-label="Indicadores de vendas"]'
medicoes = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel="chrome")
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    try:
        login = context.request.post(f"{base}/api/auth/login", data={
            "email": os.environ["WEB5_DEMO_EMAIL"],
            "senha": os.environ["WEB5_DEMO_PASSWORD"],
        })
        assert login.status == 200, f"Login demo: HTTP {login.status}"
        context.add_init_script("""
            window.__web5 = { cardRenderMs: null };
            let agendado = false;
            const observer = new MutationObserver(() => {
                const card = document.querySelector('section[aria-label="Indicadores de vendas"]');
                if (!agendado && card?.querySelector('dl') && card.querySelector('time')) {
                    agendado = true;
                    requestAnimationFrame(() => {
                        window.__web5.cardRenderMs = performance.now();
                        observer.disconnect();
                    });
                }
            });
            observer.observe(document, { childList: true, subtree: true });
        """)
        page = context.new_page()
        erros = []
        page.on("pageerror", lambda error: erros.append(str(error)))
        page.goto(f"{base}/painel-artesao", wait_until="networkidle")
        card = page.get_by_role("region", name="Indicadores de vendas")
        expect(card.locator("time")).to_be_visible()
        print("Card inicial:", card.inner_text())
        for rodada in range(1, 11):
            with page.expect_response(lambda r: r.url == f"{base}/api/artesao/indicadores") as evento:
                page.reload(wait_until="domcontentloaded")
            response = evento.value
            assert response.status == 200
            payload = response.json()
            expect(card.locator("time")).to_be_visible()
            page.wait_for_function("window.__web5.cardRenderMs !== null")
            tempos = page.evaluate("""() => {
                const entradas = performance.getEntriesByType('resource').filter(e =>
                    new URL(e.name).pathname === '/api/artesao/indicadores');
                return { cardRenderMs: window.__web5.cardRenderMs,
                    requisicoes: entradas.map(e => ({ inicioMs: e.startTime, duracaoMs: e.duration })) };
            }""")
            assert len(tempos["requisicoes"]) == 1, tempos
            valores = card.locator("dl > div").evaluate_all("""els => Object.fromEntries(
                els.map(el => [el.querySelector('dt').textContent, el.querySelector('dd').textContent]))""")
            assert int(valores["Quantidade vendida"]) == payload["quantidadeVendida"]
            assert int(valores["Pedidos"]) == payload["numeroPedidos"]
            receita = Decimal(valores["Receita total"].replace("R$", "").replace("\xa0", "").replace(" ", "").replace(".", "").replace(",", "."))
            assert receita == Decimal(str(payload["receitaTotal"]))
            assert card.locator("time").get_attribute("datetime") == payload["atualizadoEm"]
            medicao = {"rodada": rodada, "requisicaoMs": round(tempos["requisicoes"][0]["duracaoMs"], 2),
                       "inicioRequisicaoMs": round(tempos["requisicoes"][0]["inicioMs"], 2),
                       "cardRenderMs": round(tempos["cardRenderMs"], 2), "valoresConferem": True,
                       "resposta": payload}
            medicoes.append(medicao)
            print(json.dumps(medicao, ensure_ascii=False))
        capturas = []
        for largura in [360, 768, 1280]:
            page.set_viewport_size({"width": largura, "height": 900})
            page.evaluate("window.scrollTo(0, 0)")
            expect(card).to_be_visible()
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            page.screenshot(path=str(output / f"painel-{largura}.png"), full_page=True)
            card.screenshot(path=str(output / f"card-{largura}.png"))
            capturas.append(largura)
        resultado = {"dataUtc": datetime.now(timezone.utc).isoformat(),
                     "ambiente": "Next.js build de producao local, API Express local, PostgreSQL Neon real com seed oficial em schema isolado",
                     "artesao": "João Artesão, seed-artesao-01",
                     "metodologia": "Login e primeira abertura fora da amostra. Dez recargas consecutivas; sem descartar rodadas. Requisicao por Resource Timing; renderizacao desde navigationStart ate DOM completo e requestAnimationFrame.",
                     "browser": browser.version, "limiteMs": 2000, "medicoes": medicoes,
                     "maxRequisicaoMs": max(m["requisicaoMs"] for m in medicoes),
                     "maxCardRenderMs": max(m["cardRenderMs"] for m in medicoes),
                     "capturas": capturas, "errosJavascript": erros}
        (output / "medicoes.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
        with (output / "medicoes.csv").open("w", newline="", encoding="utf-8") as file:
            campos = ["rodada", "requisicaoMs", "inicioRequisicaoMs", "cardRenderMs", "valoresConferem"]
            writer = csv.DictWriter(file, fieldnames=campos, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(medicoes)
        assert not erros, erros
        assert all(m["requisicaoMs"] < 2000 and m["cardRenderMs"] < 2000 for m in medicoes), "Ha medicoes acima de 2 segundos."
        print("Dez recargas abaixo de 2s; valores conferidos contra a API.")
    finally:
        context.close()
        browser.close()
