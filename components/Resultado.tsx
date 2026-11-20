"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EscalaNivel, FRASE_NIVEL, LinhasDiagnostico } from "@/components/Resumo";
import { gravarPedido, lerContato, lerOrigem, lerPedido, lerPlano, lerRespostas } from "@/lib/armazenamento";
import { MARCA, PRECO_REAIS } from "@/lib/config";
import { diagnosticar } from "@/lib/diagnostico";
import { postar } from "@/lib/api";
import { dadosParaIA } from "@/lib/ia-dados";
import { resumirParaLead } from "@/lib/resumo";
import { sanitizarRespostas } from "@/lib/validacao";
import { brl, brlCentavos } from "@/lib/formato";
import { leituraGratuita } from "@/lib/narrativa-padrao";
import { ACOLHIMENTO, itensDoPlano, perfilDaSituacao } from "@/lib/perfil";
import { ROTULOS_ACAO, ROTULOS_CAUSA, ROTULOS_OBJETIVO, ROTULOS_SENTIMENTO, ROTULOS_TENTATIVA } from "@/lib/rotulos";
import type { Respostas } from "@/lib/tipos";

const ERROS: Record<string, string> = {
  pagamento_nao_configurado: "O plano completo ainda não está à venda. Tente de novo em alguns dias.",
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

/**
 * Resultado do quiz. Entrega a situação da pessoa e o diagnóstico primeiro; o
 * plano pago só aparece no fim, ligado ao que ela respondeu.
 * `vendaAberta` é falso enquanto o pagamento não está configurado.
 */
export function Resultado({ vendaAberta }: { vendaAberta: boolean }) {
  const parametros = useSearchParams();
  const [respostas, setRespostas] = useState<Respostas | null | undefined>(undefined);
  const [planoPronto, setPlanoPronto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const salvas = lerRespostas();
    // Respostas de uma versão antiga do questionário não têm as perguntas do quiz.
    setRespostas(salvas?.tentativa && salvas?.sentimento ? salvas : null);
    const pedido = lerPedido();
    if (pedido && lerPlano(pedido.ref)) setPlanoPronto(pedido.ref);
  }, []);

  const d = useMemo(() => (respostas ? diagnosticar(respostas) : null), [respostas]);
  const leitura = useMemo(() => (respostas && d ? leituraGratuita(respostas, d) : null), [respostas, d]);

  async function liberarPlano() {
    setEnviando(true);
    setErro(null);
    try {
      // O servidor guarda o pedido com as respostas e o JSON que vai para a IA quando o pagamento cair.
      const limpas = sanitizarRespostas(respostas);
      if (!limpas) throw new Error("respostas_invalidas");
      const dg = diagnosticar(limpas);
      const resposta = await postar("/checkout", {
        respostas: limpas,
        contato: lerContato(),
        origem: lerOrigem(),
        resumo: resumirParaLead(limpas, dg),
        dadosIA: dadosParaIA(limpas, dg),
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

  if (!respostas || !d || !leitura) {
    return (
      <div className="espera">
        <h1 className="titulo-2">Você ainda não fez o quiz neste aparelho</h1>
        <p className="apoio">Responda às perguntas para ver a sua situação. Leva uns 3 minutos.</p>
        <Link href="/diagnostico" className="botao">
          Fazer o quiz gratuito
        </Link>
      </div>
    );
  }

  const porCusto = [...d.dividas].sort((a, b) => b.jurosEstimadosMes - a.jurosEstimadosMes);
  const passo = leitura.primeiroPasso;
  const perfil = perfilDaSituacao(d);
  const contou: { titulo: string; texto: string }[] = [
    { titulo: "O que você mais quer", texto: ROTULOS_OBJETIVO[respostas.objetivo] },
    { titulo: "Negociação", texto: ROTULOS_TENTATIVA[respostas.tentativa] },
    { titulo: "Como você se sente", texto: ROTULOS_SENTIMENTO[respostas.sentimento] },
  ];
  if (respostas.causas.length > 0) {
    contou.push({ titulo: "O que mais pesou", texto: respostas.causas.map((c) => ROTULOS_CAUSA[c]).join(", ") });
  }

  return (
    <>
      <header className="documento__capa">
        <p className="apoio">Resultado do quiz de {respostas.nome}</p>
        <p className="sobretitulo">Sua situação</p>
        <h1 className="titulo-1">{perfil.titulo}</h1>
        <p className="destaque">{perfil.resumo}</p>
        <EscalaNivel nivel={d.nivel} />
        <p>
          <strong>Nível {d.nivel} de 4, {d.nivelRotulo.toLowerCase()}.</strong> {FRASE_NIVEL[d.nivel]}
        </p>
        <p className="apoio">{ACOLHIMENTO[respostas.sentimento]}</p>
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
        <h2 className="titulo-2">Seus números</h2>
        <LinhasDiagnostico d={d} />
        <p className="pequeno apoio">
          <Link href="/diagnostico">Corrigir minhas respostas</Link>
        </p>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Quanto cada dívida custa por mês</h2>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Dívida</th>
                <th scope="col">Você deve</th>
                <th scope="col">Juros por mês</th>
              </tr>
            </thead>
            <tbody>
              {porCusto.map((divida) => (
                <tr key={divida.id}>
                  <td>{divida.rotulo}</td>
                  <td>{brl(divida.saldo)}</td>
                  <td className="negativo">{brl(divida.jurosEstimadosMes)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{brl(d.totalDividas)}</td>
                <td className="negativo">{brl(d.jurosEstimadosMes)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="pequeno apoio">
          Os juros são estimativas: usamos a taxa que você informou ou, quando não informou, a taxa
          típica daquele tipo de dívida.
        </p>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">O que mais pesa no seu caso</h2>
        <dl className="topicos">
          {leitura.pontosCriticos.map((ponto) => (
            <div key={ponto.titulo}>
              <dt>{ponto.titulo}</dt>
              <dd>{ponto.explicacao}</dd>
            </div>
          ))}
        </dl>
      </section>

      {passo && (
        <section className="bloco">
          <h2 className="titulo-2">Por onde começar</h2>
          <div className="cenario cenario--plano">
            <p className="pequeno apoio">Sua primeira dívida a resolver</p>
            <p className="cenario__prazo">{passo.divida.rotulo}</p>
            <p>
              <span className="etiqueta">{ROTULOS_ACAO[passo.divida.acao]}</span>
            </p>
            <p>{passo.oQueFazer}</p>
          </div>
        </section>
      )}

      <section className="bloco bloco--final">
        <h2 className="titulo-2">O próximo passo: o seu plano completo</h2>
        <p className="destaque apoio">
          Seu resultado termina aqui, e é seu. Para quem quer o caminho inteiro, o plano completo é
          escrito a partir das suas respostas, começando pelo que você contou:
        </p>
        <dl className="contou">
          {contou.map((item) => (
            <div key={item.titulo}>
              <dt>{item.titulo}</dt>
              <dd>{item.texto}</dd>
            </div>
          ))}
        </dl>
        <p>Com isso, o plano traz:</p>
        <ul className="trancado">
          {itensDoPlano(respostas, d).map((item) => (
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
              Escrito por inteligência artificial para a situação “{perfil.titulo.toLowerCase()}”, com os
              números e as respostas que você acabou de dar, mais um guia que acompanha todo plano.
            </p>
            {vendaAberta && (
              <p className="pequeno apoio">
                Fica pronto em cerca de um minuto depois do pagamento. Pagamento único por Pix ou cartão.{" "}
                {MARCA.garantiaDias} dias para pedir o dinheiro de volta.
              </p>
            )}
          </div>
          <div className="canhoto__valor">
            {vendaAberta ? (
              <>
                <p className="canhoto__preco">{brlCentavos(PRECO_REAIS)}</p>
                <button type="button" className="botao botao--largo" onClick={liberarPlano} disabled={enviando}>
                  {enviando ? "Abrindo o pagamento" : "Liberar meu plano"}
                </button>
              </>
            ) : (
              <>
                <p className="titulo-3">Em breve</p>
                <p className="pequeno apoio">
                  O plano completo ainda não está à venda. Seu resultado continua guardado neste
                  aparelho.
                </p>
              </>
            )}
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
