/**
 * Parte fixa do produto: o guia que acompanha todo plano, igual para todos os
 * clientes. Edite os textos aqui. Regras e valores legais citados foram
 * conferidos em novembro de 2026 — revise de tempos em tempos.
 */

export type BlocoGuia =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "marcar"; itens: string[] }
  | { tipo: "passos"; itens: { titulo: string; texto: string }[] }
  | { tipo: "topicos"; itens: { titulo: string; texto: string }[] }
  | { tipo: "mensagem"; quando: string; texto: string };

export interface CapituloGuia {
  id: string;
  titulo: string;
  resumo: string;
  blocos: BlocoGuia[];
}

export const GUIA: CapituloGuia[] = [
  {
    id: "passos",
    titulo: "Os sete passos para sair do vermelho",
    resumo: "O método por trás do seu plano, na ordem em que funciona.",
    blocos: [
      {
        tipo: "passos",
        itens: [
          {
            titulo: "Descubra tudo o que você deve",
            texto:
              "Dívida escondida não entra no plano. Peça o relatório gratuito do Banco Central (Registrato, no site Meu BC, com sua conta gov.br): ele lista empréstimos, cartões e financiamentos em seu nome em todos os bancos. Consulte também seu CPF na Serasa e no SPC, e some as contas de casa atrasadas.",
          },
          {
            titulo: "Estanque o vazamento",
            texto:
              "Enquanto entra dívida nova, nenhum plano funciona. Guarde o cartão de crédito em casa, tire-o dos aplicativos de compra e de transporte, peça ao banco para reduzir o limite do cheque especial e não faça nenhuma parcela nova.",
          },
          {
            titulo: "Proteja o essencial",
            texto:
              "Antes de qualquer credor vêm aluguel ou prestação da casa, luz, água, comida, transporte para trabalhar e pensão alimentícia. Banco espera. Despejo, corte de luz e pensão atrasada não esperam.",
          },
          {
            titulo: "Coloque as dívidas em fila",
            texto:
              "Primeiro o que corta serviço ou toma um bem, depois o que cobra mais juros. Pague o combinado nas outras e jogue tudo o que sobrar na primeira da fila. Quitou uma, o valor dela passa inteiro para a próxima.",
          },
          {
            titulo: "Negocie antes de pagar",
            texto:
              "Dívida atrasada quase nunca precisa ser paga pelo valor cheio. Peça a proposta à vista e a parcelada, compare o total e só feche parcela que caiba no seu mês ruim, não no mês bom.",
          },
          {
            titulo: "Dê um destino para cada real",
            texto:
              "No dia em que o dinheiro entra, separe em três potes: essencial, dívidas e respiro. O que não tem destino some.",
          },
          {
            titulo: "Monte um colchão e não volte",
            texto:
              "Assim que a dívida mais cara acabar, comece uma reserva pequena: primeiro R$ 500, depois um mês de gastos. É ela que impede o próximo imprevisto de virar dívida nova.",
          },
        ],
      },
    ],
  },
  {
    id: "negociar",
    titulo: "Como negociar com quem você deve",
    resumo: "Regras, canais e mensagens prontas para copiar.",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "Quem cobra tem meta para bater e margem para ceder. Você negocia melhor quando sabe três números antes de falar: quanto deve, quanto pode pagar por mês e quanto conseguiria juntar para uma proposta à vista.",
      },
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "Nunca aceite a primeira proposta",
            texto: "Agradeça, diga que não cabe e peça uma melhor. Se precisar, volte no dia seguinte.",
          },
          {
            titulo: "Pergunte sempre o valor à vista",
            texto: "Mesmo sem ter o dinheiro agora, ele mostra o tamanho do desconto possível.",
          },
          {
            titulo: "No parcelamento, olhe o total",
            texto:
              "Pergunte quanto você vai pagar somando todas as parcelas e qual é o CET, o custo efetivo total. Parcela baixa com prazo longo pode sair mais cara que a dívida original.",
          },
          {
            titulo: "Só feche parcela que cabe com folga",
            texto: "Acordo quebrado costuma perder o desconto e voltar ao valor antigo.",
          },
          {
            titulo: "Peça tudo por escrito",
            texto: "E-mail, aplicativo ou número de protocolo, antes de pagar qualquer coisa.",
          },
          {
            titulo: "Confira quem recebe",
            texto:
              "Pague só por boleto ou Pix em nome da empresa credora. Veja o nome e o CNPJ do recebedor antes de confirmar.",
          },
          {
            titulo: "Guarde os comprovantes",
            texto: "Ao terminar de pagar, peça a carta de quitação e guarde para sempre.",
          },
        ],
      },
      {
        tipo: "paragrafo",
        texto: "Onde negociar:",
      },
      {
        tipo: "lista",
        itens: [
          "Canais oficiais do credor: aplicativo, site ou central do banco, da loja ou da operadora.",
          "Serasa Limpa Nome e feirões de renegociação, que costumam ter os maiores descontos em dívidas antigas.",
          "consumidor.gov.br, plataforma pública em que a empresa precisa responder à sua proposta ou reclamação.",
          "Mutirões de negociação de Banco Central, Febraban e Procons, e o programa Desenrola quando houver fase aberta. Regras e prazos mudam: confira em gov.br se há uma etapa valendo para o seu caso.",
          "Procon da sua cidade ou estado, quando a empresa não responde ou a cobrança é abusiva.",
        ],
      },
      {
        tipo: "mensagem",
        quando: "Para abrir a conversa",
        texto:
          "Olá. Tenho uma dívida com vocês no CPF [seu CPF] e quero resolver. Podem me informar o valor atualizado, o valor para quitação à vista e as opções de parcelamento, com o total que eu pagaria em cada uma? Peço que enviem a proposta por escrito.",
      },
      {
        tipo: "mensagem",
        quando: "Quando você tem um valor guardado",
        texto:
          "Recebi a proposta de R$ [valor]. Consigo pagar R$ [seu valor] à vista, por Pix ou boleto, até o dia [data]. É o que tenho disponível. Conseguem aprovar esse valor para quitar a dívida inteira?",
      },
      {
        tipo: "mensagem",
        quando: "Quando só dá para parcelar",
        texto:
          "No meu orçamento cabem R$ [valor] por mês. Qual é a melhor condição que conseguem fazer com essa parcela? Preciso saber o número de parcelas, o valor total e a data do primeiro vencimento. Acima disso não vou conseguir manter o acordo.",
      },
      {
        tipo: "mensagem",
        quando: "Para sair do rotativo ou do cheque especial",
        texto:
          "Quero trocar minha dívida de [cartão ou cheque especial] por uma linha com juros menores. Qual é a taxa ao mês e o CET do parcelamento ou do crédito pessoal que vocês oferecem para isso? Vou comparar com a proposta de portabilidade de outro banco.",
      },
      {
        tipo: "mensagem",
        quando: "Quando a cobrança passa do limite",
        texto:
          "Reconheço a dívida e estou buscando uma forma de pagar. Peço que os contatos sejam feitos apenas comigo, neste número, em horário comercial. Ligações para meu trabalho, parentes ou vizinhos e mensagens com ameaça são proibidas pelo Código de Defesa do Consumidor, e vou registrar reclamação no Procon se continuarem.",
      },
      {
        tipo: "mensagem",
        quando: "Para alguém da família ou um amigo",
        texto:
          "Não esqueci do que te devo e quero combinar direito. Hoje consigo te pagar R$ [valor] todo dia [dia], até quitar. Se eu conseguir adiantar, adianto. Fica bom assim para você?",
      },
    ],
  },
  {
    id: "direitos",
    titulo: "Seus direitos, em português claro",
    resumo: "O que a lei garante a quem deve.",
    blocos: [
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "Juros do cartão têm teto",
            texto:
              "No rotativo e no parcelamento da fatura, juros e encargos não podem passar de 100% do valor original da dívida. Vale para dívidas feitas a partir de janeiro de 2024. Devia R$ 1.000? O total cobrado não pode passar de R$ 2.000.",
          },
          {
            titulo: "Rotativo dura no máximo um mês",
            texto:
              "Depois de 30 dias, o banco é obrigado a oferecer um parcelamento da fatura com juros menores que os do rotativo.",
          },
          {
            titulo: "Cheque especial tem limite de juros",
            texto:
              "O teto é de 8% ao mês para pessoas físicas e MEI. Continua caríssimo: é dívida para trocar por outra mais barata o quanto antes.",
          },
          {
            titulo: "Você pode levar a dívida para outro banco",
            texto:
              "A portabilidade de crédito é gratuita e vale também para dívida de cartão. Outro banco quita a dívida antiga e você passa a dever a ele, com juros menores. Peça propostas e compare o CET.",
          },
          {
            titulo: "Pagar antes dá desconto",
            texto:
              "Quem antecipa parcelas ou quita um empréstimo antes do prazo tem direito à redução proporcional dos juros.",
          },
          {
            titulo: "Cobrança tem limite",
            texto:
              "Ninguém pode ameaçar, expor ou constranger você por causa de dívida, nem cobrar no seu trabalho ou com parentes e vizinhos para envergonhar. Está no Código de Defesa do Consumidor.",
          },
          {
            titulo: "Negativação tem regras",
            texto:
              "Você deve ser avisado por escrito antes de o nome ir para o cadastro de inadimplentes, e o registro dura no máximo cinco anos. Pagou? O credor tem até cinco dias úteis para pedir a retirada. Em acordo parcelado, combine por escrito que o nome sai após a primeira parcela.",
          },
          {
            titulo: "Existe uma lei para quem não consegue pagar tudo",
            texto:
              "A Lei do Superendividamento permite reunir os credores de dívidas de consumo numa audiência e montar um plano único de pagamento de até cinco anos, preservando um valor mínimo para você viver (R$ 600 por mês em 2026, valor que o STF mandou revisar todos os anos). O pedido é feito no Procon, na Defensoria Pública ou no Tribunal de Justiça do seu estado. Ficam de fora, entre outras, financiamento imobiliário, dívidas com bem em garantia, impostos e pensão alimentícia.",
          },
        ],
      },
    ],
  },
  {
    id: "armadilhas",
    titulo: "Armadilhas que afundam mais",
    resumo: "Dez atalhos que parecem saída e não são.",
    blocos: [
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "Pagar só o mínimo do cartão",
            texto:
              "O resto vira dívida com os juros mais altos do mercado. Se não dá para pagar a fatura inteira, parcele a fatura ou troque por um crédito mais barato.",
          },
          {
            titulo: "Pegar empréstimo novo sem quitar o antigo",
            texto:
              "Trocar dívida cara por barata só funciona se o dinheiro for direto para a dívida cara, no mesmo dia.",
          },
          {
            titulo: "Pagar para limpar o nome",
            texto:
              "Quem cobra adiantado para limpar o nome ou aumentar o score está aplicando golpe. O nome só sai do cadastro com pagamento, acordo ou depois do prazo legal.",
          },
          {
            titulo: "Boleto e Pix falsos",
            texto:
              "Golpistas se passam por bancos e escritórios de cobrança. Negocie só pelos canais oficiais e confira quem recebe antes de pagar.",
          },
          {
            titulo: "Empréstimo que pede depósito antes",
            texto: "Nenhuma instituição séria cobra taxa adiantada para liberar crédito.",
          },
          {
            titulo: "Agiota",
            texto: "Juros fora da lei, cobrança com ameaça e nenhuma proteção. Não é saída.",
          },
          {
            titulo: "Emprestar o nome ou o cartão",
            texto: "A dívida é de quem assinou. Se a outra pessoa não pagar, quem fica negativado é você.",
          },
          {
            titulo: "Apostar para recuperar",
            texto:
              "Aposta não é renda. Se as apostas fazem parte do problema, peça a autoexclusão nas plataformas e procure apoio: Jogadores Anônimos e os CAPS do SUS atendem de graça.",
          },
          {
            titulo: "Esperar a dívida caducar",
            texto:
              "São até cinco anos com o nome negativado e o crédito travado, e o credor pode levar a cobrança à Justiça nesse período.",
          },
          {
            titulo: "Gastar o consignado, o FGTS ou o 13º",
            texto:
              "Esse é o dinheiro mais barato que você tem. Use para quitar dívida cara, nunca para consumo.",
          },
        ],
      },
    ],
  },
  {
    id: "potes",
    titulo: "O orçamento dos três potes",
    resumo: "Um jeito de organizar o mês que cabe em qualquer renda.",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "No dia em que o dinheiro entra, antes de qualquer gasto, divida em três partes. Pode ser em contas separadas, em caixinhas do aplicativo do banco ou em envelopes.",
      },
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "Essencial",
            texto: "Moradia, contas da casa, comida, transporte e saúde. Sai primeiro.",
          },
          {
            titulo: "Dívidas",
            texto:
              "O valor mensal do seu plano. Sai no mesmo dia, antes de aparecer outro destino para ele.",
          },
          {
            titulo: "Respiro",
            texto:
              "Um valor pequeno e fixo para lazer e imprevistos miúdos. Plano sem respiro quebra no segundo mês.",
          },
        ],
      },
      {
        tipo: "paragrafo",
        texto:
          "Sua renda varia? Monte os potes pelo seu pior mês recente. No mês bom, a diferença vai inteira para a primeira dívida da fila.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Reserve dez minutos por semana: abra o extrato, confira se os três potes estão de pé e anote o saldo de cada dívida. Ver o número cair é o que mantém o plano vivo.",
      },
    ],
  },
  {
    id: "checklist",
    titulo: "Checklist do mês",
    resumo: "Para repetir todo mês até a última dívida.",
    blocos: [
      {
        tipo: "marcar",
        itens: [
          "Separei os três potes no dia em que recebi",
          "Paguei o essencial e as parcelas dos acordos antes do vencimento",
          "Mandei a sobra para a primeira dívida da fila",
          "Não usei cartão de crédito nem cheque especial",
          "Não fiz nenhuma parcela nova",
          "Anotei o saldo atualizado de cada dívida",
          "Guardei os comprovantes do mês",
          "Pedi uma proposta nova ou avancei em uma negociação",
        ],
      },
    ],
  },
  {
    id: "ajuda",
    titulo: "Onde buscar ajuda de graça",
    resumo: "Serviços públicos e gratuitos que valem o contato.",
    blocos: [
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "Banco Central (Meu BC)",
            texto:
              "Relatório Registrato, com todas as suas dívidas em bancos, e canal de reclamação contra instituições financeiras.",
          },
          {
            titulo: "consumidor.gov.br",
            texto: "Reclamações e propostas para empresas, com prazo para resposta.",
          },
          {
            titulo: "Procon",
            texto: "Orientação, mediação com credores e atendimento a superendividados.",
          },
          {
            titulo: "Defensoria Pública",
            texto:
              "Advogado gratuito para quem não pode pagar, inclusive para revisão de contrato e superendividamento.",
          },
          {
            titulo: "CRAS",
            texto:
              "Cadastro em benefícios sociais e na tarifa social de energia e água, que aliviam o pote do essencial.",
          },
          {
            titulo: "CVV, telefone 188",
            texto: "Apoio emocional gratuito, 24 horas por dia. Dívida pesa, e conversar ajuda.",
          },
        ],
      },
    ],
  },
  {
    id: "glossario",
    titulo: "Glossário rápido",
    resumo: "As palavras que aparecem nas propostas e nos contratos.",
    blocos: [
      {
        tipo: "topicos",
        itens: [
          {
            titulo: "CET",
            texto:
              "Custo efetivo total. Soma juros, tarifas, seguros e impostos. É o número certo para comparar propostas.",
          },
          {
            titulo: "Rotativo",
            texto: "Crédito automático usado quando você paga menos que o total da fatura do cartão.",
          },
          {
            titulo: "Portabilidade",
            texto: "Transferência da dívida para outra instituição que ofereça condições melhores.",
          },
          {
            titulo: "Negativação",
            texto: "Inclusão do CPF em cadastros de inadimplentes, como Serasa e SPC.",
          },
          {
            titulo: "Score",
            texto: "Nota calculada pelos birôs de crédito com base no seu histórico de pagamentos.",
          },
          {
            titulo: "Multa e juros de mora",
            texto: "Encargos por atraso. No crédito ao consumidor, a multa é limitada a 2% da parcela.",
          },
          {
            titulo: "Carta de quitação",
            texto: "Documento em que o credor declara que a dívida foi paga.",
          },
        ],
      },
    ],
  },
];

export const AVISO_LEGAL =
  "Este material é educativo e foi gerado a partir das informações que você forneceu. As projeções são estimativas e não substituem orientação jurídica ou financeira individual. As regras citadas valem na data de geração do plano e podem mudar.";
