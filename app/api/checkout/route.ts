import { NextResponse, type NextRequest } from "next/server";
import { criarCheckout, modoPagamento } from "@/lib/pagamento";
import { criarReferencia } from "@/lib/pedido";
import { sanitizarRespostas } from "@/lib/validacao";

export const runtime = "nodejs";

export async function POST(requisicao: NextRequest) {
  const corpo = await requisicao.json().catch(() => null);
  const respostas = sanitizarRespostas(corpo?.respostas);
  if (!respostas) {
    return NextResponse.json({ erro: "respostas_invalidas" }, { status: 400 });
  }
  if (modoPagamento() === "indisponivel") {
    return NextResponse.json({ erro: "pagamento_nao_configurado" }, { status: 503 });
  }

  const origem = (process.env.SITE_URL || requisicao.nextUrl.origin).replace(/\/$/, "");
  const ref = criarReferencia(respostas);
  try {
    const url = await criarCheckout(ref, origem);
    // As respostas voltam normalizadas: é esta versão que o pedido cobre.
    return NextResponse.json({ ref, url, respostas });
  } catch (erro) {
    console.error("[checkout]", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erro: "falha_no_pagamento" }, { status: 502 });
  }
}
