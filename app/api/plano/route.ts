import { NextResponse, type NextRequest } from "next/server";
import { diagnosticar } from "@/lib/diagnostico";
import { escreverNarrativa } from "@/lib/ia";
import { narrativaPadrao } from "@/lib/narrativa-padrao";
import { pagamentoAprovado } from "@/lib/pagamento";
import { referenciaCombina } from "@/lib/pedido";
import type { PlanoCompleto } from "@/lib/tipos";
import { sanitizarRespostas } from "@/lib/validacao";

export const runtime = "nodejs";
// A IA pode levar mais de um minuto para escrever o plano.
export const maxDuration = 300;

export async function POST(requisicao: NextRequest) {
  const corpo = await requisicao.json().catch(() => null);
  const respostas = sanitizarRespostas(corpo?.respostas);
  const ref: unknown = corpo?.ref;
  if (!respostas || typeof ref !== "string" || !referenciaCombina(ref, respostas)) {
    return NextResponse.json({ erro: "pedido_invalido" }, { status: 400 });
  }

  let pago: boolean;
  try {
    const idPagamento = typeof corpo?.idPagamento === "string" ? corpo.idPagamento : undefined;
    pago = await pagamentoAprovado(ref, idPagamento);
  } catch (erro) {
    console.error("[plano] consulta de pagamento:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erro: "consulta_indisponivel" }, { status: 502 });
  }
  if (!pago) {
    return NextResponse.json({ erro: "pagamento_pendente" }, { status: 402 });
  }

  const diagnostico = diagnosticar(respostas);
  const padrao = narrativaPadrao(respostas, diagnostico);
  const daIA = await escreverNarrativa(respostas, diagnostico, padrao);

  const plano: PlanoCompleto = {
    ref,
    geradoEm: new Date().toISOString(),
    nome: respostas.nome,
    diagnostico,
    narrativa: daIA ?? padrao,
    origemNarrativa: daIA ? "ia" : "padrao",
  };
  return NextResponse.json({ plano });
}
