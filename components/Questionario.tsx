"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CampoDinheiro, Multiplas, Opcoes } from "@/components/Campos";
import { gravarRascunho, gravarRespostas, lerRascunho } from "@/lib/armazenamento";
import { ROTULOS_GASTO, TIPOS_DIVIDA } from "@/lib/diagnostico";
import {
  ROTULOS_CAUSA,
  ROTULOS_CONTROLE,
  ROTULOS_NEGATIVADO,
  ROTULOS_OBJETIVO,
  ROTULOS_RENDA,
  ROTULOS_RENDA_EXTRA,
  ROTULOS_RESERVA,
  ROTULOS_SITUACAO,
} from "@/lib/rotulos";
import type {
  CategoriaGasto,
  Causa,
  Controle,
  Gastos,
  Negativado,
  Objetivo,
  RendaExtra,
  Reserva,
  Respostas,
  SituacaoDivida,
  TipoDivida,
  TipoRenda,
} from "@/lib/tipos";
import { LIMITES } from "@/lib/limites";

interface DividaForm {
  chave: string;
  tipo: TipoDivida | "";
  apelido: string;
  saldo: number;
  parcela: number;
  situacao: SituacaoDivida | "";
  sabeJuros: boolean;
  juros: string;
}

interface Formulario {
  nome: string;
  pessoasNaCasa: number;
  tipoRenda: TipoRenda | "";
  rendaMensal: number;
  gastos: Gastos;
  dividas: DividaForm[];
  negativado: Negativado | "";
  causas: Causa[];
  controle: Controle | "";
  reserva: Reserva | "";
  rendaExtra: RendaExtra | "";
  objetivo: Objetivo | "";
}

type Erros = Record<string, string>;

const TOTAL_PASSOS = 7;

const AJUDA_GASTO: Record<CategoriaGasto, string> = {
  moradia: "Aluguel, prestação da casa, condomínio",
  contas: "Luz, água, gás, internet, celular",
  alimentacao: "Mercado, feira, padaria, refeições fora",
  transporte: "Ônibus, combustível, aplicativos, manutenção",
  saude: "Remédios, plano de saúde, escola, cursos",
  outros: "Lazer, assinaturas, roupas, presentes",
};

const AJUDA_TIPO: Partial<Record<TipoDivida, string>> = {
  cartao: "Fatura parcelada, rotativo ou em atraso. Não conte a fatura do mês que você paga inteira.",
  contas_consumo: "Luz, água, gás, internet, aluguel ou condomínio em atraso.",
  consignado: "Empréstimo descontado direto do salário ou do benefício.",
  crediario: "Carnê ou cartão de loja.",
};

function novaDivida(): DividaForm {
  return {
    chave: Math.random().toString(36).slice(2, 10),
    tipo: "",
    apelido: "",
    saldo: 0,
    parcela: 0,
    situacao: "",
    sabeJuros: false,
    juros: "",
  };
}

const INICIAL: Formulario = {
  nome: "",
  pessoasNaCasa: 1,
  tipoRenda: "",
  rendaMensal: 0,
  gastos: { moradia: 0, contas: 0, alimentacao: 0, transporte: 0, saude: 0, outros: 0 },
  dividas: [novaDivida()],
  negativado: "",
  causas: [],
  controle: "",
  reserva: "",
  rendaExtra: "",
  objetivo: "",
};

function lerJuros(texto: string): number | null {
  const n = Number(texto.replace(",", ".").replace("%", "").trim());
  return texto.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 30 ? n : null;
}

function validar(passo: number, f: Formulario): Erros {
  const e: Erros = {};
  if (passo === 0) {
    if (!f.nome.trim()) e.nome = "Escreva como podemos chamar você.";
  }
  if (passo === 1) {
    if (!f.tipoRenda) e.tipoRenda = "Escolha uma opção.";
    else if (f.tipoRenda !== "sem_renda" && f.rendaMensal <= 0) e.rendaMensal = "Informe quanto entra por mês.";
  }
  if (passo === 2) {
    const total = Object.values(f.gastos).reduce((a, b) => a + b, 0);
    if (total <= 0) e.gastos = "Preencha pelo menos um gasto. Um valor aproximado já serve.";
  }
  if (passo === 3) {
    f.dividas.forEach((d) => {
      if (!d.tipo) e[`${d.chave}-tipo`] = "Escolha o tipo da dívida.";
      if (d.saldo <= 0) e[`${d.chave}-saldo`] = "Informe quanto você deve. Um valor aproximado já serve.";
      if (!d.situacao) e[`${d.chave}-situacao`] = "Escolha uma opção.";
      if (d.sabeJuros && lerJuros(d.juros) === null) e[`${d.chave}-juros`] = "Informe os juros ao mês, entre 0 e 30.";
    });
  }
  if (passo === 4) {
    if (!f.negativado) e.negativado = "Escolha uma opção.";
  }
  if (passo === 5) {
    if (!f.controle) e.controle = "Escolha uma opção.";
    if (!f.reserva) e.reserva = "Escolha uma opção.";
    if (!f.rendaExtra) e.rendaExtra = "Escolha uma opção.";
  }
  if (passo === 6) {
    if (!f.objetivo) e.objetivo = "Escolha uma opção.";
  }
  return e;
}

function paraRespostas(f: Formulario): Respostas {
  return {
    nome: f.nome.trim(),
    rendaMensal: f.tipoRenda === "sem_renda" ? 0 : f.rendaMensal,
    tipoRenda: f.tipoRenda as TipoRenda,
    pessoasNaCasa: f.pessoasNaCasa,
    gastos: f.gastos,
    dividas: f.dividas.map((d, i) => ({
      id: `d${i + 1}`,
      tipo: d.tipo as TipoDivida,
      apelido: d.apelido.trim(),
      saldo: d.saldo,
      parcela: Math.min(d.parcela, d.saldo),
      situacao: d.situacao as SituacaoDivida,
      jurosMes: d.sabeJuros ? lerJuros(d.juros) : null,
    })),
    negativado: f.negativado as Negativado,
    causas: f.causas,
    controle: f.controle as Controle,
    reserva: f.reserva as Reserva,
    rendaExtra: f.rendaExtra as RendaExtra,
    objetivo: f.objetivo as Objetivo,
  };
}

const OPCOES_TIPO = Object.fromEntries(
  (Object.keys(TIPOS_DIVIDA) as TipoDivida[]).map((t) => [t, TIPOS_DIVIDA[t].rotulo]),
) as Record<TipoDivida, string>;

export function Questionario() {
  const roteador = useRouter();
  const [f, setF] = useState<Formulario>(INICIAL);
  const [passo, setPasso] = useState(0);
  const [erros, setErros] = useState<Erros>({});
  const [carregado, setCarregado] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const salvo = lerRascunho<{ formulario: Formulario; passo: number }>();
    if (salvo?.formulario?.dividas?.length) {
      setF({ ...INICIAL, ...salvo.formulario });
      setPasso(Math.min(Math.max(salvo.passo ?? 0, 0), TOTAL_PASSOS - 1));
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (carregado) gravarRascunho({ formulario: f, passo });
  }, [f, passo, carregado]);

  function mudar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setF((atual) => ({ ...atual, [campo]: valor }));
  }

  function mudarDivida(chave: string, mudancas: Partial<DividaForm>) {
    setF((atual) => ({
      ...atual,
      dividas: atual.dividas.map((d) => (d.chave === chave ? { ...d, ...mudancas } : d)),
    }));
  }

  function irPara(novo: number) {
    setPasso(novo);
    setErros({});
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => titulo.current?.focus());
  }

  function avancar() {
    const encontrados = validar(passo, f);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    if (passo < TOTAL_PASSOS - 1) {
      irPara(passo + 1);
      return;
    }
    gravarRespostas(paraRespostas(f));
    roteador.push("/resultado");
  }

  const ultimo = passo === TOTAL_PASSOS - 1;

  return (
    <form
      className="passo"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        avancar();
      }}
    >
      <div className="progresso">
        <span className="pequeno apoio">
          Passo {passo + 1} de {TOTAL_PASSOS}
        </span>
        <div
          className="progresso__trilho"
          role="progressbar"
          aria-label="Progresso do diagnóstico"
          aria-valuemin={1}
          aria-valuemax={TOTAL_PASSOS}
          aria-valuenow={passo + 1}
        >
          <div className="progresso__barra" style={{ width: `${((passo + 1) / TOTAL_PASSOS) * 100}%` }} />
        </div>
      </div>

      {passo === 0 && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Para começar, como podemos chamar você?
            </h1>
            <p className="apoio">
              São 7 passos rápidos. Valores aproximados já servem, e você pode voltar e corrigir.
            </p>
          </div>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="nome">
              Seu primeiro nome
            </label>
            <input
              id="nome"
              className="entrada"
              type="text"
              autoComplete="given-name"
              maxLength={LIMITES.maxNome}
              value={f.nome}
              onChange={(e) => mudar("nome", e.target.value)}
              aria-invalid={erros.nome ? true : undefined}
              aria-describedby={erros.nome ? "nome-erro" : undefined}
            />
            {erros.nome && (
              <span className="campo__erro" id="nome-erro" role="alert">
                {erros.nome}
              </span>
            )}
          </div>
          <div className="campo">
            <span className="campo__rotulo" id="pessoas-rotulo">
              Quantas pessoas vivem da sua renda, contando você?
            </span>
            <div className="contador" role="group" aria-labelledby="pessoas-rotulo">
              <button
                type="button"
                className="contador__botao"
                aria-label="Diminuir"
                disabled={f.pessoasNaCasa <= 1}
                onClick={() => mudar("pessoasNaCasa", f.pessoasNaCasa - 1)}
              >
                −
              </button>
              <span className="contador__valor" aria-live="polite">
                {f.pessoasNaCasa}
              </span>
              <button
                type="button"
                className="contador__botao"
                aria-label="Aumentar"
                disabled={f.pessoasNaCasa >= 12}
                onClick={() => mudar("pessoasNaCasa", f.pessoasNaCasa + 1)}
              >
                +
              </button>
            </div>
          </div>
        </>
      )}

      {passo === 1 && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Quanto entra por mês?
            </h1>
            <p className="apoio">Some tudo o que a casa recebe: salário, bicos, benefícios, pensão.</p>
          </div>
          <Opcoes
            legenda="Como é a sua renda hoje?"
            valor={f.tipoRenda}
            opcoes={ROTULOS_RENDA}
            aoMudar={(v) => mudar("tipoRenda", v)}
            erro={erros.tipoRenda}
          />
          {f.tipoRenda !== "" && f.tipoRenda !== "sem_renda" && (
            <CampoDinheiro
              rotulo="Valor que entra por mês, já com os descontos"
              ajuda={
                f.tipoRenda === "variavel"
                  ? "Use a média dos últimos três meses."
                  : "O valor que cai na conta, não o do contracheque."
              }
              valor={f.rendaMensal}
              aoMudar={(v) => mudar("rendaMensal", v)}
              erro={erros.rendaMensal}
            />
          )}
        </>
      )}

      {passo === 2 && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Quanto sai por mês?
            </h1>
            <p className="apoio">
              Gastos do dia a dia, por grupo. Não inclua parcelas de dívidas: elas entram no próximo
              passo.
            </p>
          </div>
          <div className="grade-campos grade-campos--2">
            {(Object.keys(ROTULOS_GASTO) as CategoriaGasto[]).map((categoria) => (
              <CampoDinheiro
                key={categoria}
                rotulo={ROTULOS_GASTO[categoria]}
                ajuda={AJUDA_GASTO[categoria]}
                valor={f.gastos[categoria]}
                aoMudar={(v) => mudar("gastos", { ...f.gastos, [categoria]: v })}
              />
            ))}
          </div>
          {erros.gastos && (
            <p className="campo__erro" role="alert">
              {erros.gastos}
            </p>
          )}
        </>
      )}

      {passo === 3 && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              O que você deve hoje?
            </h1>
            <p className="apoio">
              Uma dívida por vez. Se não souber o valor exato, coloque o mais próximo que lembrar.
            </p>
          </div>
          {f.dividas.map((d, i) => (
            <div key={d.chave} className="divida">
              <div className="divida__cabeca">
                <h2 className="titulo-3">Dívida {i + 1}</h2>
                {f.dividas.length > 1 && (
                  <button
                    type="button"
                    className="botao-texto"
                    onClick={() => mudar("dividas", f.dividas.filter((x) => x.chave !== d.chave))}
                  >
                    Remover<span className="so-leitor"> dívida {i + 1}</span>
                  </button>
                )}
              </div>

              <div className="campo">
                <label className="campo__rotulo" htmlFor={`${d.chave}-tipo`}>
                  Tipo
                </label>
                <select
                  id={`${d.chave}-tipo`}
                  className="entrada"
                  value={d.tipo}
                  onChange={(e) => mudarDivida(d.chave, { tipo: e.target.value as TipoDivida })}
                  aria-invalid={erros[`${d.chave}-tipo`] ? true : undefined}
                >
                  <option value="" disabled>
                    Escolha
                  </option>
                  {(Object.keys(OPCOES_TIPO) as TipoDivida[]).map((t) => (
                    <option key={t} value={t}>
                      {OPCOES_TIPO[t]}
                    </option>
                  ))}
                </select>
                {d.tipo && AJUDA_TIPO[d.tipo] && <span className="campo__ajuda">{AJUDA_TIPO[d.tipo]}</span>}
                {erros[`${d.chave}-tipo`] && (
                  <span className="campo__erro" role="alert">
                    {erros[`${d.chave}-tipo`]}
                  </span>
                )}
              </div>

              <div className="grade-campos grade-campos--2">
                <CampoDinheiro
                  rotulo="Quanto você deve hoje"
                  valor={d.saldo}
                  aoMudar={(v) => mudarDivida(d.chave, { saldo: v })}
                  erro={erros[`${d.chave}-saldo`]}
                />
                <CampoDinheiro
                  rotulo="Quanto paga por mês nela"
                  ajuda="Se não está pagando, deixe em branco."
                  valor={d.parcela}
                  aoMudar={(v) => mudarDivida(d.chave, { parcela: v })}
                />
              </div>

              <Opcoes
                legenda="Situação"
                valor={d.situacao}
                opcoes={ROTULOS_SITUACAO}
                aoMudar={(v) => mudarDivida(d.chave, { situacao: v })}
                erro={erros[`${d.chave}-situacao`]}
              />

              <div className="campo">
                <label className="campo__rotulo" htmlFor={`${d.chave}-apelido`}>
                  Um nome para lembrar qual é (opcional)
                </label>
                <input
                  id={`${d.chave}-apelido`}
                  className="entrada"
                  type="text"
                  maxLength={LIMITES.maxApelido}
                  placeholder="Ex.: cartão roxo, loja de móveis"
                  value={d.apelido}
                  onChange={(e) => mudarDivida(d.chave, { apelido: e.target.value })}
                />
              </div>

              <label className="opcao">
                <input
                  type="checkbox"
                  checked={d.sabeJuros}
                  onChange={(e) => mudarDivida(d.chave, { sabeJuros: e.target.checked })}
                />
                <span>Sei os juros que pago ao mês nessa dívida</span>
              </label>
              {d.sabeJuros && (
                <div className="campo">
                  <label className="campo__rotulo" htmlFor={`${d.chave}-juros`}>
                    Juros ao mês, em %
                  </label>
                  <input
                    id={`${d.chave}-juros`}
                    className="entrada"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex.: 7,5"
                    value={d.juros}
                    onChange={(e) => mudarDivida(d.chave, { juros: e.target.value.slice(0, 6) })}
                    aria-invalid={erros[`${d.chave}-juros`] ? true : undefined}
                  />
                  {erros[`${d.chave}-juros`] && (
                    <span className="campo__erro" role="alert">
                      {erros[`${d.chave}-juros`]}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          {f.dividas.length < LIMITES.maxDividas && (
            <button
              type="button"
              className="botao botao--contorno"
              onClick={() => mudar("dividas", [...f.dividas, novaDivida()])}
            >
              Adicionar outra dívida
            </button>
          )}
        </>
      )}

      {passo === 4 && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Como está a situação?
            </h1>
            <p className="apoio">Sem julgamento. Isso muda a ordem do plano e o que vale negociar primeiro.</p>
          </div>
          <Opcoes
            legenda="Seu nome está negativado (Serasa ou SPC)?"
            valor={f.negativado}
            opcoes={ROTULOS_NEGATIVADO}
            aoMudar={(v) => mudar("negativado", v)}
            erro={erros.negativado}
          />
          <Multiplas
            legenda="O que mais pesou para chegar até aqui?"
            ajuda="Marque quantas quiser, ou nenhuma."
            valores={f.causas}
            opcoes={ROTULOS_CAUSA}
            aoMudar={(v) => mudar("causas", v)}
          />
        </>
      )}

      {passo === 5 && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Como é o seu dia a dia com o dinheiro?
            </h1>
          </div>
          <Opcoes
            legenda="Você acompanha seus gastos?"
            valor={f.controle}
            opcoes={ROTULOS_CONTROLE}
            aoMudar={(v) => mudar("controle", v)}
            erro={erros.controle}
          />
          <Opcoes
            legenda="Tem algum dinheiro guardado para emergências?"
            valor={f.reserva}
            opcoes={ROTULOS_RESERVA}
            aoMudar={(v) => mudar("reserva", v)}
            erro={erros.reserva}
          />
          <Opcoes
            legenda="Consegue fazer alguma renda extra nos próximos meses?"
            valor={f.rendaExtra}
            opcoes={ROTULOS_RENDA_EXTRA}
            aoMudar={(v) => mudar("rendaExtra", v)}
            erro={erros.rendaExtra}
          />
        </>
      )}

      {passo === 6 && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              O que você mais quer resolver?
            </h1>
            <p className="apoio">Escolha o que vem primeiro para você.</p>
          </div>
          <Opcoes
            legenda="Meu objetivo principal"
            valor={f.objetivo}
            opcoes={ROTULOS_OBJETIVO}
            aoMudar={(v) => mudar("objetivo", v)}
            erro={erros.objetivo}
          />
        </>
      )}

      <div className="navegacao">
        {passo > 0 ? (
          <button type="button" className="botao-texto" onClick={() => irPara(passo - 1)}>
            Voltar
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="botao">
          {ultimo ? "Ver meu diagnóstico" : "Continuar"}
        </button>
      </div>
    </form>
  );
}
