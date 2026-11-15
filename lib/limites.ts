/** Limites das respostas, usados no formulário e na validação do servidor. */
export const LIMITES = {
  maxDividas: 12,
  maxValor: 10_000_000,
  maxNome: 40,
  maxNomeCompleto: 80,
  maxApelido: 30,
} as const;
