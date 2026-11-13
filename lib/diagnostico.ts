/**
 * Motor do diagnóstico. Tudo aqui é conta, sem IA: os números que aparecem
 * para o cliente saem deste arquivo, e a IA só escreve em cima deles.
 */
import type {
  AcaoDivida,
  CategoriaGasto,
  Cenario,
  Diagnostico,
  Divida,
  DividaAnalisada,
  LinhaOrcamento,
  Nivel,
  Respostas,
  TipoDivida,
} from "./tipos";

type Classe = "essencial" | "garantia" | "cara" | "barata" | "informal";

interface InfoTipo {
  rotulo: string;
  classe: Classe;
  /** Juros típicos ao mês quando a pessoa não informa os dela. */
  taxaEmDia: number;
  taxaAtraso: number;
  /** Parcelas fixas contratadas (o saldo cai todo mês se estiver em dia). */
  parcelaFixa: boolean;
}

export const TIPOS_DIVIDA: Record<TipoDivida, InfoTipo> = {
  cartao: { rotulo: "Cartão de crédito", classe: "cara", taxaEmDia: 0.085, taxaAtraso: 0.13, parcelaFixa: false },
  cheque_especial: { rotulo: "Cheque especial", classe: "cara", taxaEmDia: 0.08, taxaAtraso: 0.08, parcelaFixa: false },
  emprestimo_pessoal: { rotulo: "Empréstimo pessoal", classe: "cara", taxaEmDia: 0.06, taxaAtraso: 0.06, parcelaFixa: true },
  consignado: { rotulo: "Empréstimo consignado", classe: "barata", taxaEmDia: 0.02, taxaAtraso: 0.02, parcelaFixa: true },
  financiamento_veiculo: { rotulo: "Financiamento de veículo", classe: "garantia", taxaEmDia: 0.02, taxaAtraso: 0.02, parcelaFixa: true },
  financiamento_imovel: { rotulo: "Financiamento da casa", classe: "garantia", taxaEmDia: 0.009, taxaAtraso: 0.009, parcelaFixa: true },
  contas_consumo: { rotulo: "Contas atrasadas", classe: "essencial", taxaEmDia: 0.01, taxaAtraso: 0.01, parcelaFixa: false },
  crediario: { rotulo: "Loja ou crediário", classe: "cara", taxaEmDia: 0.06, taxaAtraso: 0.06, parcelaFixa: true },
  familia: { rotulo: "Família ou amigos", classe: "informal", taxaEmDia: 0, taxaAtraso: 0, parcelaFixa: false },
  outro: { rotulo: "Outra dívida", classe: "cara", taxaEmDia: 0.04, taxaAtraso: 0.04, parcelaFixa: false },
};

export const ROTULOS_GASTO: Record<CategoriaGasto, string> = {
  moradia: "Moradia",
  contas: "Contas da casa",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  saude: "Saúde e educação",
  outros: "Lazer, assinaturas e outros",
};

/** Parte da renda que cada grupo de gasto costuma ocupar num orçamento equilibrado. */
const REFERENCIA_GASTO: Record<CategoriaGasto, number> = {
  moradia: 0.3,
  contas: 0.1,
  alimentacao: 0.2,
  transporte: 0.12,
  saude: 0.1,
  outros: 0.08,
};

/** Corte inicial sugerido por grupo, quando o gasto está acima da referência. */
const CORTE_SUGERIDO: Record<CategoriaGasto, number> = {
  moradia: 0,
  contas: 0.1,
  alimentacao: 0.1,
  transporte: 0.1,
  saude: 0,
  outros: 0.3,
};

/**
 * Juros que o plano assume para as dívidas caras depois de renegociadas ou
 * trocadas por crédito mais barato. É uma hipótese conservadora, mostrada ao
 * cliente junto com a estimativa.
 */
export const TAXA_APOS_NEGOCIACAO = 0.035;

const HORIZONTE_RITMO_ATUAL = 120;
const HORIZONTE_PLANO = 180;
/** Acima deste prazo, pagar todo mês não basta: é caso de desconto ou repactuação. */
const PRAZO_MAXIMO_VIAVEL = 60;
const PRAZO_ALVO = 36;

export const ROTULOS_NIVEL: Record<Nivel, string> = {
  1: "Atenção",
  2: "Alerta",
  3: "Crítico",
  4: "Emergência",
};

function taxaDaDivida(d: Divida): { taxa: number; informada: boolean } {
  if (d.jurosMes !== null && d.jurosMes >= 0) return { taxa: d.jurosMes / 100, informada: true };
  const info = TIPOS_DIVIDA[d.tipo];
  let taxa = d.situacao === "em_dia" ? info.taxaEmDia : info.taxaAtraso;
  // Parcela fixa em dia sempre amortiza. Se a taxa típica diria o contrário,
  // ela está alta demais para este contrato: reduzimos a estimativa.
  if (info.parcelaFixa && d.situacao === "em_dia" && d.parcela > 0 && d.saldo > 0) {
    taxa = Math.min(taxa, (d.parcela / d.saldo) * 0.7);
  }
  return { taxa, informada: false };
}

function acaoDaDivida(d: Divida): AcaoDivida {
  const { classe } = TIPOS_DIVIDA[d.tipo];
  if (classe === "essencial") return "regularizar_ja";
  if (classe === "informal") return "combinar";
  if (classe === "barata") return d.situacao === "em_dia" ? "manter_em_dia" : "negociar_parcelamento";
  if (classe === "garantia") return d.situacao === "em_dia" ? "manter_em_dia" : "negociar_parcelamento";
  if (d.situacao === "atraso_mais_90") return "negociar_desconto";
  if (d.situacao === "atraso_ate_90") return "negociar_parcelamento";
  return d.tipo === "cartao" || d.tipo === "cheque_especial" ? "trocar_por_barata" : "atacar";
}

/** Menor número = atacar antes. */
function grupoDePrioridade(d: Divida): number {
  const { classe } = TIPOS_DIVIDA[d.tipo];
  if (classe === "essencial") return 0;
  if (classe === "garantia" && d.situacao !== "em_dia") return 1;
  if (classe === "cara") return 2;
  if (classe === "garantia") return 3;
  if (classe === "barata") return 4;
  return 5;
}

function rotulos(dividas: Divida[]): Map<string, string> {
  const porTipo = new Map<TipoDivida, number>();
  for (const d of dividas) porTipo.set(d.tipo, (porTipo.get(d.tipo) ?? 0) + 1);
  const contador = new Map<TipoDivida, number>();
  const saida = new Map<string, string>();
  for (const d of dividas) {
    const base = TIPOS_DIVIDA[d.tipo].rotulo;
    const n = (contador.get(d.tipo) ?? 0) + 1;
    contador.set(d.tipo, n);
    if (d.apelido) saida.set(d.id, `${base} (${d.apelido})`);
    else if ((porTipo.get(d.tipo) ?? 0) > 1) saida.set(d.id, `${base} ${n}`);
    else saida.set(d.id, base);
  }
  return saida;
}

interface ItemSimulacao {
  id: string;
  saldo: number;
  taxa: number;
  minimo: number;
  /** Saldo máximo que a dívida pode atingir (teto legal do cartão). */
  teto: number;
}

interface ResultadoSimulacao {
  meses: number | null;
  juros: number;
  pago: number;
  quitacoes: Map<string, number>;
}

/**
 * Simula mês a mês: os juros entram, os mínimos são pagos na ordem de
 * prioridade e, se `rolarSobra`, o que sobra vai para a primeira dívida da fila.
 */
function simular(
  itensIniciais: ItemSimulacao[],
  pagamentoMensal: number,
  ordem: string[],
  rolarSobra: boolean,
  horizonte: number,
): ResultadoSimulacao {
  const itens = new Map(itensIniciais.map((i) => [i.id, { ...i }]));
  const quitacoes = new Map<string, number>();
  let juros = 0;
  let pago = 0;

  for (const item of itens.values()) {
    if (item.saldo <= 0.005) quitacoes.set(item.id, 0);
  }
  if (quitacoes.size === itens.size) return { meses: 0, juros, pago, quitacoes };

  for (let mes = 1; mes <= horizonte; mes++) {
    for (const item of itens.values()) {
      if (item.saldo <= 0) continue;
      const j = Math.max(0, Math.min(item.saldo * item.taxa, item.teto - item.saldo));
      item.saldo += j;
      juros += j;
    }

    let disponivel = pagamentoMensal;
    for (const id of ordem) {
      const item = itens.get(id);
      if (!item || item.saldo <= 0) continue;
      const p = Math.min(item.minimo, item.saldo, disponivel);
      item.saldo -= p;
      disponivel -= p;
      pago += p;
    }
    if (rolarSobra) {
      for (const id of ordem) {
        if (disponivel <= 0) break;
        const item = itens.get(id);
        if (!item || item.saldo <= 0) continue;
        const p = Math.min(item.saldo, disponivel);
        item.saldo -= p;
        disponivel -= p;
        pago += p;
      }
    }

    for (const item of itens.values()) {
      if (item.saldo <= 0.005 && !quitacoes.has(item.id)) {
        item.saldo = 0;
        quitacoes.set(item.id, mes);
      }
    }
    if (quitacoes.size === itens.size) return { meses: mes, juros, pago, quitacoes };
  }
  return { meses: null, juros, pago, quitacoes };
}

function arredondar(valor: number): number {
  return Math.round(valor);
}

function pontuar(args: {
  renda: number;
  comprometimento: number | null;
  dividaEmMeses: number | null;
  sobra: number;
  jurosMes: number;
  atrasoLongo: boolean;
  atrasoCurto: boolean;
  negativado: boolean;
  semRenda: boolean;
}): number {
  let pontos = 0;
  const { renda, comprometimento, dividaEmMeses, sobra, jurosMes } = args;

  if (comprometimento !== null) {
    if (comprometimento > 0.5) pontos += 3;
    else if (comprometimento > 0.3) pontos += 2;
    else if (comprometimento > 0.15) pontos += 1;
  }
  if (dividaEmMeses !== null) {
    if (dividaEmMeses > 12) pontos += 3;
    else if (dividaEmMeses > 6) pontos += 2;
    else if (dividaEmMeses > 3) pontos += 1;
  }
  if (renda > 0) {
    if (sobra < 0) pontos += 3;
    else if (sobra < renda * 0.05) pontos += 2;
    else if (sobra < renda * 0.1) pontos += 1;

    const pesoJuros = jurosMes / renda;
    if (pesoJuros > 0.2) pontos += 2;
    else if (pesoJuros > 0.1) pontos += 1;
  }
  if (args.atrasoLongo) pontos += 2;
  else if (args.atrasoCurto) pontos += 1;
  if (args.negativado) pontos += 1;
  return pontos;
}

function nivelDosPontos(pontos: number, semRenda: boolean): Nivel {
  // Dívida sem nenhuma renda é emergência, qualquer que seja o resto.
  if (semRenda || pontos >= 9) return 4;
  if (pontos >= 6) return 3;
  if (pontos >= 3) return 2;
  return 1;
}

export function diagnosticar(r: Respostas): Diagnostico {
  const renda = r.tipoRenda === "sem_renda" ? 0 : r.rendaMensal;
  const categorias = Object.keys(ROTULOS_GASTO) as CategoriaGasto[];
  const gastosMes = categorias.reduce((soma, c) => soma + r.gastos[c], 0);
  const totalDividas = r.dividas.reduce((soma, d) => soma + d.saldo, 0);
  const parcelasMes = r.dividas.reduce((soma, d) => soma + d.parcela, 0);
  const sobraMes = renda - gastosMes - parcelasMes;

  /* Orçamento */
  const orcamento: LinhaOrcamento[] = categorias.map((categoria) => {
    const atual = r.gastos[categoria];
    const referencia = REFERENCIA_GASTO[categoria];
    const parteDaRenda = renda > 0 ? atual / renda : null;
    const acima = parteDaRenda !== null && parteDaRenda > referencia * 1.15;
    // "Outros" é o grupo mais flexível: sugerimos enxugar mesmo dentro da referência.
    const cortar = acima || (categoria === "outros" && atual > 0);
    const corteSugerido = cortar ? Math.floor((atual * CORTE_SUGERIDO[categoria]) / 10) * 10 : 0;
    return {
      categoria,
      rotulo: ROTULOS_GASTO[categoria],
      atual,
      parteDaRenda,
      referencia,
      acima,
      corteSugerido,
      meta: atual - corteSugerido,
    };
  });
  const cortesSugeridos = orcamento.reduce((soma, l) => soma + l.corteSugerido, 0);

  /* Dívidas: taxa, ação e ordem de ataque */
  const nomes = rotulos(r.dividas);
  const base = r.dividas.map((d) => {
    const { taxa, informada } = taxaDaDivida(d);
    return { divida: d, taxa, informada, grupo: grupoDePrioridade(d) };
  });
  const ordenadas = [...base].sort(
    (a, b) => a.grupo - b.grupo || b.taxa - a.taxa || a.divida.saldo - b.divida.saldo,
  );
  const ordem = ordenadas.map((x) => x.divida.id);

  const jurosEstimadosMes = base.reduce((soma, x) => soma + x.divida.saldo * x.taxa, 0);
  const emAtraso = r.dividas.filter((d) => d.situacao !== "em_dia");
  const saldoEmAtraso = emAtraso.reduce((soma, d) => soma + d.saldo, 0);

  /* Cenário 1: continuar como está (só as parcelas que paga hoje) */
  const simAtual = simular(
    base.map((x) => ({
      id: x.divida.id,
      saldo: x.divida.saldo,
      taxa: x.taxa,
      minimo: x.divida.parcela,
      teto: x.divida.tipo === "cartao" ? x.divida.saldo * 2 : Infinity,
    })),
    parcelasMes,
    ordem,
    false,
    HORIZONTE_RITMO_ATUAL,
  );

  /* Cenário 2: o plano (cortes + sobra direcionada + dívidas caras renegociadas) */
  const pagamentoPlano = Math.max(0, arredondar(renda - (gastosMes - cortesSugeridos)));
  const minimosEmDia = r.dividas
    .filter((d) => d.situacao === "em_dia")
    .reduce((soma, d) => soma + d.parcela, 0);
  const faltaMes = Math.max(0, arredondar(minimosEmDia - pagamentoPlano));

  const itensPlano: ItemSimulacao[] = base.map((x) => {
    const cara = TIPOS_DIVIDA[x.divida.tipo].classe === "cara";
    return {
      id: x.divida.id,
      saldo: x.divida.saldo,
      taxa: cara ? Math.min(x.taxa, TAXA_APOS_NEGOCIACAO) : x.taxa,
      minimo: x.divida.situacao === "em_dia" ? x.divida.parcela : 0,
      teto: Infinity,
    };
  });
  const simPlano = simular(itensPlano, pagamentoPlano, ordem, true, HORIZONTE_PLANO);
  const planoViavel =
    pagamentoPlano > 0 && faltaMes === 0 && simPlano.meses !== null && simPlano.meses <= PRAZO_MAXIMO_VIAVEL;

  // Quando só pagar não resolve, mostramos o tamanho da distância: quanto
  // seria preciso por mês para acabar em três anos.
  let pagamentoParaQuitarEm3Anos: number | null = null;
  if (!planoViavel) {
    let baixo = 0;
    let alto = itensPlano.reduce((soma, i) => soma + i.saldo * (1 + i.taxa), 0) + 1;
    for (let i = 0; i < 40; i++) {
      const meio = (baixo + alto) / 2;
      if (simular(itensPlano, meio, ordem, true, PRAZO_ALVO).meses === null) baixo = meio;
      else alto = meio;
    }
    pagamentoParaQuitarEm3Anos = Math.ceil(alto / 10) * 10;
  }

  const cenario = (sim: ResultadoSimulacao, pagamentoMensal: number): Cenario => ({
    pagamentoMensal: arredondar(pagamentoMensal),
    meses: sim.meses,
    jurosTotais: sim.meses === null ? 0 : arredondar(sim.juros),
    totalPago: sim.meses === null ? 0 : arredondar(sim.pago),
  });
  const ritmoAtual = cenario(simAtual, parcelasMes);
  const plano = cenario(simPlano, pagamentoPlano);
  const economiaDeJuros =
    ritmoAtual.meses !== null && plano.meses !== null
      ? Math.max(0, ritmoAtual.jurosTotais - plano.jurosTotais)
      : null;

  const dividas: DividaAnalisada[] = ordenadas.map((x, i) => ({
    ...x.divida,
    ordem: i + 1,
    rotulo: nomes.get(x.divida.id) ?? TIPOS_DIVIDA[x.divida.tipo].rotulo,
    taxa: x.taxa,
    taxaInformada: x.informada,
    jurosEstimadosMes: arredondar(x.divida.saldo * x.taxa),
    acao: acaoDaDivida(x.divida),
    quitadaNoMes: simPlano.quitacoes.get(x.divida.id) ?? null,
  }));

  /* Nível */
  const comprometimento = renda > 0 ? parcelasMes / renda : null;
  const dividaEmMesesDeRenda = renda > 0 ? totalDividas / renda : null;
  const semRenda = renda <= 0;
  const negativado = r.negativado === "sim";
  const pontos = pontuar({
    renda,
    comprometimento,
    dividaEmMeses: dividaEmMesesDeRenda,
    sobra: sobraMes,
    jurosMes: jurosEstimadosMes,
    atrasoLongo: r.dividas.some((d) => d.situacao === "atraso_mais_90"),
    atrasoCurto: r.dividas.some((d) => d.situacao === "atraso_ate_90"),
    negativado,
    semRenda,
  });
  const nivel = nivelDosPontos(pontos, semRenda);

  return {
    nivel,
    nivelRotulo: ROTULOS_NIVEL[nivel],
    pontos,
    renda,
    totalDividas: arredondar(totalDividas),
    quantidadeDividas: r.dividas.length,
    parcelasMes: arredondar(parcelasMes),
    gastosMes: arredondar(gastosMes),
    sobraMes: arredondar(sobraMes),
    comprometimento,
    dividaEmMesesDeRenda,
    jurosEstimadosMes: arredondar(jurosEstimadosMes),
    saldoEmAtraso: arredondar(saldoEmAtraso),
    dividasEmAtraso: emAtraso.length,
    cortesSugeridos,
    pagamentoPlano,
    faltaMes,
    ritmoAtual,
    plano,
    planoViavel,
    pagamentoParaQuitarEm3Anos,
    economiaDeJuros,
    dividas,
    orcamento,
    sinais: {
      contaNaoFecha: sobraMes < 0,
      semRenda,
      rendaVariavel: r.tipoRenda === "variavel",
      negativado,
      temAtraso: emAtraso.length > 0,
      temCreditoCaro: r.dividas.some((d) => d.tipo === "cartao" || d.tipo === "cheque_especial"),
      apostas: r.causas.includes("apostas"),
      semReserva: r.reserva === "nenhuma",
      semControle: r.controle === "nenhum",
      avaliarSuperendividamento: !planoViavel,
    },
  };
}
