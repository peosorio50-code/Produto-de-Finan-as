/**
 * Faixas de valor do quiz. A pessoa escolhe uma faixa com um toque, em vez de
 * digitar um número que talvez não lembre. Cada faixa vira um valor
 * representativo (perto do meio da faixa) para o diagnóstico calcular.
 * Por isso os números do resultado e do plano são sempre aproximados.
 */
import type { CategoriaGasto, Gastos } from "./tipos";

export interface Faixa {
  rotulo: string;
  valor: number;
}

/** Quanto deve em uma dívida. */
export const FAIXAS_SALDO = {
  s1: { rotulo: "Até R$ 1 mil", valor: 600 },
  s2: { rotulo: "De R$ 1 mil a R$ 3 mil", valor: 2000 },
  s3: { rotulo: "De R$ 3 mil a R$ 5 mil", valor: 4000 },
  s4: { rotulo: "De R$ 5 mil a R$ 10 mil", valor: 7500 },
  s5: { rotulo: "De R$ 10 mil a R$ 20 mil", valor: 15000 },
  s6: { rotulo: "De R$ 20 mil a R$ 50 mil", valor: 35000 },
  s7: { rotulo: "De R$ 50 mil a R$ 150 mil", valor: 90000 },
  s8: { rotulo: "Mais de R$ 150 mil", valor: 200000 },
} satisfies Record<string, Faixa>;

/** Quanto paga por mês em uma dívida. */
export const FAIXAS_PARCELA = {
  p0: { rotulo: "Não estou pagando", valor: 0 },
  p1: { rotulo: "Até R$ 200", valor: 120 },
  p2: { rotulo: "De R$ 200 a R$ 500", valor: 350 },
  p3: { rotulo: "De R$ 500 a R$ 1.000", valor: 750 },
  p4: { rotulo: "De R$ 1.000 a R$ 2.000", valor: 1500 },
  p5: { rotulo: "Mais de R$ 2.000", valor: 2500 },
} satisfies Record<string, Faixa>;

/** Renda da casa por mês. "r0" é quem está sem renda. */
export const FAIXAS_RENDA = {
  r0: { rotulo: "Estou sem renda agora", valor: 0 },
  r1: { rotulo: "Até R$ 1.500", valor: 1200 },
  r2: { rotulo: "De R$ 1.500 a R$ 2.500", valor: 2000 },
  r3: { rotulo: "De R$ 2.500 a R$ 4.000", valor: 3200 },
  r4: { rotulo: "De R$ 4.000 a R$ 6.000", valor: 5000 },
  r5: { rotulo: "De R$ 6.000 a R$ 10.000", valor: 8000 },
  r6: { rotulo: "Mais de R$ 10.000", valor: 12000 },
} satisfies Record<string, Faixa>;

/** Quanto da renda as contas do dia a dia levam (sem contar parcelas de dívidas). */
export const FAIXAS_GASTOS = {
  g1: { rotulo: "Levam quase tudo", valor: 0.9 },
  g2: { rotulo: "Mais da metade", valor: 0.7 },
  g3: { rotulo: "Mais ou menos a metade", valor: 0.5 },
  g4: { rotulo: "Menos da metade", valor: 0.35 },
} satisfies Record<string, Faixa>;

/** Para quem está sem renda: quanto custa manter a casa por mês. */
export const FAIXAS_GASTOS_SEM_RENDA = {
  c1: { rotulo: "Até R$ 1.000", valor: 700 },
  c2: { rotulo: "De R$ 1.000 a R$ 2.000", valor: 1500 },
  c3: { rotulo: "De R$ 2.000 a R$ 3.500", valor: 2700 },
  c4: { rotulo: "Mais de R$ 3.500", valor: 4500 },
} satisfies Record<string, Faixa>;

export type ChaveSaldo = keyof typeof FAIXAS_SALDO;
export type ChaveParcela = keyof typeof FAIXAS_PARCELA;
export type ChaveRenda = keyof typeof FAIXAS_RENDA;
export type ChaveGastos = keyof typeof FAIXAS_GASTOS;
export type ChaveGastosSemRenda = keyof typeof FAIXAS_GASTOS_SEM_RENDA;

export function rotulos<T extends Record<string, Faixa>>(faixas: T): Record<keyof T & string, string> {
  return Object.fromEntries(Object.entries(faixas).map(([k, f]) => [k, f.rotulo])) as Record<keyof T & string, string>;
}

/**
 * Como um total de gastos costuma se dividir entre os grupos. Usado para
 * montar o orçamento a partir de uma única resposta; o plano avisa que a
 * divisão é estimada.
 */
const DIVISAO_TIPICA: Record<CategoriaGasto, number> = {
  moradia: 0.33,
  contas: 0.12,
  alimentacao: 0.25,
  transporte: 0.13,
  saude: 0.09,
  outros: 0.08,
};

export function dividirGastos(total: number): Gastos {
  const gastos = {} as Gastos;
  for (const [categoria, parte] of Object.entries(DIVISAO_TIPICA) as [CategoriaGasto, number][]) {
    gastos[categoria] = Math.round((total * parte) / 10) * 10;
  }
  return gastos;
}
