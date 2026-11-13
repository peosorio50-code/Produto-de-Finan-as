/**
 * Identidade e oferta do produto. Para mudar nome, preço ou e-mail de
 * atendimento, altere aqui (o e-mail também aceita variável de ambiente).
 */
export const MARCA = {
  nome: "Fôlego",
  slogan: "Diagnóstico gratuito das suas dívidas",
  descricao:
    "Responda a algumas perguntas e veja, de graça, quanto suas dívidas custam por mês e por onde começar a sair delas.",
  /** Preço em centavos. 2990 = R$ 29,90. */
  precoCentavos: 2990,
  /** Nome que aparece na fatura do cartão do comprador (até 13 letras, sem acento). */
  nomeNaFatura: "FOLEGO",
  /** Vazio enquanto não houver e-mail definido: o site esconde os links de contato. */
  contatoEmail: process.env.NEXT_PUBLIC_CONTATO_EMAIL || "",
  garantiaDias: 7,
} as const;

export const PRECO_REAIS = MARCA.precoCentavos / 100;
