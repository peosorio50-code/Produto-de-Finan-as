/**
 * O resultado do quiz: um nome para a situação da pessoa, uma frase que
 * explica com os números dela e os itens do plano pago ligados ao que ela
 * respondeu. Tudo por regras, sem IA.
 */
import { brl, pct } from "./formato";
import type { Diagnostico, Respostas, Sentimento } from "./tipos";

export type IdPerfil =
  | "sem_renda"
  | "conta_nao_fecha"
  | "nome_travado"
  | "bola_de_neve"
  | "renda_apertada"
  | "credito_caro"
  | "sob_controle";

export interface Perfil {
  id: IdPerfil;
  titulo: string;
  resumo: string;
}

/** Dívidas em que o pagamento de hoje não cobre os juros do mês. */
function dividasCrescendo(d: Diagnostico) {
  return d.dividas.filter((x) => x.taxa > 0 && x.parcela <= x.saldo * x.taxa);
}

export function perfilDaSituacao(d: Diagnostico): Perfil {
  const s = d.sinais;
  const juros = brl(d.jurosEstimadosMes);

  if (s.semRenda) {
    return {
      id: "sem_renda",
      titulo: "Sem renda, com contas correndo",
      resumo: `Você deve ${brl(d.totalDividas)} e está sem renda neste momento. Nesta fase, a prioridade não é pagar tudo: é proteger o essencial e não assumir parcela que não dá para cumprir.`,
    };
  }
  if (s.contaNaoFecha) {
    return {
      id: "conta_nao_fecha",
      titulo: "No sufoco",
      resumo: `O que entra não cobre o mês: faltam ${brl(-d.sobraMes)} depois dos gastos e das parcelas. Quando isso acontece, as parcelas acabam sendo pagas com dívida nova.`,
    };
  }
  if (s.negativado && d.dividas.some((x) => x.situacao === "atraso_mais_90")) {
    return {
      id: "nome_travado",
      titulo: "Nome travado",
      resumo: `Você tem ${brl(d.saldoEmAtraso)} em atraso e o nome negativado, o que trava o crédito mais barato. A boa notícia: dívida com atraso antigo é a que mais recebe desconto na negociação.`,
    };
  }
  const crescendo = dividasCrescendo(d);
  if (crescendo.length > 0 && d.jurosEstimadosMes > 0) {
    const onde =
      d.quantidadeDividas === 1
        ? "Na sua dívida"
        : crescendo.length === 1
          ? "Em uma das suas dívidas"
          : `Em ${crescendo.length} das suas dívidas`;
    return {
      id: "bola_de_neve",
      titulo: "Bola de neve",
      resumo: `Cerca de ${juros} viram juros todo mês. ${onde}, o que você paga hoje não cobre esses juros, então o saldo cresce mesmo com você pagando.`,
    };
  }
  if (d.comprometimento !== null && d.comprometimento > 0.3) {
    return {
      id: "renda_apertada",
      titulo: "Renda no aperto",
      resumo: `As parcelas levam ${pct(d.comprometimento)} do que entra, acima dos 30% que já indicam aperto. Sobra pouco para imprevistos, e qualquer susto vira dívida nova.`,
    };
  }
  if (s.temCreditoCaro) {
    return {
      id: "credito_caro",
      titulo: "Pagando caro para dever",
      resumo: `Cerca de ${juros} por mês viram juros, e boa parte vem do cartão ou do cheque especial, os créditos mais caros do país.`,
    };
  }
  return {
    id: "sob_controle",
    titulo: "Sob controle, por enquanto",
    resumo: `Suas dívidas ainda cabem na renda, mas cerca de ${juros} por mês viram juros. Agir agora custa bem menos do que agir depois.`,
  };
}

/** Uma frase de acolhimento a partir de como a pessoa disse que se sente. */
export const ACOLHIMENTO: Record<Sentimento, string> = {
  sem_dormir:
    "Você contou que perde o sono com isso. O primeiro alívio costuma vir de saber o tamanho exato do problema, e isso você tem agora.",
  preocupado:
    "Você contou que segue levando, mesmo preocupado. Com os números na mão, dá para trocar a preocupação por uma ordem de ação.",
  evito_pensar:
    "Você contou que prefere nem olhar as faturas. Isso é muito comum, e você acabou de dar o passo mais difícil: olhar.",
  no_controle:
    "Você contou que sabe o que deve. Isso adianta muito: agora é colocar as dívidas na ordem certa.",
};

/** O que o plano completo entrega, escrito a partir das respostas da pessoa. */
export function itensDoPlano(r: Respostas, d: Diagnostico): string[] {
  const primeira = d.dividas[0];
  const itens: string[] = [];

  if (primeira && d.quantidadeDividas > 1) {
    itens.push(
      `A ordem certa para as suas ${d.quantidadeDividas} dívidas, começando por ${primeira.rotulo.charAt(0).toLowerCase()}${primeira.rotulo.slice(1)}`,
    );
  } else if (primeira) {
    itens.push(`O passo a passo para resolver a dívida de ${primeira.rotulo.toLowerCase()}, do primeiro contato à quitação`);
  }

  const porTentativa: Record<Respostas["tentativa"], string> = {
    nunca: "Como fazer o primeiro contato com cada credor, com a mensagem pronta para copiar e enviar",
    sem_acordo: "Como conduzir a negociação para não ouvir outro “não”, com a mensagem pronta para cada credor",
    acordo_quebrado: "Como refazer o acordo com uma parcela que caiba no seu mês, para não quebrar de novo",
    acordo_em_dia: "Como manter o acordo em dia e, ao mesmo tempo, avançar nas outras dívidas",
  };
  itens.push(porTentativa[r.tentativa]);

  const porObjetivo: Record<Respostas["objetivo"], string> = {
    limpar_nome: "O caminho para limpar o seu nome, dívida por dívida",
    parar_juros: `Como parar de perder os cerca de ${brl(d.jurosEstimadosMes)} por mês que hoje viram juros`,
    tranquilidade: "Um plano semana a semana, para a dívida deixar de ser um susto e virar uma lista",
    credito: "O que fazer para voltar a ter crédito, e com juros menores",
    guardar: "Quando e como começar sua reserva sem atrasar as dívidas",
  };
  itens.push(porObjetivo[r.objetivo]);

  itens.push(
    d.planoViavel && d.plano.meses !== null
      ? "Em quanto tempo dá para quitar tudo no seu caso, e quanto separar por mês"
      : "O que fazer quando só pagar não resolve: desconto, renegociação em conjunto e os seus direitos",
  );
  itens.push("Onde cortar no seu orçamento, grupo por grupo");
  itens.push("O que fazer nos primeiros 7 dias e nas 4 semanas seguintes");
  itens.push("Um guia com método, direitos, armadilhas e ajuda gratuita");
  return itens;
}
