/**
 * Parte da IA que roda no navegador (site estático no Cloudflare Pages):
 * - dadosParaIA: o JSON que vai para o servidor no checkout (o servidor Python
 *   manda esse JSON para o Claude quando o pagamento cai);
 * - conciliar: junta o texto da IA com a versão padrão, garantindo uma
 *   estratégia por dívida.
 * O prompt (SISTEMA) e o esquema ficam no servidor: mapadaalma/folego.py.
 */
import { perfilDaSituacao } from "./perfil";
import {
  ROTULOS_ACAO,
  ROTULOS_CAUSA,
  ROTULOS_CONTROLE,
  ROTULOS_NEGATIVADO,
  ROTULOS_OBJETIVO,
  ROTULOS_RENDA,
  ROTULOS_RENDA_EXTRA,
  ROTULOS_RESERVA,
  ROTULOS_SENTIMENTO,
  ROTULOS_SITUACAO,
  ROTULOS_TENTATIVA,
} from "./rotulos";
import type { Diagnostico, Narrativa, Respostas } from "./tipos";

/** O que o servidor devolve da IA (mesmos campos da Narrativa). */
export interface NarrativaIA {
  leitura: string[];
  pontosCriticos: { titulo: string; explicacao: string }[];
  primeiros7Dias: string[];
  plano30Dias: { semana: string; foco: string; acoes: string[] }[];
  estrategiaPorDivida: { dividaId: string; oQueFazer: string; comoNegociar: string; mensagemPronta: string }[];
  ondeCortar: { categoria: string; sugestao: string }[];
  proximos90Dias: string[];
  recado: string;
}

export function dadosParaIA(r: Respostas, d: Diagnostico) {
  const perfil = perfilDaSituacao(d);
  return {
    resultadoDoQuiz: { perfil: perfil.titulo, resumo: perfil.resumo },
    cliente: {
      nome: r.nome,
      pessoasNaCasa: r.pessoasNaCasa,
      renda: ROTULOS_RENDA[r.tipoRenda],
      nomeNegativado: ROTULOS_NEGATIVADO[r.negativado],
      comoChegouAqui: r.causas.map((c) => ROTULOS_CAUSA[c]),
      comoSeSente: ROTULOS_SENTIMENTO[r.sentimento],
      jaTentouNegociar: ROTULOS_TENTATIVA[r.tentativa],
      controleDosGastos: ROTULOS_CONTROLE[r.controle],
      reserva: ROTULOS_RESERVA[r.reserva],
      consegueRendaExtra: ROTULOS_RENDA_EXTRA[r.rendaExtra],
      objetivo: ROTULOS_OBJETIVO[r.objetivo],
    },
    diagnostico: {
      nivel: d.nivel,
      nivelRotulo: d.nivelRotulo,
      rendaMensal: d.renda,
      gastosMensais: d.gastosMes,
      parcelasPagasHoje: d.parcelasMes,
      sobraDoMes: d.sobraMes,
      totalDasDividas: d.totalDividas,
      parteDaRendaEmParcelas: d.comprometimento === null ? null : `${Math.round(d.comprometimento * 100)}%`,
      dividaEmMesesDeRenda: d.dividaEmMesesDeRenda === null ? null : Math.round(d.dividaEmMesesDeRenda * 10) / 10,
      jurosEstimadosPorMes: d.jurosEstimadosMes,
      dividasEmAtraso: d.dividasEmAtraso,
      saldoEmAtraso: d.saldoEmAtraso,
      ritmoAtual: {
        pagamentoMensal: d.ritmoAtual.pagamentoMensal,
        meses: d.ritmoAtual.meses,
        jurosTotais: d.ritmoAtual.meses === null ? null : d.ritmoAtual.jurosTotais,
      },
      plano: {
        viavel: d.planoViavel,
        pagamentoMensal: d.plano.pagamentoMensal,
        meses: d.planoViavel ? d.plano.meses : null,
        jurosTotais: d.planoViavel ? d.plano.jurosTotais : null,
        pagamentoParaQuitarEm3Anos: d.pagamentoParaQuitarEm3Anos,
        cortesSugeridosPorMes: d.cortesSugeridos,
        faltaPorMesParaCobrirParcelas: d.faltaMes,
        economiaDeJuros: d.planoViavel ? d.economiaDeJuros : null,
      },
      sinais: d.sinais,
    },
    dividas: d.dividas.map((x) => ({
      id: x.id,
      ordem: x.ordem,
      nome: x.rotulo,
      apelido: x.apelido || null,
      saldo: x.saldo,
      parcelaAtual: x.parcela,
      situacao: ROTULOS_SITUACAO[x.situacao],
      jurosAoMes: `${(x.taxa * 100).toFixed(1).replace(".", ",")}%`,
      taxaInformada: x.taxaInformada,
      jurosEstimadosPorMes: x.jurosEstimadosMes,
      acao: x.acao,
      acaoRotulo: ROTULOS_ACAO[x.acao],
      quitadaNoMesDoPlano: d.planoViavel ? x.quitadaNoMes : null,
    })),
    orcamento: d.orcamento.map((l) => ({
      grupo: l.rotulo,
      gastoAtual: l.atual,
      parteDaRenda: l.parteDaRenda === null ? null : `${Math.round(l.parteDaRenda * 100)}%`,
      acimaDoComum: l.acima,
      corteSugerido: l.corteSugerido,
      meta: l.meta,
    })),
  };
}


const LIMITE_TEXTO = 1600;

function aparar(texto: string): string {
  return texto.trim().slice(0, LIMITE_TEXTO);
}

/** Garante uma estratégia por dívida, na ordem da fila, completando com a versão padrão. */
/** O JSON vem de fora (servidor): garante que cada campo tem o tipo esperado. */
function normalizar(bruto: Partial<NarrativaIA>): NarrativaIA {
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    leitura: arr<string>(bruto.leitura).filter((x) => typeof x === "string"),
    pontosCriticos: arr<NarrativaIA["pontosCriticos"][number]>(bruto.pontosCriticos).filter((x) => x && typeof x.titulo === "string"),
    primeiros7Dias: arr<string>(bruto.primeiros7Dias).filter((x) => typeof x === "string"),
    plano30Dias: arr<NarrativaIA["plano30Dias"][number]>(bruto.plano30Dias)
      .filter((x) => x && typeof x.semana === "string")
      .map((x) => ({ ...x, acoes: arr<string>(x.acoes).filter((a) => typeof a === "string") })),
    estrategiaPorDivida: arr<NarrativaIA["estrategiaPorDivida"][number]>(bruto.estrategiaPorDivida).filter((x) => x && typeof x.dividaId === "string"),
    ondeCortar: arr<NarrativaIA["ondeCortar"][number]>(bruto.ondeCortar).filter((x) => x && typeof x.categoria === "string"),
    proximos90Dias: arr<string>(bruto.proximos90Dias).filter((x) => typeof x === "string"),
    recado: typeof bruto.recado === "string" ? bruto.recado : "",
  };
}

export function conciliar(ia: NarrativaIA, d: Diagnostico, padrao: Narrativa): Narrativa {
  ia = normalizar(ia);
  const porId = new Map(ia.estrategiaPorDivida.map((e) => [e.dividaId, e]));
  const lista = (itens: string[], reserva: string[], max: number) => {
    const limpos = itens.map(aparar).filter(Boolean).slice(0, max);
    return limpos.length > 0 ? limpos : reserva;
  };

  return {
    leitura: lista(ia.leitura, padrao.leitura, 4),
    pontosCriticos:
      ia.pontosCriticos.length > 0
        ? ia.pontosCriticos.slice(0, 4).map((p) => ({ titulo: aparar(p.titulo), explicacao: aparar(p.explicacao) }))
        : padrao.pontosCriticos,
    primeiros7Dias: lista(ia.primeiros7Dias, padrao.primeiros7Dias, 6),
    plano30Dias:
      ia.plano30Dias.length > 0
        ? ia.plano30Dias.slice(0, 4).map((s) => ({
            semana: aparar(s.semana),
            foco: aparar(s.foco),
            acoes: s.acoes.map(aparar).filter(Boolean).slice(0, 5),
          }))
        : padrao.plano30Dias,
    estrategiaPorDivida: d.dividas.map((divida) => {
      const e = porId.get(divida.id);
      const reserva = padrao.estrategiaPorDivida.find((p) => p.dividaId === divida.id)!;
      if (!e) return reserva;
      return {
        dividaId: divida.id,
        oQueFazer: aparar(e.oQueFazer) || reserva.oQueFazer,
        comoNegociar: aparar(e.comoNegociar) || reserva.comoNegociar,
        mensagemPronta: aparar(e.mensagemPronta) || reserva.mensagemPronta,
      };
    }),
    ondeCortar:
      ia.ondeCortar.length > 0
        ? ia.ondeCortar.slice(0, 6).map((c) => ({ categoria: aparar(c.categoria), sugestao: aparar(c.sugestao) }))
        : padrao.ondeCortar,
    proximos90Dias: lista(ia.proximos90Dias, padrao.proximos90Dias, 6),
    recado: aparar(ia.recado) || padrao.recado,
  };
}

