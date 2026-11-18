# Fôlego

Quiz gratuito sobre dívidas, que termina com a situação da pessoa e oferece um
plano de quitação personalizado (R$ 29,90), escrito por IA a partir das
respostas do quiz.

1. **Contato primeiro.** A primeira tela pede nome, e-mail e WhatsApp. Esse
   lead fica gravado na hora no banco da VPS (veja "Leads").
2. **Perguntas de um toque.** Uma pergunta por tela: pessoas na casa, renda,
   gastos, quais dívidas a pessoa tem (com uma tela rápida para cada tipo),
   nome negativado, tentativas de negociação, o que pesou, como se sente com
   as dívidas, controle, reserva, renda extra e objetivo.
3. **Situação.** Depois de uma tela de "analisando", o resultado dá nome à
   situação ("Bola de neve", "Nome travado", "No sufoco"...), mostra o nível, os
   números, o que mais pesa e por onde começar.
4. **Gancho para o plano.** O fim do resultado retoma o que a pessoa contou
   (objetivo, negociação, sentimento) e lista o que o plano completo traz para
   o caso dela.
5. **Plano.** Depois do pagamento, a IA (Claude) escreve o plano com os números
   e com o contexto do quiz: o nome da situação, como a pessoa se sente e o que
   já tentou negociar.

O plano tem duas partes:

- **Parte personalizada**: os números são calculados por regras fixas
  (`lib/diagnostico.ts`) e o texto é escrito por IA (Claude) em cima deles.
- **Parte fixa**: o guia que acompanha todo plano (`lib/guia.ts`), com método,
  mensagens prontas para negociar, direitos, armadilhas e ajuda gratuita.

```
/  →  /diagnostico  →  /resultado  →  checkout  →  /plano
início   quiz (contato     situação +     Kiwify       plano completo
         + perguntas)      oferta                      (tela, PDF, link por e-mail)
```

**Onde roda:** na VPS (a mesma do Meu Santo Protetor), como o serviço
`folego` na porta 8020, com um banco SQLite em `/opt/folego/dados/folego.db`.
O domínio chega até ela pelo Cloudflare Tunnel. Passo a passo em
[COMO-SUBIR.md](COMO-SUBIR.md).

**Venda em espera.** Enquanto `KIWIFY_CHECKOUT` estiver vazio (e sem
`PAGAMENTO_MODO=teste`), o resultado mostra a oferta do plano como "Em breve",
sem preço nem botão. O diagnóstico gratuito funciona normalmente.

## Pagamento (Kiwify)

1. Ao clicar em comprar, o site grava um **pedido** no banco (as respostas do
   quiz) e manda a pessoa para `https://pay.kiwify.com.br/<KIWIFY_CHECKOUT>?sck=<ref>`.
2. A Kiwify avisa o servidor em `https://SEU-SITE/api/kiwify/<KIWIFY_WEBHOOK_SEGREDO>`.
   O aviso só é aceito com o segredo certo no endereço e, se `KIWIFY_TOKEN`
   estiver preenchido, com a assinatura certa.
3. A compra é ligada ao pedido pelo `sck`; se ele não voltar, pelo pedido mais
   recente do mesmo e-mail (7 dias). Quem pagou com outro e-mail pode informar
   o e-mail do pagamento na tela de espera. Quem pagou antes de fazer o quiz é
   ligado sozinho quando clica em comprar com o mesmo e-mail.
4. Depois do pagamento, a Kiwify manda a pessoa para `/plano` (página de
   obrigado). O plano é gerado ali, guardado no banco e fica no link
   `/plano?ref=...`, que abre em qualquer aparelho. Com a Resend configurada,
   esse link também vai por e-mail.
5. Reembolso e chargeback bloqueiam o pedido.

Avisos de **outros produtos** da mesma conta Kiwify são ignorados sem gravar
nada (o produto é reconhecido pelo nome, com `KIWIFY_PRODUTO`). **Mudar o nome
do produto na Kiwify sem atualizar `KIWIFY_PRODUTO` faz as vendas não serem
liberadas.**

## IA e créditos

- O plano é escrito pelo Claude (`claude-opus-5-5`) com as respostas do quiz:
  o nome da situação, os números, as dívidas, como a pessoa se sente, o que já
  tentou negociar e o objetivo. E-mail e telefone não vão para a IA.
- Custo estimado: uns US$ 0,10 a 0,25 por plano (de R$ 0,60 a R$ 1,50), num
  produto de R$ 29,90.
- **Uma chamada por venda.** O plano fica guardado: abrir de novo, recarregar
  ou abrir em outra aba não chama a IA. Se a IA falhar, a pessoa recebe a
  versão escrita por regras na hora e pode pedir a versão da IA mais 2 vezes
  (`MAX_GERACOES` em `lib/registros.ts`).
- **Se o crédito acabar, ninguém fica sem plano:** sai a versão por regras. O
  `folego-admin status` avisa quando isso aconteceu nas últimas 24 h.

## Leads (banco na VPS)

Cada etapa do funil é gravada no banco: uma ficha por e-mail na tabela `leads`
(nome, WhatsApp, primeira campanha, resumo do resultado, último evento) e o
histórico na tabela `eventos`.

| `evento` | Quando |
| --- | --- |
| `quiz_iniciado` | A pessoa preencheu o contato e começou |
| `quiz_concluido` | Respondeu tudo e viu o resultado (grava o resumo do resultado) |
| `checkout_iniciado` | Clicou em comprar (bom para recuperar venda) |
| `pix_gerado` | Kiwify: Pix ou boleto gerado e ainda não pago |
| `compra_recusada` | Kiwify: cartão recusado |
| `carrinho_abandonado` | Kiwify: abriu o checkout e não terminou |
| `compra_aprovada` | Kiwify: pagamento aprovado |
| `reembolso` | Kiwify: reembolso ou chargeback |
| `plano_gerado` | O plano foi gerado pela primeira vez |

Para ver e exportar, na VPS:

```bash
folego-admin status
```

```bash
folego-admin leads 30 > /root/leads.csv
```

```bash
folego-admin buscar EMAIL
```

O CSV tem dado pessoal: use, apague (`rm /root/leads.csv`) e não mande por
chat. Se quiser uma cópia dos eventos em outra ferramenta (Make, n8n, CRM),
preencha `LEADS_WEBHOOK_URL`: o mesmo JSON de antes continua sendo enviado.

## Rodar no computador

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Abra http://localhost:3000. Com `PAGAMENTO_MODO=teste` no `.env.local`, o
pagamento é simulado e nada é cobrado. Sem `ANTHROPIC_API_KEY`, o plano sai na
versão escrita por regras (sem o texto da IA), o que basta para testar o fluxo.

Testes e checagem de tipos:

```bash
npm test
```

```bash
npm run typecheck
```

## Configuração

Na VPS, em `/opt/folego/.env` (modelo comentado em `deploy/env.exemplo`).
Depois de mudar: `systemctl restart folego`.

| Variável | Para que serve |
| --- | --- |
| `SITE_URL` | Endereço público do site. Obrigatório na VPS (vai nos links do plano). |
| `CONTATO_EMAIL` | E-mail de atendimento mostrado no site. Vazio = o site não mostra e-mail. |
| `KIWIFY_CHECKOUT` | Código do checkout do produto. Com ele a venda abre. |
| `KIWIFY_WEBHOOK_SEGREDO` | Trecho secreto do endereço do webhook (gerado na instalação). |
| `KIWIFY_TOKEN` | Token do webhook na Kiwify, para conferir a assinatura. Aceita vários, separados por vírgula. |
| `KIWIFY_PRODUTO` | Trecho do nome do produto na Kiwify (padrão `folego`). |
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic. Liga o texto personalizado por IA. |
| `ANTHROPIC_MODEL` | Opcional. Padrão: `claude-opus-5-5`. |
| `RESEND_API_KEY`, `EMAIL_REMETENTE` | Opcionais. Mandam o link do plano por e-mail. |
| `LEADS_WEBHOOK_URL`, `LEADS_WEBHOOK_TOKEN` | Opcionais. Cópia dos leads em outra ferramenta. |
| `PAGAMENTO_MODO` | `teste` simula o pagamento. Só no computador, nunca na VPS. |

Nome do produto, preço e dias de garantia ficam em `lib/config.ts`. O preço
cobrado é o da Kiwify: mantenha os dois iguais.

## Publicar (VPS)

```bash
npm run empacotar
```

Gera `folego-vps.zip` (site compilado + instalador + serviço + `folego-admin`,
sem `.env`). A instalação e as atualizações estão em [COMO-SUBIR.md](COMO-SUBIR.md).

## Antes de vender

- [ ] Fazer uma compra real (Pix e cartão) e conferir se o plano é liberado e
      se `folego-admin buscar` mostra a compra ligada ao pedido. O formato do
      webhook da Kiwify foi escrito a partir do que conhecemos dela e testado
      com avisos simulados.
- [ ] Gerar alguns planos com a chave da Anthropic e ler o texto da IA com
      atenção, em casos diferentes (sem renda, só dívidas em dia, muitas dívidas).
- [ ] Revisar o aviso de uso do contato na primeira tela do quiz
      (`components/Quiz.tsx`) e a página de privacidade com quem cuida da LGPD
      (inclua razão social/CNPJ ou CPF de quem vende).
- [ ] Revisar os trechos legais de `lib/guia.ts`. Foram conferidos em novembro
      de 2026 (teto do rotativo, cheque especial, portabilidade, mínimo
      existencial de R$ 600, Desenrola), mas essas regras mudam.

## Como funciona por dentro

- **Banco SQLite na VPS** (`lib/db.ts`, com o SQLite que vem no Node). Leads,
  pedidos, compras e planos. As respostas do quiz em andamento continuam no
  navegador (`lib/armazenamento.ts`) até a pessoa clicar em comprar.
- **Situação por regras.** O nome da situação e os itens do plano mostrados
  na oferta saem de `lib/perfil.ts`, sem IA. A IA recebe esse mesmo perfil e
  continua dali no plano pago.
- **A IA não faz conta.** Totais, juros, ordem das dívidas e prazos saem de
  `lib/diagnostico.ts`. A IA recebe esses números prontos e só escreve
  (`lib/ia.ts`). Se a IA falhar ou recusar, o cliente recebe a versão escrita
  por regras (`lib/narrativa-padrao.ts`).
- **Juros estimados.** Quando o cliente não informa os juros, o cálculo usa
  taxas típicas por tipo de dívida (tabela `TIPOS_DIVIDA`). O cenário do plano
  supõe dívidas caras renegociadas para até 3,5% ao mês (`TAXA_APOS_NEGOCIACAO`).

## Limitações conhecidas

- Sem limite de requisições em `/api/lead` e `/api/checkout`: quem quiser pode
  encher o banco de leads falsos. Se acontecer, dá para limitar no Cloudflare
  (regras de rate limiting no domínio).
- Sem pixel de anúncios nem analytics (os UTMs ficam só no banco). Acrescente
  em `app/layout.tsx` se for anunciar, e atualize a página de privacidade.
- Sem e-mails de recuperação de venda (Pix não pago, carrinho abandonado): os
  eventos já ficam no banco; o agente de recuperação da própria Kiwify pode
  cuidar disso enquanto não houver um disparo próprio.

## Onde mexer

| Quero mudar | Arquivo |
| --- | --- |
| Nome, preço, garantia | `lib/config.ts` |
| Textos da página inicial | `app/page.tsx` |
| Perguntas e ordem do quiz | `components/Quiz.tsx`, `lib/rotulos.ts` |
| Nomes das situações e itens da oferta | `lib/perfil.ts` |
| Tela de resultado e oferta do plano | `components/Resultado.tsx` |
| Leads (banco e webhook) | `lib/leads.ts` |
| Webhook da Kiwify | `app/api/kiwify/[segredo]/route.ts`, `lib/kiwify.ts` |
| Pedidos, compras e limite de gerações da IA | `lib/registros.ts` |
| E-mail com o link do plano | `lib/email.ts` |
| Instalação na VPS e `folego-admin` | `deploy/` |
| Regras de cálculo e taxas | `lib/diagnostico.ts` |
| Instruções dadas à IA | `lib/ia.ts` |
| Guia fixo | `lib/guia.ts` |
| Meio de pagamento | `lib/pagamento.ts` |
| Cores e fontes | `app/globals.css` |
