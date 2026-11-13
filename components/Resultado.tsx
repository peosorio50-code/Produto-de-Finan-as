"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EscalaNivel, FRASE_NIVEL, LinhasDiagnostico } from "@/components/Resumo";
import { gravarPedido, lerPedido, lerPlano, lerRespostas } from "@/lib/armazenamento";
import { MARCA, PRECO_REAIS } from "@/lib/config";
import { diagnosticar } from "@/lib/diagnostico";
import { brlCentavos } from "@/lib/formato";
import type { Respostas } from "@/lib/tipos";

const ERROS: Record<string, string> = {
  pagamento_nao_configurado: "O pagamento ainda não está disponível neste site. Tente de novo mais tarde.",
  respostas_invalidas: "Alguma resposta ficou incompleta. Revise o questionário e tente de novo.",
  falha_no_pagamento: "Não conseguimos abrir o pagamento agora. Tente de novo em alguns minutos.",
};

function Cadeado() {
  return (
    <svg className="trancado__cadeado" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.5 7V5a3.5 3.5 0 1 1 7 0v2h.5A1.5 1.5 0 0 1 13.5 8.5v5A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4 7h.5Zm1.5 0h4V5a2 2 0 1 0-4 0v2Z"
      />
    </svg>
  );
}

export function Resultado() {
  const parametros = useSearchParams();
  const [respostas, setRespostas] = useState<Respostas | null | undefined>(undefined);
  const [planoPronto, setPlanoPronto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setRespostas(lerRespostas());
    const pedido = lerPedido();
    if (pedido && lerPlano(pedido.ref)) setPlanoPronto(pedido.ref);
  }, []);

  const d = useMemo(() => (respostas ? diagnosticar(respostas) : null), [respostas]);

  async function liberarPlano() {
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respostas }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);
      gravarPedido({
        ref: dados.ref,
        respostas: dados.respostas,
        urlPagamento: dados.url,
        criadoEm: new Date().toISOString(),
      });
      window.location.assign(dados.url);
    } catch (falha) {
      const codigo = falha instanceof Error ? falha.message : "";
      setErro(ERROS[codigo] ?? ERROS.falha_no_pagamento);
      setEnviando(false);
    }
  }

  if (respostas === undefined) return null;

  if (!respostas || !d) {
    return (
      <div className="espera">
        <h1 className="titulo-2">Seu diagnóstico ainda não foi feito neste aparelho</h1>
        <p className="apoio">Responda às perguntas para ver o resultado. Leva uns 3 minutos.</p>
        <Link href="/diagnostico" className="botao">
          Fazer meu diagnóstico
        </Link>
      </div>
    );
  }

  const preco = brlCentavos(PRECO_REAIS);

  return (
    <>
      <header className="documento__capa">
        <p className="apoio">Diagnóstico de {respostas.nome}</p>
        <h1 className="titulo-2">Situação: {d.nivelRotulo.toLowerCase()}</h1>
        <EscalaNivel nivel={d.nivel} />
        <p className="destaque">{FRASE_NIVEL[d.nivel]}</p>
      </header>

      {parametros.get("pagamento") === "falhou" && (
        <p className="aviso aviso--erro" style={{ marginTop: "1.5rem" }} role="alert">
          O pagamento não foi concluído e nada foi cobrado. Você pode tentar de novo quando quiser.
        </p>
      )}

      {planoPronto && (
        <p className="aviso" style={{ marginTop: "1.5rem" }}>
          Você já liberou um plano neste aparelho. <Link href={`/plano?ref=${planoPronto}`}>Abrir meu plano</Link>
        </p>
      )}

      <section className="bloco">
        <h2 className="titulo-3">Seus números</h2>
        <LinhasDiagnostico d={d} />
        <p className="pequeno apoio">
          <Link href="/diagnostico">Corrigir minhas respostas</Link>
        </p>
      </section>

      <section className="bloco bloco--final">
        <h2 className="titulo-2">O plano completo responde o que falta</h2>
        <ul className="trancado">
          {[
            d.quantidadeDividas > 1
              ? `Em que ordem atacar as suas ${d.quantidadeDividas} dívidas, e por quê`
              : "Qual é o melhor caminho para a sua dívida, e por quê",
            "O que pedir a cada credor, com a mensagem pronta para enviar",
            "Em quanto tempo dá para quitar tudo seguindo o plano",
            "Onde cortar no seu orçamento e quanto destinar às dívidas por mês",
            "O que fazer nos primeiros 7 dias e nas 4 semanas seguintes",
            "O guia completo: método, direitos, armadilhas e ajuda gratuita",
          ].map((item) => (
            <li key={item}>
              <Cadeado />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="canhoto" style={{ marginTop: "2rem" }}>
          <div className="canhoto__corpo">
            <h3 className="titulo-3">Plano completo de {respostas.nome}</h3>
            <p className="apoio">
              Escrito por inteligência artificial com os números que você acabou de informar, mais o guia
              que acompanha todo plano. Fica pronto em cerca de um minuto depois do pagamento.
            </p>
            <p className="pequeno apoio">
              Pagamento único por Pix ou cartão. {MARCA.garantiaDias} dias para pedir o dinheiro de volta.
            </p>
          </div>
          <div className="canhoto__valor">
            <p className="canhoto__preco">{preco}</p>
            <button type="button" className="botao botao--largo" onClick={liberarPlano} disabled={enviando}>
              {enviando ? "Abrindo o pagamento" : "Liberar meu plano"}
            </button>
          </div>
        </div>

        {erro && (
          <p className="aviso aviso--erro" role="alert">
            {erro}
          </p>
        )}
      </section>
    </>
  );
}
