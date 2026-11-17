# Fôlego — documento de contexto

> Para quem vai trabalhar neste código (pessoa ou IA). Lê-se em uns 10 minutos e
> cobre o produto, o fluxo, a arquitetura, as regras de negócio e as decisões
> que não estão óbvias no código. Para o passo a passo de rodar e publicar, veja
> também o `README.md`.

---

## 1. O que é o produto

**Fôlego** é um site brasileiro para pessoas endividadas. Funciona como um funil:

1. **Quiz gratuito** (uma pergunta por tela, cartões de um toque) que começa
   pedindo **nome, e-mail e WhatsApp** (captura de lead).
2. **Resultado gratuito na tela**: dá um *nome* à situação da pessoa ("Bola de
   neve", "Nome travado", "No sufoco"...), um nível de 1 a 4 (Atenção, Alerta,
   Crítico, Emergência), os números principais, o que mais pesa e por onde
   começar.
3. **Oferta do plano pago** no fim do resultado: **R$ 29,90**, pagamento pelo
   **Mercado Pago** (Pix e cartão, sem boleto), garantia de 7 dias.
4. **Plano completo** entregue na tela (com opção de salvar em PDF pela
   impressão do navegador). Tem duas partes:
   - **Personalizada**: números calculados por regras fixas + texto escrito
     pela **IA (Claude, API da Anthropic)** em cima desses números.
   - **Fixa**: um guia igual para todos (método, como negociar, mensagens
     prontas, direitos do consumidor, armadilhas, ajuda gratuita, glossário).

Público: pessoa física endividada, muitas vezes ansiosa e com vergonha, lendo
no celular, com pouca familiaridade com termos financeiros. **Todo o texto do
site é em português do Brasil, simples, direto, sem julgamento e sem promessa
de resultado.** Isso vale para qualquer texto novo que você escrever.

### Estado atual

- Histórico: 3 commits. (1) criação do produto com questionário de 7 passos;
  (2) diagnóstico gratuito entregue antes da oferta, venda em espera "Em breve";
  (3) questionário virou **quiz com captura de lead** e webhook.
- **Venda em espera**: sem meio de pagamento configurado, a oferta aparece como
  "Em breve", sem preço nem botão. O quiz e o resultado funcionam sem nenhuma
  chave.
- A integração com o Mercado Pago foi escrita a partir da documentação e
  testada só com respostas simuladas; ainda falta uma compra real de ponta a
  ponta (ver checklist "Antes de vender" no README).
- Deploy previsto na **Vercel**.

---

## 2. Stack

| Item | Detalhe |
| --- | --- |
| Framework | **Next.js 16** (App Router), React 19, TypeScript estrito |
| Validação | Zod 4 |
| IA | `@anthropic-ai/sdk` (streaming, saída estruturada via Zod, fallback no servidor) |
| Pagamento | Mercado Pago Checkout Pro, via `fetch` direto na API REST (sem SDK) |
| Testes | Vitest (`tests/*.test.ts`), sem testes de componente |
| Estilo | CSS puro em `app/globals.css` (sem Tailwind, sem biblioteca de UI) |
| Fontes | `@fontsource-variable`: Bricolage Grotesque (títulos), Figtree (texto), Caveat (anotações "a caneta") |
| Banco de dados | **Nenhum** |

Comandos: `npm run dev`, `npm test`, `npm run typecheck`, `npm run build`.

> **Atenção (AGENTS.md):** esta versão do Next.js tem mudanças que quebram
> APIs e convenções antigas. Antes de escrever código de Next, leia o guia em
> `node_modules/next/dist/docs/`. Exemplos já usados no projeto: `after()` de
> `next/server` para trabalho depois da resposta, `connection()` para forçar
> renderização dinâmica, `searchParams` como `Promise` nas páginas.

---

## 3. Fluxo do usuário e rotas

```
/  →  /diagnostico  →  /resultado  →  checkout (Mercado Pago)  →  /plano
início   quiz           situação +       ou /pagamento-teste        plano completo
                        oferta
```

| Rota | Arquivo | O que faz |
| --- | --- | --- |
| `/` | `app/page.tsx` | Página inicial. Fala **só do quiz gratuito** (sem preço, sem mencionar o plano pago). Mostra um exemplo ilustrativo (`ExtratoAnotado` + `lib/exemplo.ts`) calculado pelo mesmo motor real. FAQ. |
| `/diagnostico` | `components/Quiz.tsx` | O quiz (componente cliente grande, ~830 linhas). |
| `/resultado` | `components/Resultado.tsx` | Resultado gratuito + oferta. A página server chama `connection()` e decide `vendaAberta` pelo ambiente. |
| `/plano` | `components/TelaPlano.tsx` + `PlanoDocumento.tsx` | Gera/mostra o plano pago. |
| `/pagamento-teste` | `app/pagamento-teste/page.tsx` | Substitui o Mercado Pago quando `PAGAMENTO_MODO=teste` (botões "aprovado"/"recusado"). Dá 404 fora do modo teste. |
| `/privacidade` | `app/privacidade/page.tsx` | Política de privacidade (precisa de revisão jurídica e dados de quem vende). |
| `POST /api/lead` | `app/api/lead/route.ts` | Recebe `quiz_iniciado` e `quiz_concluido` e repassa ao webhook. |
| `POST /api/checkout` | `app/api/checkout/route.ts` | Valida respostas, cria a referência do pedido e o link de pagamento; dispara `checkout_iniciado`. |
| `POST /api/plano` | `app/api/plano/route.ts` | Confere o pagamento, calcula, chama a IA e devolve o plano; dispara `plano_gerado`. `maxDuration = 300` (exige Fluid Compute na Vercel). |

### As telas do quiz (ordem)

Definidas em `montarTelas()` dentro de `components/Quiz.tsx`:

1. **contato** (nome, e-mail, WhatsApp), com aviso de uso dos dados
2. pessoas na casa
3. tipo de renda (fixa / variável / sem renda)
4. renda mensal (pulada se "sem renda")
5. gastos do mês (6 grupos: moradia, contas, alimentação, transporte, saúde e educação, outros)
6. tipos de dívida (múltipla escolha)
7. **uma tela por tipo de dívida escolhido** (saldo, parcela, situação, juros se souber)
8. nome negativado?
9. já tentou negociar?
10. o que causou (múltipla)
11. como se sente com as dívidas
12. controle de gastos
13. reserva de emergência
14. consegue renda extra?
15. objetivo principal

Depois da última, uma tela de "analisando" e redireciona para `/resultado`.
O rascunho do quiz é salvo no `localStorage` a cada mudança (com número de
versão: `VERSAO_RASCUNHO`), então a pessoa pode fechar e voltar.

Eventos de lead disparados pelo cliente com `fetch(..., { keepalive: true })`
e erro ignorado: o quiz nunca trava por causa do webhook.

### Fluxo do pagamento, em detalhe

1. `/resultado` → botão → `POST /api/checkout` com `{ respostas, contato, origem }`.
2. O servidor **normaliza** as respostas (`sanitizarRespostas`), gera
   `ref = fl-<12 hex aleatórios>-<16 hex do sha256 das respostas>` e cria a
   preferência no Mercado Pago (`external_reference = ref`), já com o comprador
   preenchido pelo contato do quiz.
3. O cliente guarda `{ ref, respostas normalizadas, urlPagamento }` no
   `localStorage` (`folego:pedido`) e vai para o checkout.
4. O Mercado Pago volta para `/plano?ref=...&payment_id=...`.
5. `/plano` → `POST /api/plano` com `{ ref, respostas, idPagamento, contato, origem }`.
6. O servidor confere que o hash da `ref` bate com as respostas, consulta o
   pagamento **direto na API do Mercado Pago** (primeiro por `payment_id`,
   depois busca por `external_reference`) e exige `status=approved`, mesma
   `ref`, BRL e valor ≥ preço.
7. Se pago: diagnostica, escreve a narrativa (IA ou padrão) e devolve o
   `PlanoCompleto`, que o cliente grava em `folego:plano:<ref>`.
8. Se ainda não pago (Pix demorando): responde `402`; o cliente tenta de novo
   sozinho a cada 5 s, por um número limitado de vezes.

---

## 4. Arquitetura e decisões-chave

Estas são as regras que sustentam o design. Mantenha-as ao mexer no código.

1. **Sem banco de dados.** Respostas, pedido e plano ficam só no navegador
   (`lib/armazenamento.ts`, chaves `folego:*`). O servidor é sem estado: o
   contato e o resumo do resultado só *passam* por ele a caminho do webhook.
2. **A IA não faz conta.** Todo número (totais, juros, ordem de ataque,
   cenários, prazos, orçamento, nível) sai de `lib/diagnostico.ts`, de forma
   determinística. A IA recebe os números prontos e só escreve texto. O prompt
   proíbe inventar taxas, prazos, percentuais de desconto ou projeções novas.
3. **O plano nunca falha para quem pagou.** Se a IA não estiver configurada,
   falhar, recusar ou devolver formato inválido, `escreverNarrativa` retorna
   `null` e o plano sai com `narrativaPadrao` (texto por regras,
   `lib/narrativa-padrao.ts`). `origemNarrativa: "ia" | "padrao"` indica qual
   foi usada; a tela permite pedir a versão da IA de novo.
4. **Pedido amarrado às respostas.** A `ref` carrega um hash das respostas
   normalizadas (`lib/pedido.ts`). Um pagamento libera só o plano daquelas
   respostas. Por isso `sanitizarRespostas` devolve as chaves **sempre na mesma
   ordem**, com ids `d1, d2...` e causas ordenadas: qualquer mudança na
   normalização muda o hash e invalida pedidos já feitos.
5. **Situação por regras.** O "nome da situação" e os itens da oferta saem de
   `lib/perfil.ts`, sem IA. A IA recebe esse mesmo perfil e continua dali.
6. **Contato não vai para a IA.** E-mail e telefone ficam fora de `Respostas`
   (tipo `Contato` separado). A IA recebe o primeiro nome, números e respostas.
   Texto livre (nome, apelido das dívidas) é limpo por `limparTexto` (só letras,
   números e pontuação simples) e o prompt manda tratá-lo como rótulo, nunca
   como instrução.
7. **Leads nunca travam nada.** `enviarLead` nunca lança erro, tem timeout de
   10 s e roda em `after()`, depois da resposta ao navegador.
8. **Meio de pagamento isolado.** `lib/pagamento.ts` expõe três funções
   (`modoPagamento`, `criarCheckout`, `pagamentoAprovado`). Para trocar de
   gateway, reescreva só esse arquivo mantendo essas assinaturas.
9. **Três modos de pagamento** (`modoPagamento()`):
   - `mercadopago`: `MERCADOPAGO_ACCESS_TOKEN` definido (sempre vence);
   - `teste`: sem token e `PAGAMENTO_MODO=teste` (libera o plano sem cobrar —
     **nunca em produção**);
   - `indisponivel`: nenhum dos dois → venda "Em breve".

---

## 5. Mapa dos arquivos

### `lib/` (lógica, sem React)

| Arquivo | Papel |
| --- | --- |
| `tipos.ts` | Todos os tipos: `Respostas`, `Divida`, `Contato`, `Origem`, `Diagnostico`, `DividaAnalisada`, `Cenario`, `Narrativa`, `PlanoCompleto`. Comece por aqui. |
| `config.ts` | `MARCA`: nome, slogan, preço em centavos (2990), nome na fatura, e-mail de contato, dias de garantia. `PRECO_REAIS`. |
| `diagnostico.ts` | **Motor de cálculo.** `diagnosticar(respostas) → Diagnostico`. Tabela `TIPOS_DIVIDA`, taxas típicas, simulação mês a mês, nível. |
| `perfil.ts` | `perfilDaSituacao(d)` (7 perfis), `ACOLHIMENTO` por sentimento, `itensDoPlano(r, d)` (bullets da oferta). |
| `narrativa-padrao.ts` | `narrativaPadrao(r, d)` (texto do plano sem IA) e `leituraGratuita(r, d)` (o que mais pesa + primeiro passo, usado no resultado grátis). |
| `ia.ts` | Prompt de sistema, esquema Zod da `Narrativa`, `dadosParaIA` (JSON enviado), `conciliar` (garante uma estratégia por dívida e corta textos a 1.600 caracteres), `escreverNarrativa`. |
| `guia.ts` | Parte fixa: `GUIA: CapituloGuia[]` com blocos tipados (parágrafo, lista, marcar, passos, tópicos, mensagem). Trechos legais conferidos em nov/2026. |
| `pagamento.ts` | Mercado Pago (ver seção 4). |
| `pedido.ts` | `criarReferencia`, `referenciaValida`, `referenciaCombina`. |
| `validacao.ts` | Zod: `sanitizarRespostas`, `sanitizarContato`, `sanitizarOrigem`. |
| `leads.ts` | `resumirParaLead`, `montarLead`, `enviarLead` (webhook). |
| `armazenamento.ts` | Leitura/escrita no `localStorage`, sempre em try/catch. |
| `rotulos.ts` | Textos de exibição de cada enum (`ROTULOS_*`). Usados na tela, no lead e no prompt. |
| `formato.ts` | `brl` (R$ 1.234, sem centavos), `brlCentavos`, `pct`, `pctTaxa`, `duracao`, `dataExtenso`, `mascaraTelefone`. |
| `contato.ts` | `telefoneValido` (DDD + 8/9 dígitos), `emailPareceValido`. Roda no cliente e no servidor. |
| `limites.ts` | Máx. 12 dívidas, valores até R$ 10 mi, tamanhos de nome/apelido. |
| `exemplo.ts` | Caso fictício da página inicial. |

### `components/` (React, quase todos cliente)

| Arquivo | Papel |
| --- | --- |
| `Quiz.tsx` | Quiz inteiro: estado do formulário, telas, validação por tela, rascunho, eventos de lead, conversão para `Respostas`. |
| `Resultado.tsx` | Resultado gratuito (perfil, nível, números, juros por dívida, primeiro passo, "o que você contou") + oferta / "Em breve" + chamada a `/api/checkout`. |
| `TelaPlano.tsx` | Máquina de estados do `/plano`: carregando, gerando, aguardando_pagamento, pronto, erro, sem_pedido. |
| `PlanoDocumento.tsx` | Renderiza o `PlanoCompleto` + o guia fixo, pronto para imprimir/PDF. |
| `Resumo.tsx` | `EscalaNivel`, `LinhasDiagnostico`, `FRASE_NIVEL`. |
| `Campos.tsx` | `CampoDinheiro`, `Cartoes` (escolha única), `CartoesMultiplos`. |
| `ExtratoAnotado.tsx` | Ilustração da home (extrato "anotado a caneta"). |
| `CapturaOrigem.tsx` | Grava `utm_*`, `gclid`, `fbclid` da URL no `localStorage` (montado no layout). |
| `Marca.tsx`, `Rodape.tsx` | Cabeçalho e rodapé. |

### `tests/`

- `diagnostico.test.ts`: motor de cálculo, ordem da fila, cenários, narrativa padrão, leitura gratuita, hash do pedido, validação.
- `ia.test.ts`: formato da chamada à API (servidor fake) e retorno `null` em recusa / formato inválido / API fora.
- `pagamento.test.ts`: modos, criação do checkout, comprador, `auto_return` só em https, aprovação só com valor e ref certos.
- `quiz.test.ts`: contato, máscara de telefone, origem, perfis, oferta, leads/webhook.

---

## 6. Regras de negócio do diagnóstico (`lib/diagnostico.ts`)

**Classes de dívida** (definem prioridade e ação):

| Tipo | Classe | Juros típicos/mês (em dia / atraso) |
| --- | --- | --- |
| Cartão de crédito | cara | 8,5% / 13% |
| Cheque especial | cara | 8% |
| Empréstimo pessoal | cara (parcela fixa) | 6% |
| Loja ou crediário | cara (parcela fixa) | 6% |
| Outra dívida | cara | 4% |
| Consignado | barata (parcela fixa) | 2% |
| Financiamento de veículo | garantia (parcela fixa) | 2% |
| Financiamento da casa | garantia (parcela fixa) | 0,9% |
| Contas atrasadas (luz, água, aluguel) | essencial | 1% |
| Família ou amigos | informal | 0% |

- Se a pessoa informa os juros, usa o informado (`taxaInformada: true`).
- Parcela fixa em dia sempre amortiza: a taxa estimada é limitada a
  `0,7 × parcela/saldo`.
- **Ordem de ataque**: essencial → garantia em atraso → caras → garantia em dia
  → barata → informal; desempate por maior taxa e depois menor saldo.
- **Ação por dívida** (`AcaoDivida`): `regularizar_ja`, `negociar_desconto`
  (atraso > 90 dias), `negociar_parcelamento`, `trocar_por_barata` (cartão e
  cheque especial em dia), `atacar`, `manter_em_dia`, `combinar`.
- **Orçamento**: referência por grupo (moradia 30%, contas 10%, alimentação
  20%, transporte 12%, saúde 10%, outros 8% da renda). Acima de 115% da
  referência sugere corte (10%; "outros" 30%, e sempre sugere enxugar
  "outros").
- **Dois cenários simulados mês a mês**:
  - *Ritmo atual*: só as parcelas de hoje, até 120 meses; cartão com teto de
    juros de 100% do saldo.
  - *Plano*: paga `renda − (gastos − cortes)`; dívidas caras renegociadas para
    no máx. **3,5% a.m.** (`TAXA_APOS_NEGOCIACAO`); a sobra rola para a primeira
    da fila (avalanche/bola de neve); até 180 meses.
- **Plano viável** = quita em até 60 meses, com pagamento > 0 e cobrindo as
  parcelas em dia. Se não for viável, calcula por busca binária
  `pagamentoParaQuitarEm3Anos` e liga `avaliarSuperendividamento`.
- **Nível** por pontos (comprometimento da renda, dívida em meses de renda,
  sobra, peso dos juros, atrasos, negativação): ≥ 9 → 4; ≥ 6 → 3; ≥ 3 → 2;
  senão 1. **Sem renda é sempre nível 4.**

**Perfis** (`lib/perfil.ts`, primeiro que bater): sem renda → "Sem renda, com
contas correndo"; sobra negativa → "No sufoco"; negativado + atraso > 90 →
"Nome travado"; alguma dívida com parcela ≤ juros → "Bola de neve";
parcelas > 30% da renda → "Renda no aperto"; tem cartão/cheque especial →
"Pagando caro para dever"; senão → "Sob controle, por enquanto".

---

## 7. A IA (`lib/ia.ts`)

- Modelo: variável `ANTHROPIC_MODEL`, com padrão definido em `lib/ia.ts`.
- Chamada: `client.beta.messages.stream(...)` com `max_tokens: 32000`,
  `output_config: { effort: "medium", format: betaZodOutputFormat(EsquemaNarrativa) }`,
  beta `server-side-fallback-2026-07-01` com `fallbacks: "default"` (se o
  modelo recusar, a API tenta outro), timeout 240 s, 1 retry.
- Aceita só `stop_reason === "end_turn"` com `parsed_output`; senão, `null`.
- Saída (`Narrativa`): `leitura` (2–3 parágrafos), `pontosCriticos` (3),
  `primeiros7Dias` (3–5), `plano30Dias` (4 semanas), `estrategiaPorDivida`
  (uma por dívida, com `mensagemPronta` para copiar e mandar ao credor),
  `ondeCortar`, `proximos90Dias`, `recado`.
- O prompt de sistema (em português) fixa: tom, uso do perfil do quiz,
  calibragem por `comoSeSente` e `jaTentouNegociar`, significado de cada ação,
  **só números do JSON**, lista fechada de regras legais e canais que podem ser
  citados (Registrato/Meu BC, Serasa Limpa Nome, consumidor.gov.br, Procon,
  Defensoria, CRAS, CVV 188, Jogadores Anônimos, CAPS), proibição de indicar
  bancos/apps/produtos, investimentos, apostas, agiotas ou crédito novo,
  e formato (texto simples, sem markdown, sem emoji).
- Se mudar a `Narrativa`, mude junto: `tipos.ts`, o esquema Zod e o prompt em
  `ia.ts`, `conciliar`, `narrativa-padrao.ts` e `PlanoDocumento.tsx`.

---

## 8. Leads (webhook)

Cada etapa vai por `POST` JSON para `LEADS_WEBHOOK_URL` (com
`Authorization: Bearer <LEADS_WEBHOOK_TOKEN>` se houver). Pensado para Make,
Zapier, n8n, Google Apps Script ou CRM.

| `evento` | Quando | Inclui |
| --- | --- | --- |
| `quiz_iniciado` | Preencheu o contato | contato, origem |
| `quiz_concluido` | Viu o resultado | + `resultado` (resumo recalculado no servidor) |
| `checkout_iniciado` | Clicou em comprar | + `pedido` com link de pagamento |
| `plano_gerado` | Pagou e o plano saiu | + `pedido` (pode repetir: deduplicar por `pedido.ref`) |

`contato` vem com `nome`, `primeiroNome`, `email`, `telefone` (só dígitos com
DDD) e `whatsapp` (`55` + telefone). Formato completo no README.

---

## 9. Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `ANTHROPIC_API_KEY` | Liga o texto por IA. Sem ela, plano sai na versão padrão. |
| `ANTHROPIC_MODEL` | Opcional, troca o modelo. |
| `MERCADOPAGO_ACCESS_TOKEN` | Cobrança real. |
| `PAGAMENTO_MODO` | `teste` simula pagamento (só sem token). Nunca em produção. |
| `LEADS_WEBHOOK_URL` / `LEADS_WEBHOOK_TOKEN` | Destino dos leads. |
| `SITE_URL` | Endereço público (volta do pagamento). |
| `NEXT_PUBLIC_CONTATO_EMAIL` | E-mail de atendimento; vazio = site esconde contato. |

Modelo em `.env.example`.

---

## 10. Convenções do código

- **Tudo em português**: nomes de variáveis, funções, arquivos, comentários,
  mensagens de commit (ex.: `diagnosticar`, `respostas`, `dividas`,
  `gravarPedido`). Mantenha o padrão.
- Comentários explicam o *porquê*, curtos, em português.
- Mensagens de commit: título no imperativo/presente em português
  ("Transforma o diagnóstico em quiz...") + lista do que mudou.
- Valores em reais como `number` inteiro (arredondados na validação); preço
  em centavos só em `config.ts`. Taxas como fração (`0.085` = 8,5%).
- Dinheiro exibido com `brl()` (R$ 1.234, sem centavos) — exceto preço, com
  `brlCentavos()`.
- Alias de import `@/` = raiz do projeto.
- Visual: "extrato impresso anotado a caneta azul". Dívida em vermelho,
  plano em azul ("sair do vermelho, ficar no azul"). Tokens de cor e tipo no
  `:root` de `app/globals.css`. Tema só claro.
- Copy de interface: frases curtas, "você", sem jargão sem explicação, sem
  promessa de resultado, sem culpa.

---

## 11. Limitações conhecidas e próximos passos naturais

- Plano guardado só no navegador onde foi comprado (trocar de aparelho = perde;
  por isso o PDF). Próximo passo natural: guardar no servidor e enviar por
  e-mail (ou disparar e-mail pela ferramenta de automação a partir de
  `plano_gerado`).
- Sem rate limit nas rotas da API; quem pagou pode gerar o plano várias vezes
  (custo de IA). `/api/lead` repassa qualquer contato válido.
- Sem webhook de notificação do Mercado Pago: a liberação depende do cliente
  voltar para `/plano` (com nova checagem automática para Pix).
- Boleto excluído (demora a compensar).
- Sem analytics/pixel (UTMs vão só no webhook). Se adicionar, atualizar a
  página de privacidade.
- Pendências antes de vender (README): testar webhook de leads, revisar aviso
  de uso do contato e privacidade (LGPD, razão social/CNPJ), compra real Pix e
  cartão, ler planos da IA em casos variados, revisar trechos legais de
  `lib/guia.ts`, definir processo de reembolso (estorno manual no painel do
  Mercado Pago).

---

## 12. Onde mexer (atalho)

| Quero mudar | Arquivo |
| --- | --- |
| Nome, preço, garantia | `lib/config.ts` |
| Textos da página inicial | `app/page.tsx` |
| Perguntas e ordem do quiz | `components/Quiz.tsx`, `lib/rotulos.ts` (+ `tipos.ts` e `validacao.ts` se mudar dados) |
| Nomes das situações e itens da oferta | `lib/perfil.ts` |
| Resultado e oferta | `components/Resultado.tsx` |
| Payload dos leads | `lib/leads.ts` |
| Cálculo e taxas | `lib/diagnostico.ts` |
| Instruções da IA | `lib/ia.ts` |
| Texto padrão sem IA | `lib/narrativa-padrao.ts` |
| Guia fixo | `lib/guia.ts` |
| Meio de pagamento | `lib/pagamento.ts` |
| Layout do plano / PDF | `components/PlanoDocumento.tsx` |
| Cores e fontes | `app/globals.css` |

**Ao acrescentar uma pergunta ao quiz**, mexa em: `tipos.ts` (`Respostas`),
`rotulos.ts`, `validacao.ts` (esquema **e** o objeto normalizado, na ordem),
`Quiz.tsx` (tela, validação, conversão), e se for usada: `perfil.ts`,
`ia.ts` (`dadosParaIA` e prompt), `leads.ts`, `lib/exemplo.ts` e os testes.
Lembre que `Resultado.tsx` descarta respostas salvas de versões antigas que
não tenham os campos novos.
