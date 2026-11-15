# Fôlego

Quiz gratuito sobre dívidas, que termina com a situação da pessoa e oferece um
plano de quitação personalizado (R$ 29,90), escrito por IA a partir das
respostas do quiz.

1. **Contato primeiro.** A primeira tela pede nome, e-mail e WhatsApp. Esse
   lead sai na hora para o seu webhook (`LEADS_WEBHOOK_URL`).
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
início   quiz (contato     situação +     Mercado      plano completo
         + perguntas)      oferta         Pago         (tela, PDF)
```

**Venda em espera.** Enquanto não houver meio de pagamento configurado
(`MERCADOPAGO_ACCESS_TOKEN` vazio e sem `PAGAMENTO_MODO=teste`), o resultado
mostra a oferta do plano como "Em breve", sem preço nem botão. O diagnóstico
gratuito funciona normalmente e não depende de nenhuma chave.

## Leads (webhook)

O site não tem banco de dados. Cada etapa do funil é enviada por `POST` em JSON
para `LEADS_WEBHOOK_URL`, com `Authorization: Bearer <LEADS_WEBHOOK_TOKEN>` se
o token estiver configurado:

| `evento` | Quando | O que vem junto |
| --- | --- | --- |
| `quiz_iniciado` | A pessoa preencheu o contato e começou | contato, origem |
| `quiz_concluido` | Respondeu tudo e viu o resultado | + `resultado` |
| `checkout_iniciado` | Clicou em comprar (bom para recuperar venda) | + `pedido` com o link de pagamento |
| `plano_gerado` | Pagou e o plano foi gerado | + `pedido` |

```json
{
  "evento": "quiz_concluido",
  "enviadoEm": "2026-11-15T22:47:03.000Z",
  "produto": "Fôlego",
  "contato": { "nome": "Ana Souza", "primeiroNome": "Ana", "email": "ana@exemplo.com.br",
               "telefone": "11912345678", "whatsapp": "5511912345678" },
  "origem": { "utm_source": "meta", "utm_campaign": "quiz" },
  "resultado": { "perfil": "Nome travado", "nivel": 3, "nivelRotulo": "Crítico",
                 "rendaMensal": 3600, "totalDividas": 12770, "quantidadeDividas": 3,
                 "tiposDeDivida": ["Cartão de crédito", "Empréstimo pessoal"],
                 "jurosEstimadosMes": 1055, "sobraMes": 1050, "dividasEmAtraso": 1,
                 "negativado": "Sim", "objetivo": "Limpar meu nome",
                 "sentimento": "Perco o sono, penso nisso o tempo todo",
                 "tentativaDeNegociacao": "Tentei, mas não chegamos a um acordo",
                 "causas": ["Os juros viraram bola de neve"] },
  "pedido": { "ref": "fl-…", "valor": 29.9, "linkPagamento": "https://…" }
}
```

- A `origem` traz os `utm_*`, `gclid` e `fbclid` da visita (guardados no
  navegador quando a pessoa chega por um link de campanha).
- O envio é feito depois da resposta ao navegador e nunca trava o quiz nem a
  compra. Se o webhook falhar, o erro aparece só no log do servidor.
- `plano_gerado` pode chegar mais de uma vez para o mesmo pedido (quem pede a
  versão da IA de novo). Use `pedido.ref` para não contar a venda em dobro.
- E-mail e telefone **não** vão para a IA. Ela recebe só o primeiro nome, os
  números e as respostas do quiz.

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

| Variável | Para que serve |
| --- | --- |
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic. É ela que liga o texto personalizado por IA. |
| `ANTHROPIC_MODEL` | Opcional. Modelo usado (padrão: `claude-opus-5-5`). |
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token de produção do Mercado Pago. Com ele o site cobra de verdade. |
| `PAGAMENTO_MODO` | `teste` simula o pagamento. Só vale quando não há token do Mercado Pago. |
| `LEADS_WEBHOOK_URL` | Webhook que recebe os leads do quiz (ver "Leads"). Vazio = leads não são enviados. |
| `LEADS_WEBHOOK_TOKEN` | Opcional. Vai no cabeçalho `Authorization: Bearer` do webhook. |
| `SITE_URL` | Opcional. Endereço público do site, usado na volta do pagamento. |
| `NEXT_PUBLIC_CONTATO_EMAIL` | E-mail de atendimento mostrado no site (garantia, rodapé, privacidade). Vazio = o site não mostra e-mail. |

Nome do produto, preço e dias de garantia ficam em `lib/config.ts`.

## Publicar (Vercel)

1. Importe este repositório na Vercel (framework: Next.js, sem ajustes).
2. Para o quiz funcionar, nenhuma variável é obrigatória. Para receber os
   leads, cadastre `LEADS_WEBHOOK_URL` (e, se quiser, `LEADS_WEBHOOK_TOKEN`).
   Cadastre `NEXT_PUBLIC_CONTATO_EMAIL` quando tiver o e-mail de atendimento.
3. Para abrir a venda do plano, cadastre `ANTHROPIC_API_KEY` e
   `MERCADOPAGO_ACCESS_TOKEN` em *Settings → Environment Variables*, publique
   de novo e faça uma compra real de ponta a ponta antes de divulgar.
   **Não** cadastre `PAGAMENTO_MODO=teste` em produção: com ele o plano fica
   liberado sem cobrança.

A geração do plano pode levar mais de um minuto. A rota `/api/plano` pede até
300 segundos de execução, o que exige o Fluid Compute ativado no projeto (é o
padrão em projetos novos da Vercel).

## Antes de vender

- [ ] Configurar o webhook de leads, fazer o quiz uma vez e conferir se os
      eventos chegam na sua ferramenta.
- [ ] Revisar o aviso de uso do contato na primeira tela do quiz
      (`components/Quiz.tsx`) e a página de privacidade com quem cuida da LGPD.
- [ ] Fazer uma compra real (Pix e cartão) e conferir se o plano é liberado.
      A integração com o Mercado Pago foi escrita a partir da documentação da
      API e testada só com respostas simuladas.
- [ ] Gerar alguns planos com a chave da Anthropic e ler o texto da IA com
      atenção, em casos diferentes (sem renda, só dívidas em dia, muitas dívidas).
- [ ] Trocar o e-mail de atendimento e revisar `app/privacidade/page.tsx`
      (inclua razão social/CNPJ ou CPF de quem vende).
- [ ] Revisar os trechos legais de `lib/guia.ts`. Foram conferidos em novembro
      de 2026 (teto do rotativo, cheque especial, portabilidade, mínimo
      existencial de R$ 600, Desenrola), mas essas regras mudam.
- [ ] Decidir sobre reembolso: o site promete devolução em 7 dias pelo e-mail
      de atendimento, e o estorno é feito por você no painel do Mercado Pago.

## Como funciona por dentro

- **Sem banco de dados.** Respostas, pedido e plano ficam no navegador do
  cliente (`lib/armazenamento.ts`). O servidor não guarda nada: o contato e o
  resumo do resultado só passam por ele a caminho do webhook (`lib/leads.ts`).
- **Situação por regras.** O nome da situação e os itens do plano mostrados
  na oferta saem de `lib/perfil.ts`, sem IA. A IA recebe esse mesmo perfil e
  continua dali no plano pago.
- **Pedido amarrado às respostas.** A referência enviada ao Mercado Pago
  carrega um resumo (hash) das respostas (`lib/pedido.ts`). Um pagamento libera
  só o plano daquelas respostas, e o servidor confere o pagamento direto na API
  do Mercado Pago antes de gerar (`lib/pagamento.ts`).
- **A IA não faz conta.** Totais, juros, ordem das dívidas e prazos saem de
  `lib/diagnostico.ts`. A IA recebe esses números prontos e só escreve
  (`lib/ia.ts`). Se a IA falhar ou recusar, o cliente recebe a versão escrita
  por regras (`lib/narrativa-padrao.ts`) e pode pedir a da IA de novo.
- **Juros estimados.** Quando o cliente não informa os juros, o cálculo usa
  taxas típicas por tipo de dívida (tabela `TIPOS_DIVIDA`). O cenário do plano
  supõe dívidas caras renegociadas para até 3,5% ao mês (`TAXA_APOS_NEGOCIACAO`).
  Ajuste esses números se quiser estimativas mais ou menos conservadoras.

## Limitações conhecidas

- O plano fica guardado só no navegador em que foi comprado. Quem trocar de
  aparelho ou limpar os dados perde o acesso (por isso o botão de salvar em PDF).
  Guardar os planos no servidor e enviar por e-mail é o próximo passo natural.
- O plano é entregue na tela (e em PDF), não por e-mail. Enviar por e-mail
  exige guardar o plano no servidor e um serviço de envio. Uma alternativa é
  disparar o e-mail pela sua ferramenta a partir do evento `plano_gerado`.
- Não há limite de uso nas rotas da API (inclusive `/api/lead`, que repassa ao
  webhook tudo o que tiver contato válido). Quem pagou pode pedir a geração do
  mesmo plano várias vezes, e cada pedido consome créditos da IA.
- Boleto fica de fora do checkout porque leva dias para compensar.
- Sem pixel de anúncios nem analytics (os UTMs vão só no webhook). Acrescente em `app/layout.tsx` se for
  anunciar, e atualize a página de privacidade.

## Onde mexer

| Quero mudar | Arquivo |
| --- | --- |
| Nome, preço, garantia | `lib/config.ts` |
| Textos da página inicial | `app/page.tsx` |
| Perguntas e ordem do quiz | `components/Quiz.tsx`, `lib/rotulos.ts` |
| Nomes das situações e itens da oferta | `lib/perfil.ts` |
| Tela de resultado e oferta do plano | `components/Resultado.tsx` |
| O que vai para o webhook de leads | `lib/leads.ts` |
| Regras de cálculo e taxas | `lib/diagnostico.ts` |
| Instruções dadas à IA | `lib/ia.ts` |
| Guia fixo | `lib/guia.ts` |
| Meio de pagamento | `lib/pagamento.ts` |
| Cores e fontes | `app/globals.css` |
