/**
 * Identidade e oferta do produto. Para mudar nome, preço ou e-mail de
 * atendimento, altere aqui (o e-mail também aceita variável de ambiente).
 */
export const MARCA = {
  nome: "Fôlego",
  slogan: "Diagnóstico das suas dívidas e plano para sair do vermelho",
  descricao:
    "Responda algumas perguntas e receba um diagnóstico das suas dívidas e um plano de quitação feito com os seus números.",
  /** Preço em centavos. 2990 = R$ 29,90. */
  precoCentavos: 2990,
  /** Nome que aparece na fatura do cartão do comprador (até 13 letras, sem acento). */
  nomeNaFatura: "FOLEGO",
  contatoEmail: process.env.NEXT_PUBLIC_CONTATO_EMAIL || "contato@seudominio.com.br",
  garantiaDias: 7,
} as const;

export const PRECO_REAIS = MARCA.precoCentavos / 100;
