"use client";

import { useState } from "react";
import { EscalaNivel, FRASE_NIVEL, LinhasDiagnostico } from "@/components/Resumo";
import { MARCA } from "@/lib/config";
import { TAXA_APOS_NEGOCIACAO } from "@/lib/diagnostico";
import { brl, dataExtenso, duracao, pct, pctTaxa } from "@/lib/formato";
import { AVISO_LEGAL, GUIA, type BlocoGuia } from "@/lib/guia";
import { ROTULOS_ACAO, ROTULOS_SITUACAO } from "@/lib/rotulos";
import type { Diagnostico, PlanoCompleto } from "@/lib/tipos";

function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="botao-texto pequeno nao-imprimir"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        } catch {
          // Sem permissão de área de transferência: a pessoa ainda pode selecionar o texto.
        }
      }}
    >
      {copiado ? "Mensagem copiada" : "Copiar mensagem"}
    </button>
  );
}

function Mensagem({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mensagem">
      <p className="pequeno apoio">{titulo}</p>
      <p className="mensagem__texto">{texto}</p>
      <BotaoCopiar texto={texto} />
    </div>
  );
}

function Cenarios({ d }: { d: Diagnostico }) {
  const planoFecha = d.planoViavel && d.plano.meses !== null;
  const soPagarNaoResolve =
    !planoFecha && d.pagamentoPlano > 0 && d.faltaMes === 0 && d.pagamentoParaQuitarEm3Anos !== null;
  return (
    <>
      <div className="cenarios">
        <div className="cenario cenario--atual">
          <p className="pequeno apoio">No ritmo de hoje</p>
          <p className="cenario__prazo negativo">
            {d.ritmoAtual.meses === null ? "As dívidas não acabam" : duracao(d.ritmoAtual.meses)}
          </p>
          <p>
            Pagando {brl(d.ritmoAtual.pagamentoMensal)} por mês
            {d.ritmoAtual.meses === null
              ? ", os juros crescem mais rápido do que os pagamentos."
              : `, com cerca de ${brl(d.ritmoAtual.jurosTotais)} em juros até o fim.`}
          </p>
        </div>
        <div className="cenario cenario--plano">
          <p className="pequeno apoio">Seguindo o plano</p>
          <p className="cenario__prazo positivo">
            {planoFecha
              ? duracao(d.plano.meses!)
              : soPagarNaoResolve
                ? "Só pagar não resolve"
                : "A conta ainda não fecha"}
          </p>
          {planoFecha ? (
            <p>
              Destinando {brl(d.pagamentoPlano)} por mês às dívidas, com cerca de{" "}
              {brl(d.plano.jurosTotais)} em juros até o fim.
              {d.economiaDeJuros !== null && d.economiaDeJuros > 0 && (
                <> São {brl(d.economiaDeJuros)} a menos em juros.</>
              )}
            </p>
          ) : soPagarNaoResolve ? (
            <p>
              Com {brl(d.pagamentoPlano)} por mês, os juros consomem quase tudo e a quitação levaria
              mais de cinco anos. Para acabar em três anos seriam cerca de{" "}
              {brl(d.pagamentoParaQuitarEm3Anos!)} por mês. A distância se fecha com desconto no valor
              das dívidas, renda extra ou a repactuação da Lei do Superendividamento.
            </p>
          ) : (
            <p>
              {d.faltaMes > 0
                ? `Mesmo com os cortes, faltam ${brl(d.faltaMes)} por mês para cobrir as parcelas que vencem.`
                : "Hoje não sobra valor suficiente para vencer os juros."}{" "}
              O caminho é renegociar tudo em conjunto e aumentar a renda.
            </p>
          )}
        </div>
      </div>
      <p className="pequeno apoio">
        São estimativas. O cenário do plano considera os cortes sugeridos, toda a sobra indo para as
        dívidas na ordem da fila e as dívidas caras renegociadas ou trocadas por crédito de até{" "}
        {pctTaxa(TAXA_APOS_NEGOCIACAO)} ao mês. Cada desconto que você conseguir negociando encurta o
        prazo.
      </p>
    </>
  );
}

function Bloco({ bloco }: { bloco: BlocoGuia }) {
  switch (bloco.tipo) {
    case "paragrafo":
      return <p>{bloco.texto}</p>;
    case "lista":
      return (
        <ul className="lista-pontos">
          {bloco.itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "marcar":
      return (
        <ul className="lista-caixas">
          {bloco.itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "passos":
      return (
        <ol className="lista-numerada">
          {bloco.itens.map((item) => (
            <li key={item.titulo}>
              <strong>{item.titulo}.</strong> {item.texto}
            </li>
          ))}
        </ol>
      );
    case "topicos":
      return (
        <dl className="topicos">
          {bloco.itens.map((item) => (
            <div key={item.titulo}>
              <dt>{item.titulo}</dt>
              <dd>{item.texto}</dd>
            </div>
          ))}
        </dl>
      );
    case "mensagem":
      return <Mensagem titulo={bloco.quando} texto={bloco.texto} />;
  }
}

export function PlanoDocumento({ plano }: { plano: PlanoCompleto }) {
  const { diagnostico: d, narrativa: n } = plano;
  const estrategias = new Map(n.estrategiaPorDivida.map((e) => [e.dividaId, e]));

  return (
    <article>
      <header className="documento__capa">
        <p className="apoio">
          {MARCA.nome}, gerado em {dataExtenso(plano.geradoEm)}
        </p>
        <h1 className="titulo-1">Plano de {plano.nome}</h1>
        <EscalaNivel nivel={d.nivel} />
        <p className="destaque">{FRASE_NIVEL[d.nivel]}</p>
        <div className="acoes-plano nao-imprimir">
          <button type="button" className="botao botao--compacto" onClick={() => window.print()}>
            Salvar em PDF ou imprimir
          </button>
        </div>
        <p className="pequeno apoio nao-imprimir">
          Na janela que abrir, escolha “Salvar como PDF”. O plano também fica guardado neste navegador.
        </p>
      </header>

      <section className="bloco">
        <h2 className="titulo-2">Sua situação hoje</h2>
        {n.leitura.map((paragrafo) => (
          <p key={paragrafo}>{paragrafo}</p>
        ))}
        <LinhasDiagnostico d={d} />
      </section>

      <section className="bloco">
        <h2 className="titulo-2">O que mais pesa no seu caso</h2>
        <dl className="topicos">
          {n.pontosCriticos.map((ponto) => (
            <div key={ponto.titulo}>
              <dt>{ponto.titulo}</dt>
              <dd>{ponto.explicacao}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Quando as dívidas acabam</h2>
        <Cenarios d={d} />
      </section>

      <section className="bloco">
        <h2 className="titulo-2">A fila das suas dívidas</h2>
        <p className="apoio">
          A ordem em que o dinheiro extra deve ir. Nas demais, pague o combinado e siga a orientação de
          cada uma.
        </p>
        <ol className="fila">
          {d.dividas.map((divida) => {
            const e = estrategias.get(divida.id);
            return (
              <li key={divida.id} className="fila__item">
                <div className="fila__cabeca">
                  <h3 className="titulo-3">{divida.rotulo}</h3>
                  <span className="numero negativo titulo-3">{brl(divida.saldo)}</span>
                </div>
                <p>
                  <span className="etiqueta">{ROTULOS_ACAO[divida.acao]}</span>
                </p>
                <p className="pequeno apoio">
                  {ROTULOS_SITUACAO[divida.situacao]}. Juros de {pctTaxa(divida.taxa)} ao mês
                  {divida.taxaInformada ? "" : " (estimativa)"}
                  {divida.jurosEstimadosMes > 0 && `, cerca de ${brl(divida.jurosEstimadosMes)} por mês`}.
                  {d.planoViavel &&
                    divida.quitadaNoMes !== null &&
                    divida.quitadaNoMes > 0 &&
                    ` Pela simulação, acaba no mês ${divida.quitadaNoMes} do plano.`}
                </p>
                {e && (
                  <>
                    <p>{e.oQueFazer}</p>
                    <p>{e.comoNegociar}</p>
                    <Mensagem titulo="Mensagem para enviar" texto={e.mensagemPronta} />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Seus primeiros 7 dias</h2>
        <ol className="lista-numerada">
          {n.primeiros7Dias.map((acao) => (
            <li key={acao}>{acao}</li>
          ))}
        </ol>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">O plano de 30 dias</h2>
        <div className="semanas">
          {n.plano30Dias.map((semana) => (
            <div key={semana.semana} className="semana">
              <p className="pequeno apoio">{semana.semana}</p>
              <h3 className="titulo-3">{semana.foco}</h3>
              <ul className="lista-pontos">
                {semana.acoes.map((acao) => (
                  <li key={acao}>{acao}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Seu orçamento</h2>
        <p className="pequeno apoio">
          Estimativa: o total sai da faixa que você escolheu no quiz e a divisão por grupo segue o que
          é comum nas casas brasileiras. Ajuste com os seus valores reais quando puder.
        </p>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Grupo</th>
                <th scope="col">Hoje</th>
                <th scope="col">Da renda</th>
                <th scope="col">Meta</th>
              </tr>
            </thead>
            <tbody>
              {d.orcamento.map((linha) => (
                <tr key={linha.categoria}>
                  <td>{linha.rotulo}</td>
                  <td>{brl(linha.atual)}</td>
                  <td className={linha.acima ? "negativo" : undefined}>
                    {linha.parteDaRenda === null ? "" : pct(linha.parteDaRenda)}
                  </td>
                  <td className={linha.corteSugerido > 0 ? "positivo" : undefined}>{brl(linha.meta)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{brl(d.gastosMes)}</td>
                <td>{d.renda > 0 ? pct(d.gastosMes / d.renda) : ""}</td>
                <td>{brl(d.gastosMes - d.cortesSugeridos)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p>
          Valor mensal para as dívidas, com as metas acima:{" "}
          <strong className="numero positivo">{brl(d.pagamentoPlano)}</strong>
        </p>
        <h3 className="titulo-3">Onde cortar</h3>
        <dl className="topicos">
          {n.ondeCortar.map((corte) => (
            <div key={corte.categoria}>
              <dt>{corte.categoria}</dt>
              <dd>{corte.sugestao}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bloco">
        <h2 className="titulo-2">Os próximos 90 dias</h2>
        <ul className="lista-pontos">
          {n.proximos90Dias.map((marco) => (
            <li key={marco}>{marco}</li>
          ))}
        </ul>
        <p className="destaque">{n.recado}</p>
      </section>

      <section className="bloco bloco--final">
        <h2 className="titulo-1">Guia {MARCA.nome}</h2>
        <p className="destaque apoio">
          A parte que acompanha todo plano: o método, as regras do jogo e os modelos para consultar
          sempre que precisar.
        </p>
        {GUIA.map((capitulo) => (
          <section key={capitulo.id} className="capitulo-guia">
            <h3 className="titulo-2">{capitulo.titulo}</h3>
            <p className="apoio">{capitulo.resumo}</p>
            {capitulo.blocos.map((bloco, i) => (
              <Bloco key={i} bloco={bloco} />
            ))}
          </section>
        ))}
        <p className="pequeno apoio">{AVISO_LEGAL}</p>
      </section>
    </article>
  );
}
