import type { Respostas } from "./tipos";

/**
 * Caso fictício usado na página de vendas para mostrar o produto funcionando.
 * Os números exibidos lá saem do mesmo motor que calcula o plano real.
 */
export const EXEMPLO: Respostas = {
  nome: "Exemplo",
  rendaMensal: 3600,
  tipoRenda: "fixa",
  pessoasNaCasa: 3,
  gastos: {
    moradia: 1000,
    contas: 330,
    alimentacao: 800,
    transporte: 250,
    saude: 120,
    outros: 150,
  },
  dividas: [
    { id: "d1", tipo: "cartao", apelido: "", saldo: 4870, parcela: 0, situacao: "atraso_mais_90", jurosMes: null },
    { id: "d2", tipo: "cheque_especial", apelido: "", saldo: 1320, parcela: 0, situacao: "em_dia", jurosMes: null },
    { id: "d3", tipo: "emprestimo_pessoal", apelido: "", saldo: 6400, parcela: 420, situacao: "em_dia", jurosMes: null },
    { id: "d4", tipo: "contas_consumo", apelido: "", saldo: 380, parcela: 0, situacao: "atraso_ate_90", jurosMes: null },
  ],
  negativado: "sim",
  causas: ["cartao", "juros"],
  tentativa: "sem_acordo",
  sentimento: "preocupado",
  controle: "as_vezes",
  reserva: "nenhuma",
  rendaExtra: "talvez",
  objetivo: "limpar_nome",
};
