import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRECO_REAIS } from "@/lib/config";
import { criarCheckout, modoPagamento, pagamentoAprovado } from "@/lib/pagamento";

/**
 * A API do Mercado Pago é simulada: estes testes conferem o que o site envia
 * e como interpreta as respostas, não a API real.
 */

const REF = "fl-0123456789ab-0123456789abcdef";

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

const pagamento = (mudancas: Record<string, unknown> = {}) => ({
  status: "approved",
  external_reference: REF,
  transaction_amount: PRECO_REAIS,
  currency_id: "BRL",
  ...mudancas,
});

describe("pagamento", () => {
  beforeEach(() => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "TOKEN-DE-TESTE");
    vi.stubEnv("PAGAMENTO_MODO", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("escolhe o modo pelo ambiente, e o token sempre vence o modo de teste", () => {
    vi.stubEnv("PAGAMENTO_MODO", "teste");
    expect(modoPagamento()).toBe("mercadopago");
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");
    expect(modoPagamento()).toBe("teste");
    vi.stubEnv("PAGAMENTO_MODO", "");
    expect(modoPagamento()).toBe("indisponivel");
  });

  it("cria o checkout com o valor, a referência e a volta para o plano", async () => {
    const chamadas: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      chamadas.push({ url, init });
      return resposta({ init_point: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=1" });
    });

    const url = await criarCheckout(REF, "https://meusite.com.br");

    expect(url).toContain("mercadopago.com.br");
    expect(chamadas[0].url).toBe("https://api.mercadopago.com/checkout/preferences");
    expect((chamadas[0].init.headers as Record<string, string>).Authorization).toBe("Bearer TOKEN-DE-TESTE");
    const corpo = JSON.parse(String(chamadas[0].init.body));
    expect(corpo.external_reference).toBe(REF);
    expect(corpo.items[0].unit_price).toBe(PRECO_REAIS);
    expect(corpo.items[0].currency_id).toBe("BRL");
    expect(corpo.back_urls.success).toBe(`https://meusite.com.br/plano?ref=${REF}`);
    expect(corpo.auto_return).toBe("approved");
  });

  it("não pede retorno automático fora de https", async () => {
    let corpo: Record<string, unknown> = {};
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      corpo = JSON.parse(String(init.body));
      return resposta({ init_point: "https://exemplo" });
    });
    await criarCheckout(REF, "http://localhost:3000");
    expect(corpo.auto_return).toBeUndefined();
  });

  it("falha com clareza quando o Mercado Pago recusa", async () => {
    vi.stubGlobal("fetch", async () => resposta({ message: "invalid token" }, 401));
    await expect(criarCheckout(REF, "https://meusite.com.br")).rejects.toThrow("401");
  });

  it("libera só com pagamento aprovado, da mesma referência e no valor cheio", async () => {
    const casos: [Record<string, unknown>, boolean][] = [
      [pagamento(), true],
      [pagamento({ status: "pending" }), false],
      [pagamento({ status: "rejected" }), false],
      [pagamento({ external_reference: "fl-000000000000-0000000000000000" }), false],
      [pagamento({ transaction_amount: 1 }), false],
      [pagamento({ currency_id: "ARS" }), false],
    ];
    for (const [p, esperado] of casos) {
      vi.stubGlobal("fetch", async () => resposta({ results: [p] }));
      expect(await pagamentoAprovado(REF)).toBe(esperado);
    }
    vi.stubGlobal("fetch", async () => resposta({ results: [] }));
    expect(await pagamentoAprovado(REF)).toBe(false);
  });

  it("consulta o pagamento pelo id quando ele vem na volta do checkout", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      return resposta(pagamento());
    });
    expect(await pagamentoAprovado(REF, "123456789")).toBe(true);
    expect(urls).toEqual(["https://api.mercadopago.com/v1/payments/123456789"]);

    // Um id com formato estranho é ignorado, e a busca pela referência decide.
    urls.length = 0;
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      return resposta({ results: [] });
    });
    expect(await pagamentoAprovado(REF, "../../algo")).toBe(false);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("/v1/payments/search?external_reference=");
  });

  it("no modo de teste nada é consultado", async () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");
    vi.stubEnv("PAGAMENTO_MODO", "teste");
    vi.stubGlobal("fetch", async () => {
      throw new Error("não deveria chamar a rede");
    });
    expect(await pagamentoAprovado(REF)).toBe(true);
    expect(await criarCheckout(REF, "http://localhost:3000")).toBe(`http://localhost:3000/pagamento-teste?ref=${REF}`);
  });

  it("sem configuração, não libera nada", async () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");
    expect(await pagamentoAprovado(REF)).toBe(false);
    await expect(criarCheckout(REF, "https://meusite.com.br")).rejects.toThrow();
  });
});
