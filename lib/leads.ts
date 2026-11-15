/**
 * Envio dos leads do quiz para fora do site. O site não tem banco de dados:
 * cada evento é enviado por webhook (LEADS_WEBHOOK_URL) para a ferramenta que
 * você usar (Make, Zapier, n8n, planilha Google, CRM...).
 */
import { MARCA, PRECO_REAIS } from "./config";
import { TIPOS_DIVIDA } from "./diagnostico";
import { perfilDaSituacao } from "./perfil";
import { ROTULOS_CAUSA, ROTULOS_NEGATIVADO, ROTULOS_OBJETIVO, ROTULOS_SENTIMENTO, ROTULOS_TENTATIVA } from "./rotulos";
import type { Contato, Diagnostico, Origem, Respostas } from "./tipos";

export type EventoLead = "quiz_iniciado" | "quiz_concluido" | "checkout_iniciado" | "plano_gerado";

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

export interface Lead {
  evento: EventoLead;
  enviadoEm: string;
  produto: string;
  contato: {
    nome: string;
    primeiroNome: string;
    email: string;
    /** Só dígitos, com DDD. */
    telefone: string;
    /** Formato internacional, pronto para link de WhatsApp: 5511912345678 */
    whatsapp: string;
  };
  origem: Origem;
  resultado?: ResumoLead;
  pedido?: { ref: string; valor: number; linkPagamento?: string };
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

export function montarLead(args: {
  evento: EventoLead;
  contato: Contato;
  origem?: Origem;
  resultado?: ResumoLead;
  pedido?: { ref: string; linkPagamento?: string };
}): Lead {
  const { contato } = args;
  return {
    evento: args.evento,
    enviadoEm: new Date().toISOString(),
    produto: MARCA.nome,
    contato: {
      nome: contato.nome,
      primeiroNome: contato.nome.split(" ")[0],
      email: contato.email,
      telefone: contato.telefone,
      whatsapp: `55${contato.telefone}`,
    },
    origem: args.origem ?? {},
    ...(args.resultado && { resultado: args.resultado }),
    ...(args.pedido && { pedido: { ...args.pedido, valor: PRECO_REAIS } }),
  };
}

export function leadsConfigurados(): boolean {
  return Boolean(process.env.LEADS_WEBHOOK_URL);
}

/**
 * Envia o lead ao webhook. Nunca lança erro: uma falha aqui não pode
 * atrapalhar o quiz nem a compra. Devolve se o envio foi aceito.
 */
export async function enviarLead(lead: Lead): Promise<boolean> {
  const url = process.env.LEADS_WEBHOOK_URL;
  if (!url) {
    console.info(`[lead] ${lead.evento} recebido, mas LEADS_WEBHOOK_URL não está configurada`);
    return false;
  }
  const cabecalhos: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.LEADS_WEBHOOK_TOKEN) cabecalhos.Authorization = `Bearer ${process.env.LEADS_WEBHOOK_TOKEN}`;
  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resposta.ok) {
      console.error(`[lead] webhook respondeu ${resposta.status} ao evento ${lead.evento}`);
      return false;
    }
    return true;
  } catch (erro) {
    console.error(`[lead] falha ao enviar ${lead.evento}:`, erro instanceof Error ? erro.message : erro);
    return false;
  }
}
