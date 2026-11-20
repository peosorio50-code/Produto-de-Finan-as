# Fôlego

Quiz gratuito sobre dívidas que termina com a situação da pessoa e oferece um plano de quitação personalizado (R$ 29,90), escrito por IA a partir das respostas.

## Como está montado (v2, no padrão do Meu Santo Protetor)

```
navegador (folegofinanceiro.shop, Cloudflare Pages: site estático deste projeto)
   │  quiz, resultado e o plano são montados aqui (lib/diagnostico, lib/narrativa-padrao, lib/guia)
   │
   └── https://api.mapadaalma.online/api/folego/...   (servidor Python do Meu Santo: folego.py)
          lead · checkout (pedido + link Kiwify ?sck=ref) · plano (IA) · reenviar · vincular
Kiwify ──► https://api.mapadaalma.online/webhook/kiwify/<segredo>  (mesmo webhook do Meu Santo; produto com "folego" vai para o folego.py)
```

- **Números**: calculados no navegador por regras fixas (`lib/diagnostico.ts`), iguais na tela do resultado e no plano.
- **Texto da IA**: no checkout, o navegador manda para o servidor o JSON do caso (`lib/ia-dados.ts → dadosParaIA`). Quando o pagamento cai e a pessoa abre `/plano`, o servidor chama o Claude uma vez (em segundo plano: a tela espera com 202), guarda o texto e devolve. O navegador junta com a versão padrão (`conciliar`).
- **Se a IA falhar**, sai a versão por regras na hora, e a pessoa pode pedir a versão da IA mais 2 vezes.
- **Plano em qualquer aparelho**: `/plano?ref=...` busca as respostas e o texto no servidor.
- **Leads**: tabelas `folego_leads` e `folego_eventos` no banco do servidor. Comandos: `./venv/bin/python folego.py status | leads 30 | buscar EMAIL`.

## Rodar no computador
```bash
npm install
NEXT_PUBLIC_API=http://localhost:8010 npm run dev
```
(com o servidor do Meu Santo rodando na porta 8010)

Subir: veja COMO-SUBIR.md.
