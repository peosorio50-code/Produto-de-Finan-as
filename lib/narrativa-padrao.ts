/**
 * Versão do texto personalizado escrita por regras, sem IA. É usada quando a
 * IA está indisponível, para o cliente nunca ficar sem o plano que pagou.
 */
import { TIPOS_DIVIDA } from "./diagnostico";
import { brl, duracao, pct, pctTaxa } from "./formato";
import type { CategoriaGasto, Diagnostico, DividaAnalisada, Narrativa, Respostas } from "./tipos";

function plural(n: number, um: string, varios: string): string {
  return n === 1 ? um : varios;
}

function minusculaInicial(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

function primeiroNome(nome: string): string {
  return nome.split(" ")[0] || nome;
}

const DICAS_CORTE: Record<CategoriaGasto, string> = {
  moradia:
    "Moradia pesa mais do que o comum na sua renda. Não é corte rápido, mas vale conversar com o proprietário sobre o aluguel ou avaliar uma opção mais barata no próximo reajuste.",
  contas:
    "Reveja o plano de celular e de internet, peça a tarifa social de energia se tiver direito e cancele pacotes que você paga e não usa.",
  alimentacao:
    "Planeje o cardápio da semana antes de ir ao mercado, compre com lista e troque a entrega de comida por marmita nos dias úteis.",
  transporte:
    "Junte deslocamentos no mesmo dia, compare o custo do carro com o do transporte público e evite corrida por aplicativo em horário de pico.",
  saude:
    "Pergunte por genéricos, use a Farmácia Popular e confira se o plano de saúde ou a escola aceitam renegociar a mensalidade.",
  outros:
    "Cancele as assinaturas que você não usa toda semana, defina um valor fixo de lazer por mês e espere 48 horas antes de qualquer compra fora da lista.",
};

function estrategia(d: DividaAnalisada, diag: Diagnostico): Narrativa["estrategiaPorDivida"][number] {
  const saldo = brl(d.saldo);
  const cabe = diag.pagamentoPlano > 0 ? brl(Math.max(50, Math.round(diag.pagamentoPlano * 0.6))) : null;
  const classe = TIPOS_DIVIDA[d.tipo].classe;
  const parcelaTexto = cabe
    ? `Consigo pagar até ${cabe} por mês.`
    : "Preciso de uma parcela bem baixa para conseguir cumprir.";
  const nomeDaDivida = minusculaInicial(d.rotulo);

  switch (d.acao) {
    case "regularizar_ja":
      return {
        dividaId: d.id,
        oQueFazer:
          "Vem primeiro porque atraso em conta essencial pode virar corte de serviço ou despejo. Procure a empresa ou o proprietário nesta semana e peça o parcelamento do valor atrasado.",
        comoNegociar:
          "Peça entrada baixa e parcelas somadas à conta do mês. Pergunte se você tem direito à tarifa social. Não deixe as contas novas atrasarem enquanto paga as antigas.",
        mensagemPronta: `Olá. Estou com contas em atraso que somam cerca de ${saldo} e quero regularizar para não ter o serviço interrompido. Quais são as opções de parcelamento com entrada pequena? ${parcelaTexto}`,
      };
    case "negociar_desconto":
      return {
        dividaId: d.id,
        oQueFazer:
          "Dívida com mais de três meses de atraso é a que mais recebe desconto. Não pague o valor cheio: peça a proposta à vista e a parcelada e compare o total das duas.",
        comoNegociar:
          "Comece pelo canal oficial do credor e pela Serasa Limpa Nome. Se conseguir juntar um valor, a proposta à vista costuma ser a mais barata. Recuse a primeira oferta e peça tudo por escrito antes de pagar.",
        mensagemPronta: `Olá. Tenho uma dívida de ${nomeDaDivida} em atraso no CPF [seu CPF], hoje em torno de ${saldo}, e quero quitar. Qual é o menor valor para pagamento à vista? Se eu precisar parcelar, ${minusculaInicial(parcelaTexto)} Peço a proposta por escrito.`,
      };
    case "negociar_parcelamento":
      return {
        dividaId: d.id,
        oQueFazer:
          classe === "garantia"
            ? "Há um bem em garantia neste contrato, e atraso pode terminar na retomada dele. Trate como urgente e procure o credor antes de a situação avançar."
            : "O atraso é recente: ainda dá para regularizar antes de os encargos crescerem e de o nome ser negativado.",
        comoNegociar:
          "Peça para incorporar as parcelas atrasadas ao contrato ou um novo parcelamento com valor que caiba. Pergunte o total a pagar e o CET antes de aceitar.",
        mensagemPronta: `Olá. Estou com parcelas em atraso no contrato de ${nomeDaDivida} (saldo de cerca de ${saldo}) e quero regularizar. Conseguem incluir o atrasado nas próximas parcelas ou refazer o parcelamento? ${parcelaTexto} Preciso do valor total e do CET por escrito.`,
      };
    case "trocar_por_barata":
      return {
        dividaId: d.id,
        oQueFazer: `É uma das dívidas mais caras que existem: pela estimativa, custa cerca de ${brl(d.jurosEstimadosMes)} por mês só de juros. O objetivo é tirar esse saldo daqui, levar para uma linha com juros bem menores e parar de usar esse crédito.`,
        comoNegociar:
          "Peça ao banco o parcelamento do saldo informando a taxa ao mês e o CET. Peça também uma proposta de portabilidade em outra instituição e feche a menor taxa com parcela que caiba.",
        mensagemPronta: `Olá. Tenho um saldo de cerca de ${saldo} em ${nomeDaDivida} e quero trocar por uma linha com juros menores. Qual é a taxa ao mês e o CET do parcelamento que vocês oferecem? ${parcelaTexto} Vou comparar com a proposta de portabilidade de outro banco.`,
      };
    case "atacar":
      return {
        dividaId: d.id,
        oQueFazer: `Está em dia, mas os juros são altos (${pctTaxa(d.taxa)} ao mês${d.taxaInformada ? "" : ", pela estimativa"}). Quando chegar a vez dela na fila, toda a sobra do mês vai para cá.`,
        comoNegociar:
          "Antecipar parcelas dá direito a desconto dos juros: peça o valor para antecipar começando pelas últimas. Vale pedir também uma proposta de portabilidade para uma taxa menor.",
        mensagemPronta: `Olá. Quero antecipar parcelas do meu contrato de ${nomeDaDivida}. Qual é o valor com desconto para antecipar as últimas parcelas, e qual é o saldo para quitação hoje?`,
      };
    case "manter_em_dia":
      return {
        dividaId: d.id,
        oQueFazer:
          classe === "garantia"
            ? "Continue pagando em dia: há um bem em garantia e os juros são baixos perto das outras. Não vale antecipar enquanto houver dívida mais cara na fila."
            : "É o crédito mais barato que você tem. Continue pagando normalmente e não antecipe enquanto houver dívida mais cara na fila.",
        comoNegociar:
          "Nada a negociar agora. Se a parcela apertar, procure o banco antes de atrasar e pergunte sobre pausa ou alongamento do prazo.",
        mensagemPronta: `Olá. Quero evitar atraso no meu contrato de ${nomeDaDivida}. Existe opção de pular uma parcela, alongar o prazo ou reduzir o valor mensal? Qual seria o custo total em cada caso?`,
      };
    case "combinar":
      return {
        dividaId: d.id,
        oQueFazer:
          "Não cobra juros, mas cobra a relação. Combine um valor fixo, mesmo pequeno, e cumpra. Fica por último na fila do dinheiro, não na da conversa.",
        comoNegociar:
          "Proponha um valor e um dia do mês que você consiga cumprir sempre. Se for atrasar, avise antes.",
        mensagemPronta:
          "Não esqueci do que te devo e quero combinar direito. Consigo te pagar R$ [valor] todo dia [dia], até quitar. Se eu conseguir adiantar, adianto. Fica bom assim para você?",
      };
  }
}

export function narrativaPadrao(r: Respostas, diag: Diagnostico): Narrativa {
  const nome = primeiroNome(r.nome);
  const primeira = diag.dividas[0];
  const segunda = diag.dividas[1];
  const s = diag.sinais;

  /* Leitura */
  const leitura: string[] = [];
  const total = `${brl(diag.totalDividas)} em ${diag.quantidadeDividas} ${plural(diag.quantidadeDividas, "dívida", "dívidas")}`;
  if (s.semRenda) {
    leitura.push(
      `${nome}, hoje você deve ${total} e está sem renda. Nesta fase o plano tem outra ordem: proteger o essencial, avisar os credores e renegociar tudo, sem assumir parcela que não dá para cumprir.`,
    );
  } else {
    const meses = diag.dividaEmMesesDeRenda ?? 0;
    const comp = diag.comprometimento ?? 0;
    leitura.push(
      `${nome}, hoje você deve ${total}. Isso equivale a ${meses < 1 ? "menos de um mês" : `cerca de ${Math.round(meses)} ${plural(Math.round(meses), "mês", "meses")}`} da sua renda, e as parcelas que você paga levam ${pct(comp)} do que entra.`,
    );
  }

  const ritmo =
    diag.ritmoAtual.meses === null
      ? "No ritmo de hoje as dívidas não acabam: os juros crescem mais rápido do que os pagamentos."
      : `No ritmo de hoje você levaria ${duracao(diag.ritmoAtual.meses)} para quitar tudo.`;
  leitura.push(
    `Pelas taxas típicas de cada tipo de dívida, cerca de ${brl(diag.jurosEstimadosMes)} por mês viram juros. ${ritmo}`,
  );

  if (diag.planoViavel && diag.plano.meses !== null) {
    leitura.push(
      `Com o plano, ${brl(diag.pagamentoPlano)} por mês vão para as dívidas, na ordem certa e com as mais caras renegociadas. A previsão é quitar tudo em ${duracao(diag.plano.meses)}. É uma estimativa, e cada desconto que você conseguir negociando encurta esse prazo.`,
    );
  } else if (diag.pagamentoPlano > 0 && diag.faltaMes === 0 && diag.pagamentoParaQuitarEm3Anos !== null) {
    leitura.push(
      `Só pagar não resolve: com ${brl(diag.pagamentoPlano)} por mês, os juros consomem quase tudo e a quitação levaria mais de cinco anos. Para acabar em três anos seriam necessários cerca de ${brl(diag.pagamentoParaQuitarEm3Anos)} por mês. Essa distância se fecha com desconto no valor das dívidas, renda extra e, se for preciso, a repactuação prevista na Lei do Superendividamento.`,
    );
  } else {
    const falta =
      diag.faltaMes > 0
        ? `mesmo com os cortes sugeridos, faltam ${brl(diag.faltaMes)} por mês para cobrir as parcelas que vencem`
        : "hoje não sobra valor suficiente para vencer os juros";
    leitura.push(
      `A conta ainda não fecha: ${falta}. Por isso seu plano tem dois focos ao mesmo tempo: renegociar as dívidas em conjunto, com parcelas que caibam, e aumentar a entrada de dinheiro.`,
    );
  }

  /* Pontos críticos */
  const pontos: Narrativa["pontosCriticos"] = [];
  if (s.contaNaoFecha && !s.semRenda) {
    pontos.push({
      titulo: "O mês fecha no negativo",
      explicacao: `Somando gastos e parcelas, faltam ${brl(-diag.sobraMes)} por mês. Enquanto isso não mudar, toda parcela acaba sendo paga com dívida nova.`,
    });
  }
  if (s.temCreditoCaro) {
    pontos.push({
      titulo: "Juros do cartão e do cheque especial",
      explicacao:
        "São os créditos mais caros do país. Cada mês que o saldo fica ali, uma parte grande do que você paga some em juros. Tirar a dívida desses dois lugares é a ação que mais muda o seu quadro.",
    });
  }
  if (s.temAtraso) {
    pontos.push({
      titulo: "Dívidas em atraso",
      explicacao: `${diag.dividasEmAtraso} ${plural(diag.dividasEmAtraso, "dívida em atraso soma", "dívidas em atraso somam")} ${brl(diag.saldoEmAtraso)}. Atraso antigo é onde aparecem os maiores descontos, então negociar vem antes de pagar.`,
    });
  }
  if (s.apostas) {
    pontos.push({
      titulo: "Apostas",
      explicacao:
        "Enquanto houver dinheiro indo para apostas, o plano perde para elas. Pedir a autoexclusão nas plataformas é o primeiro passo, e existe apoio gratuito nos Jogadores Anônimos e nos CAPS do SUS.",
    });
  }
  if (s.negativado) {
    pontos.push({
      titulo: "Nome negativado",
      explicacao:
        "A negativação trava crédito mais barato, que seria útil para trocar as dívidas caras. Ela sai quando a dívida registrada é paga ou entra em acordo.",
    });
  }
  if (s.semReserva) {
    pontos.push({
      titulo: "Nenhuma reserva",
      explicacao:
        "Sem dinheiro guardado, qualquer imprevisto vira dívida nova. Por isso o plano inclui uma reserva pequena assim que a dívida mais cara acabar.",
    });
  }
  if (s.semControle) {
    pontos.push({
      titulo: "Gastos sem registro",
      explicacao:
        "Sem anotar, é impossível saber de onde tirar o dinheiro das dívidas. Dez minutos por semana olhando o extrato já resolvem.",
    });
  }
  if (s.rendaVariavel) {
    pontos.push({
      titulo: "Renda que varia",
      explicacao:
        "Parcela fixa com renda variável é receita para acordo quebrado. Feche acordos pensando no seu pior mês, não no melhor.",
    });
  }

  if (pontos.length < 2) {
    pontos.push({
      titulo: "Juros correndo todo mês",
      explicacao: `Pela estimativa, cerca de ${brl(diag.jurosEstimadosMes)} por mês viram juros. Quanto antes a fila andar, menos desse dinheiro se perde.`,
    });
  }

  /* Primeiros 7 dias */
  const primeiros7Dias: string[] = [
    "Peça o relatório Registrato no site do Banco Central e consulte seu CPF na Serasa. Confirme se a lista de dívidas do plano está completa.",
  ];
  if (s.temCreditoCaro) {
    primeiros7Dias.push(
      "Tire o cartão de crédito da carteira e dos aplicativos e peça ao banco para reduzir o limite do cheque especial.",
    );
  }
  if (s.apostas) primeiros7Dias.push("Peça a autoexclusão nas plataformas de apostas que você usa.");
  if (primeira) {
    primeiros7Dias.push(
      `Faça o primeiro contato sobre ${minusculaInicial(primeira.rotulo)}, a primeira da sua fila, usando a mensagem pronta deste plano. Peça a proposta por escrito e não feche no primeiro dia.`,
    );
  }
  if (diag.pagamentoPlano > 0) {
    primeiros7Dias.push(
      `No próximo dia em que o dinheiro entrar, separe ${brl(diag.pagamentoPlano)} para as dívidas antes de qualquer outro gasto.`,
    );
  }

  /* Plano de 30 dias */
  const plano30Dias: Narrativa["plano30Dias"] = [
    {
      semana: "Semana 1",
      foco: "Arrumar a casa",
      acoes: [
        "Levante todas as dívidas com o Registrato e a consulta ao CPF.",
        "Pare de usar cartão de crédito e cheque especial.",
        "Anote todos os gastos da semana, sem julgar nenhum.",
      ],
    },
    {
      semana: "Semana 2",
      foco: "Primeira negociação",
      acoes: [
        primeira
          ? `Peça propostas para ${minusculaInicial(primeira.rotulo)}: valor à vista e parcelado, sempre por escrito.`
          : "Peça propostas por escrito para a primeira dívida da fila.",
        diag.cortesSugeridos > 0
          ? `Coloque em prática os cortes do plano, que liberam cerca de ${brl(diag.cortesSugeridos)} por mês.`
          : "Revise os gastos anotados e veja o que pode esperar alguns meses.",
      ],
    },
    {
      semana: "Semana 3",
      foco: "Fechar o que cabe",
      acoes: [
        "Compare as propostas pelo valor total, não pela parcela, e feche só o que cabe com folga.",
        segunda
          ? `Abra a conversa sobre ${minusculaInicial(segunda.rotulo)}, a segunda da fila.`
          : "Guarde o comprovante do acordo e anote as datas de vencimento.",
      ],
    },
    {
      semana: "Semana 4",
      foco: "Criar a rotina",
      acoes: [
        "Monte os três potes do próximo mês: essencial, dívidas e respiro.",
        "Anote o saldo atualizado de cada dívida.",
        "Marque no calendário dez minutos por semana para repetir essa conferência.",
      ],
    },
  ];

  /* Onde cortar */
  const ondeCortar: Narrativa["ondeCortar"] = diag.orcamento
    .filter((l) => l.corteSugerido > 0 || (l.acima && l.categoria === "moradia"))
    .map((l) => ({
      categoria: l.rotulo,
      sugestao:
        l.corteSugerido > 0
          ? `Hoje: ${brl(l.atual)} por mês. Meta: ${brl(l.meta)}. ${DICAS_CORTE[l.categoria]}`
          : DICAS_CORTE[l.categoria],
    }));
  if (ondeCortar.length === 0) {
    ondeCortar.push({
      categoria: "Orçamento enxuto",
      sugestao:
        "Seus gastos já estão dentro do comum para a sua renda. O ganho aqui vem de negociar juros e, se possível, de renda extra, não de cortar mais.",
    });
  }

  /* Próximos 90 dias */
  const proximos90Dias: string[] = [];
  const primeiraQuitada = diag.dividas.find((d) => d.quitadaNoMes !== null && d.quitadaNoMes > 0);
  if (diag.planoViavel && primeiraQuitada && primeiraQuitada.quitadaNoMes !== null) {
    proximos90Dias.push(
      `Pela simulação, ${minusculaInicial(primeiraQuitada.rotulo)} é a primeira a acabar, no mês ${primeiraQuitada.quitadaNoMes} do plano. Quando isso acontecer, o valor que ia para ela passa inteiro para a próxima da fila.`,
    );
  }
  proximos90Dias.push(
    "No segundo mês, repita os três potes e avance para a segunda negociação. No terceiro, revise os acordos: se algum apertou, peça para refazer antes de atrasar.",
  );
  if (r.rendaExtra !== "nao") {
    proximos90Dias.push(
      "Escolha uma fonte de renda extra para testar por 30 dias e mande tudo o que vier dela para a primeira dívida da fila.",
    );
  }
  if (s.avaliarSuperendividamento) {
    proximos90Dias.push(
      "Procure o Procon ou a Defensoria Pública e pergunte sobre a repactuação de dívidas da Lei do Superendividamento. Leve este plano e a lista de credores.",
    );
  }
  proximos90Dias.push(
    "Quando a dívida mais cara acabar, comece uma reserva de R$ 500 antes de acelerar as próximas.",
  );

  /* Recado */
  const porObjetivo: Record<Respostas["objetivo"], string> = {
    limpar_nome:
      "Você quer limpar o nome: ele sai dos cadastros quando cada dívida registrada é paga ou entra em acordo, então as negociações deste plano levam direto para lá.",
    parar_juros:
      "Você quer parar de pagar juros: a troca das dívidas caras por outras mais baratas é o passo que mais aproxima você disso.",
    tranquilidade:
      "Você quer voltar a dormir tranquilo: ter um número e uma fila já tira boa parte do peso, porque a dívida deixa de ser um susto e vira uma lista.",
    credito:
      "Você quer voltar a ter crédito: pagar em dia os acordos deste plano é o que reconstrói seu histórico.",
    guardar:
      "Você quer começar a guardar: a reserva entra no plano assim que a dívida mais cara acabar, e não antes.",
  };

  return {
    leitura,
    pontosCriticos: pontos.slice(0, 3),
    primeiros7Dias: primeiros7Dias.slice(0, 5),
    plano30Dias,
    estrategiaPorDivida: diag.dividas.map((d) => estrategia(d, diag)),
    ondeCortar,
    proximos90Dias,
    recado: `${porObjetivo[r.objetivo]} Um passo por semana é suficiente.`,
  };
}
