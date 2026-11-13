import type {
  AcaoDivida,
  Causa,
  Controle,
  Negativado,
  Objetivo,
  RendaExtra,
  Reserva,
  SituacaoDivida,
  TipoRenda,
} from "./tipos";

export const ROTULOS_SITUACAO: Record<SituacaoDivida, string> = {
  em_dia: "Em dia",
  atraso_ate_90: "Atrasada há até 3 meses",
  atraso_mais_90: "Atrasada há mais de 3 meses",
};

export const ROTULOS_RENDA: Record<TipoRenda, string> = {
  fixa: "Fixa (salário, aposentadoria ou pensão)",
  variavel: "Varia de mês para mês",
  sem_renda: "Estou sem renda no momento",
};

export const ROTULOS_NEGATIVADO: Record<Negativado, string> = {
  sim: "Sim",
  nao: "Não",
  nao_sei: "Não sei",
};

export const ROTULOS_CAUSA: Record<Causa, string> = {
  perda_renda: "Perdi renda ou emprego",
  saude: "Problema de saúde na família",
  cartao: "Perdi o controle do cartão",
  familia: "Ajudei alguém ou emprestei meu nome",
  juros: "Os juros viraram bola de neve",
  negocio: "Um negócio que não deu certo",
  apostas: "Apostas e jogos",
  impulso: "Compras por impulso",
};

export const ROTULOS_CONTROLE: Record<Controle, string> = {
  nenhum: "Não anoto nada",
  as_vezes: "Anoto de vez em quando",
  sempre: "Acompanho tudo",
};

export const ROTULOS_RESERVA: Record<Reserva, string> = {
  nenhuma: "Nenhuma",
  menos_1_mes: "Menos de um mês de gastos",
  mais_1_mes: "Um mês de gastos ou mais",
};

export const ROTULOS_RENDA_EXTRA: Record<RendaExtra, string> = {
  sim: "Sim, consigo",
  talvez: "Talvez, com esforço",
  nao: "Hoje não tenho como",
};

export const ROTULOS_OBJETIVO: Record<Objetivo, string> = {
  limpar_nome: "Limpar meu nome",
  parar_juros: "Parar de pagar juros",
  tranquilidade: "Voltar a dormir tranquilo",
  credito: "Conseguir crédito ou financiamento",
  guardar: "Começar a guardar dinheiro",
};

export const ROTULOS_ACAO: Record<AcaoDivida, string> = {
  regularizar_ja: "Regularizar já",
  negociar_desconto: "Negociar desconto",
  negociar_parcelamento: "Negociar parcelas",
  trocar_por_barata: "Trocar por dívida mais barata",
  atacar: "Antecipar com a sobra",
  manter_em_dia: "Manter em dia",
  combinar: "Combinar um valor fixo",
};
