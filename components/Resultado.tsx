"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { ROTULOS_ACAO } from "@/lib/rotulos";
import type { Diagnostico, Respostas } from "@/lib/tipos";

const ERROS: Record<string, string> = {
  pagamento_nao_configurado: "O plano completo ainda não está à venda. Tente de novo em alguns dias.",
  respostas_invalidas: "Alguma resposta ficou incompleta. Refaça o quiz e tente de novo.",
  falha_no_pagamento: "Não conseguimos abrir o pagamento agora. Tente de novo em alguns minutos.",
};

/**
 * Texto de enchimento das partes borradas. Não é o conteúdo do plano: ele só
 * existe depois do pagamento. Quem tirar o borrão lê só isto.
 */
const BORRADO = "Conteúdo liberado depois do pagamento, escrito para o seu caso";

function Cadeado({ classe = "trancado__cadeado" }: { classe?: string }) {
  return (
    <svg className={classe} viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.5 7V5a3.5 3.5 0 1 1 7 0v2h.5A1.5 1.5 0 0 1 13.5 8.5v5A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4 7h.5Zm1.5 0h4V5a2 2 0 1 0-4 0v2Z"
      />
    </svg>
  );
}

/** Prévia do plano com o conteúdo borrado: mostra a forma, esconde o conteúdo. */
function PreviaBloqueada({ respostas, d, acao }: { respostas: Respostas; d: Diagnostico; acao: ReactNode }) {
  const [primeira, ...outras] = d.dividas;
  return (
    <div className="previa">
      <div className="previa__conteudo" aria-hidden="true">
      <p className="previa__rotulo">Passo 1 · A ordem das suas dívidas</p>
      <ol className="previa__fila">
        {primeira && (
          <li>
            <span className="previa__n">1</span>
            <span>
              <strong>{primeira.rotulo}</strong>
              <span className="previa__acao">{ROTULOS_ACAO[primeira.acao]}</span>
            </span>
          </li>
        )}
        {outras.slice(0, 2).map((divida) => (
          <li key={divida.id}>
            <span className="previa__n">{divida.ordem}</span>
            <span className="borrado">
              <strong>{divida.rotulo}</strong>
            </span>
          </li>
        ))}
      </ol>
      <p className="previa__rotulo">Passo 2 · O que dizer para cada credor</p>
      <p className="previa__bolha borrado">
        Olá, meu nome é {respostas.nome}. {BORRADO}. {BORRADO}.
      </p>
      <p className="previa__rotulo">Passo 3 · Semana a semana</p>
      <ul className="previa__semanas borrado">
        <li>Semana 1: {BORRADO}</li>
        <li>Semana 2: {BORRADO}</li>
      </ul>
      </div>
      <div className="previa__acao-sobre">{acao}</div>
    </div>
  );
}

function Oferta({
  respostas,
  d,
  vendaAberta,
  enviando,
  aoComprar,
  segunda = false,
}: {
  respostas: Respostas;
  d: Diagnostico;
  vendaAberta: boolean;
  enviando: boolean;
  aoComprar: () => void;
  segunda?: boolean;
}) {
  if (!vendaAberta) {
    return (
      <div className="oferta">
        <p className="titulo-3">Plano completo: em breve</p>
        <p className="pequeno apoio">O plano completo ainda não está à venda. Seu resultado fica guardado neste aparelho.</p>
      </div>
    );
  }
  const botao = (
    <button type="button" className="botao botao--largo oferta__botao" onClick={aoComprar} disabled={enviando}>
      <Cadeado classe="oferta__cadeado" />
      {enviando ? "Abrindo o pagamento…" : "Desbloquear passo a passo"}
    </button>
  );
  return (
    <div className="oferta">
      {segunda ? botao : <PreviaBloqueada respostas={respostas} d={d} acao={botao} />}
      <p className="oferta__preco">
        <strong>{brlCentavos(PRECO_REAIS)}</strong> · pagamento único · Pix ou cartão
      </p>
      <p className="oferta__garantia">
        Pronto em cerca de 1 minuto · {MARCA.garantiaDias} dias de garantia: não gostou, devolvemos o valor
      </p>
    </div>
  );
}

/**
 * Resultado do quiz. A situação e a oferta do passo a passo (com a prévia
 * borrada) ficam na primeira dobra; o diagnóstico gratuito completo vem
 * logo abaixo, e a oferta se repete no fim.
 */
export function Resultado({ vendaAberta }: { vendaAberta: boolean }) {
  const parametros = useSearchParams();
  const [respostas, setRespostas] = useState<Respostas | null | undefined>(undefined);
  const [planoPronto, setPlanoPronto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const salvas = lerRespostas();
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
        <p className="apoio">São só toques e leva uns 2 minutos.</p>
        <Link href="/diagnostico" className="botao">
          Fazer o quiz gratuito
        </Link>
      </div>
    );
  }

  const porCusto = [...d.dividas].sort((a, b) => b.jurosEstimadosMes - a.jurosEstimadosMes);
  const passo = leitura.primeiroPasso;
  const perfil = perfilDaSituacao(d);
  const avisoErro = erro && (
    <p className="aviso aviso--erro" role="alert">
      {erro}
    </p>
  );

  return (
    <>
      <header className="resultado__topo">
        <p className="apoio pequeno">Resultado de {respostas.nome}</p>
        <h1 className="titulo-1 resultado__titulo">{perfil.titulo}</h1>
        <EscalaNivel nivel={d.nivel} />
        <div className="resultado__numeros">
          <div>
            <span className="resultado__valor negativo">≈ {brl(d.totalDividas)}</span>
            <span className="pequeno apoio">em dívidas</span>
          </div>
          <div>
            <span className="resultado__valor negativo">≈ {brl(d.jurosEstimadosMes)}</span>
            <span className="pequeno apoio">por mês só de juros</span>
          </div>
        </div>
      </header>

      {parametros.get("pagamento") === "falhou" && (
        <p className="aviso aviso--erro" role="alert">
          O pagamento não foi concluído e nada foi cobrado. Você pode tentar de novo quando quiser.
        </p>
      )}
      {planoPronto && (
        <p className="aviso">
          Você já liberou um plano neste aparelho. <Link href={`/plano?ref=${planoPronto}`}>Abrir meu plano</Link>
        </p>
      )}

      <section className="resultado__oferta" aria-labelledby="titulo-oferta">
        <h2 className="titulo-2" id="titulo-oferta">
          Desbloqueie o seu passo a passo, {respostas.nome}
        </h2>
        <p className="apoio">
          A ordem certa {d.quantidadeDividas === 1 ? "para a sua dívida" : `das suas ${d.quantidadeDividas} dívidas`}, o
          que falar com cada credor e o que fazer em cada semana.
        </p>
        <Oferta respostas={respostas} d={d} vendaAberta={vendaAberta} enviando={enviando} aoComprar={liberarPlano} />
        {avisoErro}
      </section>

      <section className="bloco">
        <h2 className="titulo-2">O que o resultado mostra, de graça</h2>
        <p className="destaque">{perfil.resumo}</p>
        <p>
          <strong>Nível {d.nivel} de 4, {d.nivelRotulo.toLowerCase()}.</strong> {FRASE_NIVEL[d.nivel]}
        </p>
        <p className="apoio">{ACOLHIMENTO[respostas.sentimento]}</p>
        <LinhasDiagnostico d={d} />
        <p className="pequeno apoio">
          Valores aproximados, calculados a partir das faixas que você escolheu.{" "}
          <Link href="/diagnostico">Refazer o quiz</Link>
        </p>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Quanto cada dívida custa por mês</h2>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Dívida</th>
                <th scope="col">Deve, mais ou menos</th>
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
        <p className="pequeno apoio">Os juros são estimativas pela taxa típica de cada tipo de dívida.</p>
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
            <p className="pequeno apoio">A primeira dívida a resolver</p>
            <p className="cenario__prazo">{passo.divida.rotulo}</p>
            <p>
              <span className="etiqueta">{ROTULOS_ACAO[passo.divida.acao]}</span>
            </p>
            <p>{passo.oQueFazer}</p>
          </div>
        </section>
      )}

      <section className="bloco bloco--final">
        <h2 className="titulo-2">E depois da primeira dívida?</h2>
        <p className="destaque apoio">O passo a passo completo traz, para o seu caso:</p>
        <ul className="trancado">
          {itensDoPlano(respostas, d).map((item) => (
            <li key={item}>
              <Cadeado />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Oferta
          respostas={respostas}
          d={d}
          vendaAberta={vendaAberta}
          enviando={enviando}
          aoComprar={liberarPlano}
          segunda
        />
        {avisoErro}
      </section>
    </>
  );
}
