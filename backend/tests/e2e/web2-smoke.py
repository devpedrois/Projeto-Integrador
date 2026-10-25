import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[3]
output = root / "evidencias/PI4-WEB-W12-Fluxos-Artesao-Avaliacoes/Web.2-pedidos-recebidos"
output.mkdir(parents=True, exist_ok=True)
base = os.environ.get("WEB2_FRONTEND_URL", "http://127.0.0.1:3002")
resultados = []


def sem_quebra(page, largura, tela):
    page.set_viewport_size({"width": largura, "height": 900})
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=str(output / f"{tela}-{largura}.png"), full_page=True)
    dimensoes = page.evaluate("""() => ({
        viewport: document.documentElement.clientWidth,
        conteudo: document.documentElement.scrollWidth,
        excedentes: [...document.querySelectorAll('main *')].filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
        }).map(el => el.tagName)
    })""")
    assert dimensoes["conteudo"] <= dimensoes["viewport"], dimensoes
    assert not dimensoes["excedentes"], dimensoes
    resultados.append({"tela": tela, "largura": largura, **dimensoes})


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel="chrome")
    artesao = browser.new_context(viewport={"width": 360, "height": 900})
    comprador = browser.new_context(viewport={"width": 360, "height": 900})
    try:
        for context, email in [(artesao, "web2-artesao@teste.origem"),
                               (comprador, "web2-comprador@teste.origem")]:
            resposta = context.request.post(f"{base}/api/auth/login", data={
                "email": email, "senha": os.environ["WEB2_SMOKE_PASSWORD"],
            })
            assert resposta.status == 200

        a = artesao.new_page()
        b = comprador.new_page()
        a.set_default_navigation_timeout(90000)
        b.set_default_navigation_timeout(90000)
        erros = []
        a.on("pageerror", lambda error: erros.append(str(error)))
        b.on("pageerror", lambda error: erros.append(str(error)))
        a.goto(f"{base}/painel-artesao/pedidos")
        a.wait_for_load_state("networkidle")
        print("Tela artesao:", a.get_by_role("heading").all_text_contents())
        print("Acoes artesao:", a.get_by_role("button").all_text_contents())
        expect(a.get_by_role("heading", name="Pedidos recebidos")).to_be_visible()
        expect(a.get_by_role("button", name="Marcar como enviado")).to_have_count(5)
        expect(a.get_by_text("Peca sintetica 6", exact=True)).to_have_count(0)
        assert a.locator('a[href="/painel-artesao/pedidos"]').count() >= 1
        b.goto(f"{base}/minha-conta")
        b.wait_for_load_state("networkidle")
        print("Tela comprador:", b.get_by_role("heading").all_text_contents())
        b.get_by_role("button", name="Ver pedido", exact=False).click()
        expect(b.get_by_role("region", name="Detalhe do pedido")).to_be_visible()
        expect(b.get_by_text("Aguardando envio", exact=True)).to_have_count(6)
        for largura in [360, 768, 1280]:
            sem_quebra(a, largura, "artesao-antes")
            sem_quebra(b, largura, "comprador-antes")

        a.set_viewport_size({"width": 768, "height": 900})
        a.get_by_role("button", name="Marcar como enviado").first.click()
        a.get_by_role("button", name="Cancelar", exact=True).click()
        expect(a.get_by_role("button", name="Marcar como enviado")).to_have_count(5)
        for indice in range(5):
            a.get_by_role("button", name="Marcar como enviado").first.click()
            a.get_by_role("button", name="Confirmar envio", exact=True).click()
            expect(a.get_by_text("Enviado", exact=True)).to_have_count(indice + 1)
            a.evaluate("window.scrollTo(0, 0)")
            a.screenshot(path=str(output / f"envio-{indice + 1}.png"), full_page=True)
        b.get_by_role("button", name="Atualizar pedido", exact=True).click()
        expect(b.get_by_text("Enviado", exact=True)).to_have_count(5)
        expect(b.get_by_text("Aguardando envio", exact=True)).to_have_count(1)
        for largura in [360, 768, 1280]:
            sem_quebra(a, largura, "artesao-depois")
            sem_quebra(b, largura, "comprador-depois")
        assert not erros, erros
        resultado = {"envios": 5, "loginsComprador": 1,
                     "itemAlheioPreservado": True, "errosJavascript": erros,
                     "viewports": resultados}
        (output / "smoke-visual.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(resultado, ensure_ascii=False))
    finally:
        artesao.close()
        comprador.close()
        browser.close()
