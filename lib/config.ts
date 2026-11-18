/**
 * Identidade e oferta do produto. Para mudar nome, preço ou e-mail de
 * atendimento, altere aqui (o e-mail também aceita variável de ambiente).
 */
export const MARCA = {
  nome: "Fôlego",
  slogan: "Quiz gratuito das suas dívidas",
  descricao:
    "Responda a um quiz rápido e descubra, de graça, a situação real das suas dívidas e por onde começar a sair delas.",
  /** Preço em centavos. 2990 = R$ 29,90. */
  precoCentavos: 2990,
  /** Nome que aparece na fatura do cartão do comprador (até 13 letras, sem acento). */
  nomeNaFatura: "FOLEGO",
  /**
   * E-mail de atendimento (variável CONTATO_EMAIL, lida no servidor quando o
   * site roda). Vazio enquanto não houver e-mail: o site esconde os links de
   * contato. Nos componentes que rodam no navegador ele chega por propriedade.
   */
  contatoEmail: process.env.CONTATO_EMAIL || "",
  garantiaDias: 7,
} as const;

export const PRECO_REAIS = MARCA.precoCentavos / 100;
