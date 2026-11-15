import { afterEach, describe, expect, it, vi } from "vitest";
import { telefoneValido } from "@/lib/contato";
import { diagnosticar } from "@/lib/diagnostico";
import { EXEMPLO } from "@/lib/exemplo";
import { mascaraTelefone } from "@/lib/formato";
import { enviarLead, montarLead, resumirParaLead } from "@/lib/leads";
import { itensDoPlano, perfilDaSituacao } from "@/lib/perfil";
import type { Respostas } from "@/lib/tipos";
import { sanitizarContato, sanitizarOrigem, sanitizarRespostas } from "@/lib/validacao";

function respostas(mudancas: Partial<Respostas> = {}): Respostas {
  return { ...structuredClone(EXEMPLO), ...mudancas };
}

const CONTATO = { nome: "Ana Souza", email: "ana@exemplo.com.br", telefone: "11912345678" };

describe("contato", () => {
  it("aceita celular e fixo com DDD e recusa o resto", () => {
    expect(telefoneValido("11912345678")).toBe(true);
    expect(telefoneValido("1133334444")).toBe(true);
    expect(telefoneValido("11812345678")).toBe(false); // celular sem o 9
    expect(telefoneValido("1193334444")).toBe(false); // fixo começando com 9
    expect(telefoneValido("01912345678")).toBe(false); // DDD inválido
    expect(telefoneValido("912345678")).toBe(false); // sem DDD
  });

  it("formata o telefone enquanto a pessoa digita", () => {
    expect(mascaraTelefone("1")).toBe("(1");
    expect(mascaraTelefone("119")).toBe("(11) 9");
    expect(mascaraTelefone("1133334444")).toBe("(11) 3333-4444");
    expect(mascaraTelefone("11912345678")).toBe("(11) 91234-5678");
  });

  it("normaliza o contato no servidor", () => {
    const c = sanitizarContato({ nome: "  Ana   <b>Souza</b> ", email: " ANA@Exemplo.com.BR ", telefone: "+55 (11) 91234-5678" });
    expect(c).toEqual({ nome: "Ana bSouzab", email: "ana@exemplo.com.br", telefone: "11912345678" });
    expect(sanitizarContato({ ...CONTATO, email: "ana@" })).toBeNull();
    expect(sanitizarContato({ ...CONTATO, telefone: "123" })).toBeNull();
    expect(sanitizarContato({ ...CONTATO, nome: " " })).toBeNull();
    expect(sanitizarContato(null)).toBeNull();
  });

  it("guarda só os parâmetros de campanha conhecidos", () => {
    expect(sanitizarOrigem({ utm_source: " meta ", utm_campaign: "quiz<1>", outro: "x", gclid: 5 })).toEqual({
      utm_source: "meta",
      utm_campaign: "quiz1",
    });
    expect(sanitizarOrigem("lixo")).toEqual({});
  });

  it("as respostas do quiz exigem as perguntas novas", () => {
    const { sentimento: _s, ...semSentimento } = respostas();
    expect(sanitizarRespostas(semSentimento)).toBeNull();
    expect(sanitizarRespostas({ ...respostas(), tentativa: "talvez" })).toBeNull();
    expect(sanitizarRespostas(respostas())?.tentativa).toBe("sem_acordo");
  });
});

describe("perfil da situação", () => {
  it("dá nome à situação a partir dos números", () => {
    // Exemplo: nome negativado com dívida atrasada há mais de 3 meses.
    expect(perfilDaSituacao(diagnosticar(respostas())).id).toBe("nome_travado");

    const semRenda = respostas({ tipoRenda: "sem_renda", rendaMensal: 0 });
    expect(perfilDaSituacao(diagnosticar(semRenda)).id).toBe("sem_renda");

    const apertado = respostas({ rendaMensal: 2000 });
    expect(perfilDaSituacao(diagnosticar(apertado)).id).toBe("conta_nao_fecha");

    const crescendo = respostas({
      negativado: "nao",
      dividas: [{ id: "d1", tipo: "cartao", apelido: "", saldo: 5000, parcela: 200, situacao: "em_dia", jurosMes: null }],
    });
    const perfil = perfilDaSituacao(diagnosticar(crescendo));
    expect(perfil.id).toBe("bola_de_neve");
    expect(perfil.resumo).toContain("Na sua dívida");

    const tranquilo = respostas({
      negativado: "nao",
      dividas: [
        { id: "d1", tipo: "consignado", apelido: "", saldo: 3000, parcela: 300, situacao: "em_dia", jurosMes: null },
      ],
    });
    expect(perfilDaSituacao(diagnosticar(tranquilo)).id).toBe("sob_controle");
  });

  it("monta a oferta com o que a pessoa respondeu", () => {
    const r = respostas({ tentativa: "acordo_quebrado", objetivo: "parar_juros" });
    const d = diagnosticar(r);
    const itens = itensDoPlano(r, d);
    expect(itens[0]).toContain(`suas ${d.quantidadeDividas} dívidas`);
    expect(itens.some((i) => i.includes("refazer o acordo"))).toBe(true);
    expect(itens.some((i) => i.includes("viram juros"))).toBe(true);
  });
});

describe("leads", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("monta o lead com contato, origem e resumo do resultado", () => {
    const r = respostas();
    const lead = montarLead({
      evento: "quiz_concluido",
      contato: CONTATO,
      origem: { utm_source: "meta" },
      resultado: resumirParaLead(r, diagnosticar(r)),
    });
    expect(lead.contato.primeiroNome).toBe("Ana");
    expect(lead.contato.whatsapp).toBe("5511912345678");
    expect(lead.origem.utm_source).toBe("meta");
    expect(lead.resultado?.perfil).toBe("Nome travado");
    expect(lead.resultado?.tiposDeDivida).toContain("Cartão de crédito");
    expect(lead.pedido).toBeUndefined();
  });

  it("envia ao webhook com o token, e não quebra quando ele falha", async () => {
    vi.stubEnv("LEADS_WEBHOOK_URL", "https://hooks.exemplo.com/folego");
    vi.stubEnv("LEADS_WEBHOOK_TOKEN", "segredo");
    const chamadas: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      chamadas.push({ url, init });
      return new Response("ok");
    });
    const lead = montarLead({ evento: "quiz_iniciado", contato: CONTATO });
    expect(await enviarLead(lead)).toBe(true);
    expect(chamadas[0].url).toBe("https://hooks.exemplo.com/folego");
    expect((chamadas[0].init.headers as Record<string, string>).Authorization).toBe("Bearer segredo");
    expect(JSON.parse(String(chamadas[0].init.body)).evento).toBe("quiz_iniciado");

    vi.stubGlobal("fetch", async () => {
      throw new Error("fora do ar");
    });
    expect(await enviarLead(lead)).toBe(false);
  });

  it("sem webhook configurado, não chama a rede", async () => {
    vi.stubEnv("LEADS_WEBHOOK_URL", "");
    vi.stubGlobal("fetch", async () => {
      throw new Error("não deveria chamar a rede");
    });
    expect(await enviarLead(montarLead({ evento: "quiz_iniciado", contato: CONTATO }))).toBe(false);
  });
});
