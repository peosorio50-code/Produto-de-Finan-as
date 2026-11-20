/** Resumo do resultado do quiz que vai junto com os eventos de lead (o servidor grava). */
import { TIPOS_DIVIDA } from "./diagnostico";
import { perfilDaSituacao } from "./perfil";
import { ROTULOS_CAUSA, ROTULOS_NEGATIVADO, ROTULOS_OBJETIVO, ROTULOS_SENTIMENTO, ROTULOS_TENTATIVA } from "./rotulos";
import type { Diagnostico, Respostas } from "./tipos";

export interface ResumoLead {
  perfil: string;
  nivel: number;
  nivelRotulo: string;
  rendaMensal: number;
  totalDividas: number;
  quantidadeDividas: number;
  tiposDeDivida: string[];
  jurosEstimadosMes: number;
  sobraMes: number;
  dividasEmAtraso: number;
  negativado: string;
  objetivo: string;
  sentimento: string;
  tentativaDeNegociacao: string;
  causas: string[];
}

export function resumirParaLead(r: Respostas, d: Diagnostico): ResumoLead {
  return {
    perfil: perfilDaSituacao(d).titulo,
    nivel: d.nivel,
    nivelRotulo: d.nivelRotulo,
    rendaMensal: d.renda,
    totalDividas: d.totalDividas,
    quantidadeDividas: d.quantidadeDividas,
    tiposDeDivida: [...new Set(r.dividas.map((x) => TIPOS_DIVIDA[x.tipo].rotulo))],
    jurosEstimadosMes: d.jurosEstimadosMes,
    sobraMes: d.sobraMes,
    dividasEmAtraso: d.dividasEmAtraso,
    negativado: ROTULOS_NEGATIVADO[r.negativado],
    objetivo: ROTULOS_OBJETIVO[r.objetivo],
    sentimento: ROTULOS_SENTIMENTO[r.sentimento],
    tentativaDeNegociacao: ROTULOS_TENTATIVA[r.tentativa],
    causas: r.causas.map((c) => ROTULOS_CAUSA[c]),
  };
}

