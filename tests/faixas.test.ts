import { describe, expect, it } from "vitest";
import { diagnosticar } from "@/lib/diagnostico";
import { dividirGastos, FAIXAS_PARCELA, FAIXAS_RENDA, FAIXAS_SALDO } from "@/lib/faixas";
import { sanitizarRespostas } from "@/lib/validacao";

describe("faixas do quiz", () => {
  it("divide o total de gastos pelos grupos sem perder valor", () => {
    const g = dividirGastos(2240);
    const soma = Object.values(g).reduce((a, b) => a + b, 0);
    expect(Math.abs(soma - 2240)).toBeLessThanOrEqual(30);
    expect(dividirGastos(0)).toEqual({ moradia: 0, contas: 0, alimentacao: 0, transporte: 0, saude: 0, outros: 0 });
  });

  it("as faixas crescem e geram respostas válidas para o diagnóstico", () => {
    const valores = (f: Record<string, { valor: number }>) => Object.values(f).map((x) => x.valor);
    for (const lista of [valores(FAIXAS_SALDO), valores(FAIXAS_PARCELA), valores(FAIXAS_RENDA)]) {
      expect([...lista].sort((a, b) => a - b)).toEqual(lista);
    }
    const respostas = sanitizarRespostas({
      nome: "Ana",
      rendaMensal: FAIXAS_RENDA.r3.valor,
      tipoRenda: "fixa",
      pessoasNaCasa: 3,
      gastos: dividirGastos(2240),
      dividas: [
        { id: "d1", tipo: "cartao", apelido: "", saldo: FAIXAS_SALDO.s3.valor, parcela: FAIXAS_PARCELA.p2.valor, situacao: "atraso_ate_90", jurosMes: null },
        { id: "d2", tipo: "contas_consumo", apelido: "", saldo: FAIXAS_SALDO.s1.valor, parcela: 0, situacao: "atraso_mais_90", jurosMes: null },
      ],
      negativado: "sim",
      causas: ["juros"],
      tentativa: "nunca",
      sentimento: "sem_dormir",
      controle: "nenhum",
      reserva: "nenhuma",
      rendaExtra: "talvez",
      objetivo: "limpar_nome",
    });
    expect(respostas).not.toBeNull();
    const d = diagnosticar(respostas!);
    expect(d.totalDividas).toBe(4600);
    expect(d.dividas[0].tipo).toBe("contas_consumo");
  });
});
