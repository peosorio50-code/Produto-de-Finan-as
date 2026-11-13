import { describe, expect, it } from "vitest";
import { diagnosticar } from "@/lib/diagnostico";
import { EXEMPLO } from "@/lib/exemplo";
import { leituraGratuita, narrativaPadrao } from "@/lib/narrativa-padrao";
import { criarReferencia, referenciaCombina, referenciaValida } from "@/lib/pedido";
import type { Respostas } from "@/lib/tipos";
import { sanitizarRespostas } from "@/lib/validacao";

function respostas(mudancas: Partial<Respostas> = {}): Respostas {
  return { ...structuredClone(EXEMPLO), ...mudancas };
}

describe("diagnosticar", () => {
  it("soma os números básicos", () => {
    const d = diagnosticar(respostas());
    expect(d.totalDividas).toBe(4870 + 1320 + 6400 + 380);
    expect(d.parcelasMes).toBe(420);
    expect(d.gastosMes).toBe(2650);
    expect(d.sobraMes).toBe(3600 - 2650 - 420);
    expect(d.quantidadeDividas).toBe(4);
  });

  it("põe conta essencial atrasada na frente e crédito barato no fim", () => {
    const d = diagnosticar(
      respostas({
        dividas: [
          { id: "d1", tipo: "consignado", apelido: "", saldo: 9000, parcela: 300, situacao: "em_dia", jurosMes: null },
          { id: "d2", tipo: "familia", apelido: "", saldo: 1000, parcela: 0, situacao: "em_dia", jurosMes: null },
          { id: "d3", tipo: "cheque_especial", apelido: "", saldo: 800, parcela: 0, situacao: "em_dia", jurosMes: null },
          { id: "d4", tipo: "cartao", apelido: "", saldo: 3000, parcela: 0, situacao: "atraso_mais_90", jurosMes: null },
          { id: "d5", tipo: "contas_consumo", apelido: "", saldo: 400, parcela: 0, situacao: "atraso_ate_90", jurosMes: null },
        ],
      }),
    );
    expect(d.dividas.map((x) => x.tipo)).toEqual([
      "contas_consumo",
      "cartao",
      "cheque_especial",
      "consignado",
      "familia",
    ]);
    expect(d.dividas.map((x) => x.acao)).toEqual([
      "regularizar_ja",
      "negociar_desconto",
      "trocar_por_barata",
      "manter_em_dia",
      "combinar",
    ]);
  });

  it("prevê quitação quando sobra dinheiro, e o plano é mais rápido que o ritmo atual", () => {
    const d = diagnosticar(respostas());
    expect(d.pagamentoPlano).toBeGreaterThan(d.parcelasMes);
    expect(d.plano.meses).not.toBeNull();
    expect(d.plano.meses!).toBeGreaterThan(0);
    expect(d.planoViavel).toBe(true);
    expect(d.pagamentoParaQuitarEm3Anos).toBeNull();
    // No exemplo há dívidas sem pagamento nenhum: no ritmo atual elas não acabam.
    expect(d.ritmoAtual.meses).toBeNull();
    for (const divida of d.dividas) expect(divida.quitadaNoMes).not.toBeNull();
  });

  it("não inventa prazo quando não há renda", () => {
    const d = diagnosticar(respostas({ tipoRenda: "sem_renda", rendaMensal: 0 }));
    expect(d.renda).toBe(0);
    expect(d.pagamentoPlano).toBe(0);
    expect(d.plano.meses).toBeNull();
    expect(d.nivel).toBe(4);
    expect(d.sinais.avaliarSuperendividamento).toBe(true);
    expect(d.comprometimento).toBeNull();
  });

  it("quando pagar todo mês não basta, calcula quanto seria preciso para quitar em três anos", () => {
    const d = diagnosticar(
      respostas({
        rendaMensal: 3200,
        dividas: [
          { id: "d1", tipo: "cartao", apelido: "", saldo: 30000, parcela: 0, situacao: "atraso_mais_90", jurosMes: null },
        ],
      }),
    );
    expect(d.planoViavel).toBe(false);
    expect(d.sinais.avaliarSuperendividamento).toBe(true);
    const alvo = d.pagamentoParaQuitarEm3Anos!;
    expect(alvo).toBeGreaterThan(d.pagamentoPlano);
    // Parcela de 36 meses a 3,5% ao mês sobre R$ 30.000 fica perto de R$ 1.480.
    expect(alvo).toBeGreaterThan(1400);
    expect(alvo).toBeLessThan(1560);
  });

  it("uma parcela fixa em dia sempre reduz o saldo", () => {
    const d = diagnosticar(
      respostas({
        dividas: [
          { id: "d1", tipo: "financiamento_veiculo", apelido: "", saldo: 60000, parcela: 900, situacao: "em_dia", jurosMes: null },
        ],
      }),
    );
    const [financiamento] = d.dividas;
    expect(financiamento.jurosEstimadosMes).toBeLessThan(900);
    expect(d.ritmoAtual.meses).not.toBeNull();
  });

  it("usa os juros informados pelo cliente quando existem", () => {
    const d = diagnosticar(
      respostas({
        dividas: [
          { id: "d1", tipo: "cartao", apelido: "", saldo: 1000, parcela: 0, situacao: "em_dia", jurosMes: 5 },
        ],
      }),
    );
    expect(d.dividas[0].taxa).toBeCloseTo(0.05);
    expect(d.dividas[0].taxaInformada).toBe(true);
    expect(d.jurosEstimadosMes).toBe(50);
  });

  it("sinaliza quando a conta não fecha", () => {
    const d = diagnosticar(respostas({ rendaMensal: 2000 }));
    expect(d.sobraMes).toBeLessThan(0);
    expect(d.sinais.contaNaoFecha).toBe(true);
    expect(d.nivel).toBeGreaterThanOrEqual(3);
  });

  it("diferencia duas dívidas do mesmo tipo pelo nome", () => {
    const d = diagnosticar(
      respostas({
        dividas: [
          { id: "d1", tipo: "cartao", apelido: "roxo", saldo: 1000, parcela: 0, situacao: "em_dia", jurosMes: null },
          { id: "d2", tipo: "cartao", apelido: "", saldo: 2000, parcela: 0, situacao: "em_dia", jurosMes: null },
        ],
      }),
    );
    expect(d.dividas.map((x) => x.rotulo).sort()).toEqual(["Cartão de crédito (roxo)", "Cartão de crédito 2"]);
  });
});

describe("narrativaPadrao", () => {
  it("gera uma estratégia para cada dívida, na ordem da fila", () => {
    const r = respostas();
    const d = diagnosticar(r);
    const n = narrativaPadrao(r, d);
    expect(n.estrategiaPorDivida.map((e) => e.dividaId)).toEqual(d.dividas.map((x) => x.id));
    expect(n.leitura.length).toBeGreaterThanOrEqual(2);
    expect(n.pontosCriticos.length).toBeGreaterThanOrEqual(2);
    expect(n.plano30Dias).toHaveLength(4);
  });

  it("funciona no pior caso (sem renda)", () => {
    const r = respostas({ tipoRenda: "sem_renda", rendaMensal: 0 });
    const n = narrativaPadrao(r, diagnosticar(r));
    expect(n.leitura.join(" ")).toContain("sem renda");
  });
});

describe("leituraGratuita", () => {
  it("aponta o que mais pesa e a primeira dívida da fila", () => {
    const r = respostas();
    const d = diagnosticar(r);
    const leitura = leituraGratuita(r, d);
    expect(leitura.pontosCriticos.length).toBeGreaterThanOrEqual(2);
    expect(leitura.primeiroPasso?.divida.id).toBe(d.dividas[0].id);
    expect(leitura.primeiroPasso?.oQueFazer.length).toBeGreaterThan(20);
  });
});

describe("pedido e validação", () => {
  it("a referência só combina com as respostas que a geraram", () => {
    const r = sanitizarRespostas(respostas())!;
    const ref = criarReferencia(r);
    expect(referenciaValida(ref)).toBe(true);
    expect(referenciaCombina(ref, r)).toBe(true);
    const outras = sanitizarRespostas(respostas({ rendaMensal: 9999 }))!;
    expect(referenciaCombina(ref, outras)).toBe(false);
  });

  it("normaliza ids, texto livre e valores", () => {
    const bruto = respostas({ nome: "  Ana <script>  Souza  " });
    bruto.dividas[0].id = "qualquer";
    bruto.dividas[0].apelido = "roxo{{ignore}}";
    bruto.dividas[0].saldo = 1000.6;
    const r = sanitizarRespostas(bruto)!;
    expect(r.nome).toBe("Ana script Souza");
    expect(r.dividas[0].id).toBe("d1");
    expect(r.dividas[0].apelido).toBe("roxoignore");
    expect(r.dividas[0].saldo).toBe(1001);
  });

  it("recusa respostas incompletas ou fora dos limites", () => {
    expect(sanitizarRespostas(null)).toBeNull();
    expect(sanitizarRespostas({})).toBeNull();
    expect(sanitizarRespostas(respostas({ dividas: [] }))).toBeNull();
    expect(sanitizarRespostas(respostas({ rendaMensal: -5 }))).toBeNull();
    expect(sanitizarRespostas({ ...respostas(), objetivo: "ficar_rico" })).toBeNull();
  });
});
