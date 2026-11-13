# Fôlego

Diagnóstico gratuito de dívidas, com um plano de quitação personalizado
(R$ 29,90) oferecido depois que a pessoa recebe o diagnóstico.

A página inicial fala só do diagnóstico gratuito. A pessoa responde a 7 passos
de perguntas e recebe o diagnóstico completo: números, juros de cada dívida, o
que mais pesa e por onde começar. Só então, no fim do resultado, conhece o
plano pago. O plano tem duas partes:

- **Parte personalizada**: os números são calculados por regras fixas
  (`lib/diagnostico.ts`) e o texto é escrito por IA (Claude) em cima deles.
- **Parte fixa**: o guia que acompanha todo plano (`lib/guia.ts`), com método,
  mensagens prontas para negociar, direitos, armadilhas e ajuda gratuita.

```
/  →  /diagnostico  →  /resultado  →  checkout  →  /plano
início   perguntas     diagnóstico     Mercado      plano completo
(grátis)               grátis + oferta Pago         (tela, PDF)
```

**Venda em espera.** Enquanto não houver meio de pagamento configurado
(`MERCADOPAGO_ACCESS_TOKEN` vazio e sem `PAGAMENTO_MODO=teste`), o resultado
mostra a oferta do plano como "Em breve", sem preço nem botão. O diagnóstico
gratuito funciona normalmente e não depende de nenhuma chave.

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
| `SITE_URL` | Opcional. Endereço público do site, usado na volta do pagamento. |
| `NEXT_PUBLIC_CONTATO_EMAIL` | E-mail de atendimento mostrado no site (garantia, rodapé, privacidade). Vazio = o site não mostra e-mail. |

Nome do produto, preço e dias de garantia ficam em `lib/config.ts`.

## Publicar (Vercel)

1. Importe este repositório na Vercel (framework: Next.js, sem ajustes).
2. Para o diagnóstico gratuito, nenhuma variável é obrigatória. Cadastre
   `NEXT_PUBLIC_CONTATO_EMAIL` quando tiver o e-mail de atendimento.
3. Para abrir a venda do plano, cadastre `ANTHROPIC_API_KEY` e
   `MERCADOPAGO_ACCESS_TOKEN` em *Settings → Environment Variables*, publique
   de novo e faça uma compra real de ponta a ponta antes de divulgar.
   **Não** cadastre `PAGAMENTO_MODO=teste` em produção: com ele o plano fica
   liberado sem cobrança.

A geração do plano pode levar mais de um minuto. A rota `/api/plano` pede até
300 segundos de execução, o que exige o Fluid Compute ativado no projeto (é o
padrão em projetos novos da Vercel).

## Antes de vender

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
  cliente (`lib/armazenamento.ts`). O servidor não guarda nada.
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
- Não há limite de uso nas rotas da API. Quem pagou pode pedir a geração do
  mesmo plano várias vezes, e cada pedido consome créditos da IA.
- Boleto fica de fora do checkout porque leva dias para compensar.
- Sem pixel de anúncios nem analytics. Acrescente em `app/layout.tsx` se for
  anunciar, e atualize a página de privacidade.

## Onde mexer

| Quero mudar | Arquivo |
| --- | --- |
| Nome, preço, garantia | `lib/config.ts` |
| Textos da página inicial | `app/page.tsx` |
| Tela do diagnóstico gratuito e oferta do plano | `components/Resultado.tsx` |
| Perguntas do questionário | `components/Questionario.tsx`, `lib/rotulos.ts` |
| Regras de cálculo e taxas | `lib/diagnostico.ts` |
| Instruções dadas à IA | `lib/ia.ts` |
| Guia fixo | `lib/guia.ts` |
| Meio de pagamento | `lib/pagamento.ts` |
| Cores e fontes | `app/globals.css` |
