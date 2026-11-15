/**
 * Cobrança pelo Mercado Pago (Checkout Pro: Pix, cartão e saldo).
 * Para trocar de meio de pagamento, reescreva só este arquivo mantendo as
 * três funções exportadas.
 */
import { MARCA, PRECO_REAIS } from "./config";
import type { Contato } from "./tipos";

const API = "https://api.mercadopago.com";

export type ModoPagamento = "mercadopago" | "teste" | "indisponivel";

export function modoPagamento(): ModoPagamento {
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) return "mercadopago";
  if (process.env.PAGAMENTO_MODO === "teste") return "teste";
  return "indisponivel";
}

function cabecalhos(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/**
 * Devolve o endereço para onde o comprador deve ir para pagar. O contato do
 * quiz, quando existe, já chega preenchido no checkout.
 */
export async function criarCheckout(ref: string, origem: string, comprador?: Contato): Promise<string> {
  const modo = modoPagamento();
  if (modo === "teste") return `${origem}/pagamento-teste?ref=${ref}`;
  if (modo === "indisponivel") throw new Error("Pagamento não configurado");

  const voltar = `${origem}/plano?ref=${ref}`;
  const corpo: Record<string, unknown> = {
    items: [
      {
        id: "plano-folego",
        title: `${MARCA.nome}: diagnóstico e plano personalizado`,
        quantity: 1,
        unit_price: PRECO_REAIS,
        currency_id: "BRL",
      },
    ],
    external_reference: ref,
    statement_descriptor: MARCA.nomeNaFatura,
    back_urls: { success: voltar, pending: voltar, failure: `${origem}/resultado?pagamento=falhou` },
    // Boleto demora dias para compensar; o plano é entregue na hora.
    payment_methods: { excluded_payment_types: [{ id: "ticket" }], installments: 1 },
  };
  if (comprador) {
    const [nome, ...sobrenome] = comprador.nome.split(" ");
    corpo.payer = {
      name: nome,
      ...(sobrenome.length > 0 && { surname: sobrenome.join(" ") }),
      email: comprador.email,
      phone: { area_code: comprador.telefone.slice(0, 2), number: comprador.telefone.slice(2) },
    };
  }
  // O Mercado Pago só aceita retorno automático para endereços https.
  if (origem.startsWith("https://")) corpo.auto_return = "approved";

  const resposta = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: cabecalhos(),
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    throw new Error(`Mercado Pago recusou a criação do checkout (${resposta.status})`);
  }
  const dados = (await resposta.json()) as { init_point?: string };
  if (!dados.init_point) throw new Error("Mercado Pago não devolveu o link de pagamento");
  return dados.init_point;
}

interface PagamentoMP {
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
}

function aprovado(p: PagamentoMP, ref: string): boolean {
  return (
    p.status === "approved" &&
    p.external_reference === ref &&
    (p.currency_id === undefined || p.currency_id === "BRL") &&
    typeof p.transaction_amount === "number" &&
    p.transaction_amount >= PRECO_REAIS - 0.01
  );
}

/** Confirma, direto no Mercado Pago, se o pedido `ref` foi pago. */
export async function pagamentoAprovado(ref: string, idPagamento?: string): Promise<boolean> {
  const modo = modoPagamento();
  if (modo === "teste") return true;
  if (modo === "indisponivel") return false;

  // Na volta do checkout o Mercado Pago informa o id do pagamento: a consulta
  // direta responde antes da busca, que pode levar alguns segundos para indexar.
  if (idPagamento && /^\d{1,20}$/.test(idPagamento)) {
    const direta = await fetch(`${API}/v1/payments/${idPagamento}`, {
      headers: cabecalhos(),
      cache: "no-store",
    });
    if (direta.ok && aprovado((await direta.json()) as PagamentoMP, ref)) return true;
  }

  const busca = await fetch(
    `${API}/v1/payments/search?external_reference=${encodeURIComponent(ref)}&sort=date_created&criteria=desc`,
    { headers: cabecalhos(), cache: "no-store" },
  );
  if (!busca.ok) throw new Error(`Mercado Pago não respondeu à consulta (${busca.status})`);
  const dados = (await busca.json()) as { results?: PagamentoMP[] };
  return (dados.results ?? []).some((p) => aprovado(p, ref));
}
