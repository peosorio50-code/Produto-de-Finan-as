import { after, NextResponse, type NextRequest } from "next/server";
import { diagnosticar } from "@/lib/diagnostico";
import { enviarLead, montarLead, resumirParaLead } from "@/lib/leads";
import { criarCheckout, modoPagamento } from "@/lib/pagamento";
import { criarReferencia } from "@/lib/pedido";
import { sanitizarContato, sanitizarOrigem, sanitizarRespostas } from "@/lib/validacao";

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
  const contato = sanitizarContato(corpo?.contato);

  const origem = (process.env.SITE_URL || requisicao.nextUrl.origin).replace(/\/$/, "");
  const ref = criarReferencia(respostas);
  try {
    const url = await criarCheckout(ref, origem, contato ?? undefined);
    if (contato) {
      // Quem abriu o pagamento e não concluiu é o público da recuperação de venda.
      const resultado = resumirParaLead(respostas, diagnosticar(respostas));
      const lead = montarLead({
        evento: "checkout_iniciado",
        contato,
        origem: sanitizarOrigem(corpo?.origem),
        resultado,
        pedido: { ref, linkPagamento: url },
      });
      after(() => enviarLead(lead));
    }
    // As respostas voltam normalizadas: é esta versão que o pedido cobre.
    return NextResponse.json({ ref, url, respostas });
  } catch (erro) {
    console.error("[checkout]", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erro: "falha_no_pagamento" }, { status: 502 });
  }
}
