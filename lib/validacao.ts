import { z } from "zod";
import { telefoneValido } from "./contato";
import { LIMITES } from "./limites";
import type { Contato, Origem, Respostas } from "./tipos";

const reais = z.number().finite().min(0).max(LIMITES.maxValor).transform((v) => Math.round(v));

/** Só letras, números, espaços e pontuação simples: o texto livre vai para o prompt da IA. */
function limparTexto(texto: string, max: number): string {
  return texto
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} .'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const divida = z.object({
  tipo: z.enum([
    "cartao",
    "cheque_especial",
    "emprestimo_pessoal",
    "consignado",
    "financiamento_veiculo",
    "financiamento_imovel",
    "contas_consumo",
    "crediario",
    "familia",
    "outro",
  ]),
  apelido: z.string().max(200).transform((t) => limparTexto(t, LIMITES.maxApelido)),
  saldo: reais.refine((v) => v >= 1, "Informe quanto você deve"),
  parcela: reais,
  situacao: z.enum(["em_dia", "atraso_ate_90", "atraso_mais_90"]),
  jurosMes: z.number().finite().min(0).max(30).nullable(),
});

const esquema = z.object({
  nome: z
    .string()
    .max(200)
    .transform((t) => limparTexto(t, LIMITES.maxNome))
    .refine((t) => t.length >= 1, "Informe seu nome"),
  rendaMensal: reais,
  tipoRenda: z.enum(["fixa", "variavel", "sem_renda"]),
  pessoasNaCasa: z.number().int().min(1).max(20),
  gastos: z.object({
    moradia: reais,
    contas: reais,
    alimentacao: reais,
    transporte: reais,
    saude: reais,
    outros: reais,
  }),
  dividas: z.array(divida).min(1).max(LIMITES.maxDividas),
  negativado: z.enum(["sim", "nao", "nao_sei"]),
  causas: z
    .array(z.enum(["perda_renda", "saude", "cartao", "familia", "juros", "negocio", "apostas", "impulso"]))
    .max(8),
  tentativa: z.enum(["nunca", "sem_acordo", "acordo_quebrado", "acordo_em_dia"]),
  sentimento: z.enum(["sem_dormir", "preocupado", "evito_pensar", "no_controle"]),
  controle: z.enum(["nenhum", "as_vezes", "sempre"]),
  reserva: z.enum(["nenhuma", "menos_1_mes", "mais_1_mes"]),
  rendaExtra: z.enum(["sim", "talvez", "nao"]),
  objetivo: z.enum(["limpar_nome", "parar_juros", "tranquilidade", "credito", "guardar"]),
});

/**
 * Valida e normaliza as respostas vindas do navegador. Devolve um objeto com
 * as chaves sempre na mesma ordem (o pedido é amarrado ao hash dele).
 */
export function sanitizarRespostas(entrada: unknown): Respostas | null {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) return null;
  const r = resultado.data;
  return {
    nome: r.nome,
    rendaMensal: r.tipoRenda === "sem_renda" ? 0 : r.rendaMensal,
    tipoRenda: r.tipoRenda,
    pessoasNaCasa: r.pessoasNaCasa,
    gastos: {
      moradia: r.gastos.moradia,
      contas: r.gastos.contas,
      alimentacao: r.gastos.alimentacao,
      transporte: r.gastos.transporte,
      saude: r.gastos.saude,
      outros: r.gastos.outros,
    },
    dividas: r.dividas.map((d, i) => ({
      id: `d${i + 1}`,
      tipo: d.tipo,
      apelido: d.apelido,
      saldo: d.saldo,
      parcela: Math.min(d.parcela, d.saldo),
      situacao: d.situacao,
      jurosMes: d.jurosMes,
    })),
    negativado: r.negativado,
    causas: [...new Set(r.causas)].sort(),
    tentativa: r.tentativa,
    sentimento: r.sentimento,
    controle: r.controle,
    reserva: r.reserva,
    rendaExtra: r.rendaExtra,
    objetivo: r.objetivo,
  };
}

const esquemaContato = z.object({
  nome: z
    .string()
    .max(200)
    .transform((t) => limparTexto(t, LIMITES.maxNomeCompleto))
    .refine((t) => t.length >= 2, "Informe seu nome"),
  email: z
    .string()
    .max(200)
    .transform((t) => t.trim().toLowerCase())
    .pipe(z.email()),
  telefone: z
    .string()
    .max(40)
    .transform((t) => t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
    .refine(telefoneValido, "Telefone inválido"),
});

export function sanitizarContato(entrada: unknown): Contato | null {
  const resultado = esquemaContato.safeParse(entrada);
  return resultado.success ? resultado.data : null;
}

const CHAVES_ORIGEM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"] as const;

/** Mantém só os parâmetros de campanha conhecidos, com texto curto. */
export function sanitizarOrigem(entrada: unknown): Origem {
  const saida: Origem = {};
  if (!entrada || typeof entrada !== "object") return saida;
  for (const chave of CHAVES_ORIGEM) {
    const valor = (entrada as Record<string, unknown>)[chave];
    if (typeof valor === "string" && valor.trim()) {
      saida[chave] = valor.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 200);
    }
  }
  return saida;
}
