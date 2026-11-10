# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluxos.spec.ts >> (b) artesao envia e comprador acompanha Enviado
- Location: e2e\fluxos.spec.ts:173:1

# Error details

```
Test timeout of 90000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - button "Open Next.js Dev Tools" [ref=f1e7] [cursor=pointer]
  - alert [ref=f1e11]
  - banner [ref=f1e12]:
    - generic [ref=f1e13]:
      - link "Origem" [ref=f1e14] [cursor=pointer]:
        - /url: /
      - navigation [ref=f1e16]:
        - link "Vitrine" [ref=f1e17] [cursor=pointer]:
          - /url: /
        - link "Carrinho 0" [ref=f1e18] [cursor=pointer]:
          - /url: /carrinho
          - text: Carrinho
          - generic [ref=f1e19]: "0"
        - link "Minha conta" [ref=f1e20] [cursor=pointer]:
          - /url: /minha-conta
      - generic [ref=f1e22]:
        - generic [ref=f1e23]:
          - generic [ref=f1e24]: Pessoa sintética E2E
          - generic [ref=f1e25]: Comprador
        - button "Sair" [ref=f1e26]
  - main [ref=f1e27]:
    - heading "Minha conta" [level=1] [ref=f1e28]
    - generic [ref=f1e29]:
      - generic [ref=f1e30]:
        - generic [ref=f1e31]:
          - generic [ref=f1e32]:
            - term [ref=f1e33]: Nome
            - definition [ref=f1e34]: Pessoa sintética E2E
          - generic [ref=f1e36]:
            - term [ref=f1e37]: E-mail
            - definition [ref=f1e38]: e2e31-06aef282-4435-414b-8ac3-8b5fa5f2c2a1@teste.origem
          - generic [ref=f1e40]:
            - term [ref=f1e41]: Papel
            - definition [ref=f1e42]:
              - generic [ref=f1e43]: Comprador
        - button "Sair" [ref=f1e44]
      - region [ref=f1e48]:
        - heading "Meus pedidos" [level=2] [ref=f1e49]
        - button "Voltar aos pedidos" [ref=f1e50]
        - button "Atualizar pedido" [ref=f1e51]
        - region "Detalhe do pedido" [ref=f1e52]:
          - heading "ORG-2026-000002" [level=3] [ref=f1e53]
          - paragraph [ref=f1e54]: 10/11/2026, 13:33
          - generic [ref=f1e55]:
            - generic [ref=f1e56]: Confirmado
            - generic [ref=f1e57]: Pagamento aprovado
          - heading "Itens do pedido" [level=4] [ref=f1e58]
          - list [ref=f1e59]:
            - listitem [ref=f1e60]:
              - paragraph [ref=f1e61]: Boneca de Barro Pintada
              - generic [ref=f1e62]:
                - generic [ref=f1e63]:
                  - term [ref=f1e64]: Quantidade
                  - definition [ref=f1e65]: "1"
                - generic [ref=f1e66]:
                  - term [ref=f1e67]: Preço unitário
                  - definition [ref=f1e68]: R$ 78,90
                - generic [ref=f1e69]:
                  - term [ref=f1e70]: Subtotal
                  - definition [ref=f1e71]: R$ 78,90
              - generic [ref=f1e72]: Aguardando envio
              - form "Avaliar Boneca de Barro Pintada" [ref=f1e74]:
                - group "Avaliar produto" [ref=f1e75]:
                  - group "Sua nota" [ref=f1e77]:
                    - generic [ref=f1e79]:
                      - generic [ref=f1e80] [cursor=pointer]:
                        - radio "1 estrela" [ref=f1e81]
                        - text: "1"
                      - generic [ref=f1e82] [cursor=pointer]:
                        - radio "2 estrelas" [ref=f1e83]
                        - text: "2"
                      - generic [ref=f1e84] [cursor=pointer]:
                        - radio "3 estrelas" [ref=f1e85]
                        - text: "3"
                      - generic [ref=f1e86] [cursor=pointer]:
                        - radio "4 estrelas" [ref=f1e87]
                        - text: "4"
                      - generic [ref=f1e88] [cursor=pointer]:
                        - radio "5 estrelas" [ref=f1e89]
                        - text: "5"
                  - generic [ref=f1e90]:
                    - generic [ref=f1e91]: Comentário opcional
                    - textbox "Comentário opcional" [ref=f1e92]
                    - paragraph [ref=f1e93]: 0/500 caracteres
                  - button "Enviar avaliação" [ref=f1e94]
          - generic [ref=f1e95]:
            - generic [ref=f1e96]: Total do pedido
            - generic [ref=f1e97]: R$ 78,90
          - heading "Pagamento" [level=4] [ref=f1e98]
          - generic [ref=f1e99]:
            - generic [ref=f1e100]:
              - term [ref=f1e101]: Método
              - definition [ref=f1e102]: Pix simulado
            - generic [ref=f1e103]:
              - term [ref=f1e104]: Valor
              - definition [ref=f1e105]: R$ 78,90
            - generic [ref=f1e106]:
              - term [ref=f1e107]: Data do pagamento
              - definition [ref=f1e108]: 10/11/2026, 13:33
```