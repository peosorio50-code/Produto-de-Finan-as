"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cartoes, CartoesMultiplos } from "@/components/Campos";
import {
  gravarContato,
  gravarRascunho,
  gravarRespostas,
  lerContato,
  lerOrigem,
  lerRascunho,
} from "@/lib/armazenamento";
import { emailPareceValido, telefoneValido } from "@/lib/contato";
import { diagnosticar, TIPOS_DIVIDA } from "@/lib/diagnostico";
import {
  dividirGastos,
  FAIXAS_GASTOS,
  FAIXAS_GASTOS_SEM_RENDA,
  FAIXAS_PARCELA,
  FAIXAS_RENDA,
  FAIXAS_SALDO,
  rotulos,
  type ChaveGastos,
  type ChaveGastosSemRenda,
  type ChaveParcela,
  type ChaveRenda,
  type ChaveSaldo,
} from "@/lib/faixas";
import { postar } from "@/lib/api";
import { resumirParaLead } from "@/lib/resumo";
import { mascaraTelefone } from "@/lib/formato";
import { LIMITES } from "@/lib/limites";
import {
  ROTULOS_CAUSA,
  ROTULOS_CONTROLE,
  ROTULOS_NEGATIVADO,
  ROTULOS_OBJETIVO,
  ROTULOS_RENDA_EXTRA,
  ROTULOS_RESERVA,
  ROTULOS_SENTIMENTO,
  ROTULOS_SITUACAO,
  ROTULOS_TENTATIVA,
} from "@/lib/rotulos";
import type {
  Causa,
  Contato,
  Controle,
  Negativado,
  Objetivo,
  RendaExtra,
  Reserva,
  Respostas,
  Sentimento,
  SituacaoDivida,
  Tentativa,
  TipoDivida,
} from "@/lib/tipos";

/*
 * O quiz é só de toques: nenhuma pergunta pede para digitar ou lembrar um
 * número exato. Valores vêm em faixas (lib/faixas.ts). O contato fica no fim,
 * quando a pessoa já respondeu tudo e quer ver o resultado.
 */

/* ---------- Formulário ---------- */

interface DividaForm {
  tipo: TipoDivida;
  saldo: ChaveSaldo | "";
  situacao: SituacaoDivida | "";
  parcela: ChaveParcela | "";
}

interface Formulario {
  tipos: TipoDivida[];
  dividas: DividaForm[];
  negativado: Negativado | "";
  tentativa: Tentativa | "";
  renda: ChaveRenda | "";
  tipoRenda: "fixa" | "variavel" | "";
  gastos: ChaveGastos | "";
  gastosSemRenda: ChaveGastosSemRenda | "";
  pessoasNaCasa: string;
  causas: Causa[];
  sentimento: Sentimento | "";
  controle: Controle | "";
  reserva: Reserva | "";
  rendaExtra: RendaExtra | "";
  objetivo: Objetivo | "";
  contato: Contato;
}

const INICIAL: Formulario = {
  tipos: [],
  dividas: [],
  negativado: "",
  tentativa: "",
  renda: "",
  tipoRenda: "",
  gastos: "",
  gastosSemRenda: "",
  pessoasNaCasa: "",
  causas: [],
  sentimento: "",
  controle: "",
  reserva: "",
  rendaExtra: "",
  objetivo: "",
  contato: { nome: "", email: "", telefone: "" },
};

/** Muda quando o formato do rascunho muda, para não carregar um rascunho antigo. */
const VERSAO_RASCUNHO = 3;

function limparContato(c: Contato): Contato {
  return { nome: c.nome.replace(/\s+/g, " ").trim(), email: c.email.trim().toLowerCase(), telefone: c.telefone };
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0]?.slice(0, LIMITES.maxNome) ?? "";
}

function semRenda(f: Formulario): boolean {
  return f.renda === "r0";
}

function paraRespostas(f: Formulario): Respostas {
  const renda = f.renda ? FAIXAS_RENDA[f.renda].valor : 0;
  const totalGastos = semRenda(f)
    ? f.gastosSemRenda
      ? FAIXAS_GASTOS_SEM_RENDA[f.gastosSemRenda].valor
      : 0
    : f.gastos
      ? Math.round(renda * FAIXAS_GASTOS[f.gastos].valor)
      : 0;
  return {
    nome: primeiroNome(f.contato.nome),
    rendaMensal: renda,
    tipoRenda: semRenda(f) ? "sem_renda" : (f.tipoRenda || "fixa"),
    pessoasNaCasa: Number(f.pessoasNaCasa) || 1,
    gastos: dividirGastos(totalGastos),
    dividas: f.dividas.map((d, i) => {
      const saldo = d.saldo ? FAIXAS_SALDO[d.saldo].valor : 0;
      // Quem está há mais de três meses sem pagar não responde a parcela.
      const parcela = d.situacao === "atraso_mais_90" || !d.parcela ? 0 : FAIXAS_PARCELA[d.parcela].valor;
      return {
        id: `d${i + 1}`,
        tipo: d.tipo,
        apelido: "",
        saldo,
        parcela: Math.min(parcela, saldo),
        situacao: d.situacao as SituacaoDivida,
        jurosMes: null,
      };
    }),
    negativado: f.negativado as Negativado,
    causas: f.causas,
    tentativa: f.tentativa as Tentativa,
    sentimento: f.sentimento as Sentimento,
    controle: f.controle as Controle,
    reserva: f.reserva as Reserva,
    rendaExtra: f.rendaExtra as RendaExtra,
    objetivo: f.objetivo as Objetivo,
  };
}

/** Avisa o servidor. Falha em silêncio. */
function registrar(evento: "quiz_iniciado" | "quiz_concluido", contato: Contato, respostas?: Respostas) {
  const resumo = respostas ? resumirParaLead(respostas, diagnosticar(respostas)) : undefined;
  void postar("/lead", { evento, contato, origem: lerOrigem(), resumo }, true).catch(() => {});
}

/* ---------- Telas ---------- */

type Escolha =
  | "negativado"
  | "tentativa"
  | "renda"
  | "tipoRenda"
  | "gastos"
  | "gastosSemRenda"
  | "pessoasNaCasa"
  | "sentimento"
  | "controle"
  | "reserva"
  | "rendaExtra"
  | "objetivo";

type CampoDivida = "saldo" | "situacao" | "parcela";

type Tela =
  | { id: "tipos" }
  | { id: "divida"; indice: number; campo: CampoDivida }
  | { id: "escolha"; campo: Escolha }
  | { id: "causas" }
  | { id: "contato" };

const PERGUNTAS: Record<Escolha, { titulo: string; apoio?: string; opcoes: Record<string, string>; grade?: boolean }> = {
  negativado: { titulo: "O nome está negativado no Serasa ou no SPC?", opcoes: ROTULOS_NEGATIVADO },
  tentativa: { titulo: "Já tentou negociar alguma dessas dívidas?", opcoes: ROTULOS_TENTATIVA },
  renda: {
    titulo: "Quanto entra por mês na casa, mais ou menos?",
    apoio: "Somando salário, bicos, benefícios e pensão. Não precisa ser exato.",
    opcoes: rotulos(FAIXAS_RENDA),
  },
  tipoRenda: {
    titulo: "Essa renda é…",
    opcoes: { fixa: "Fixa (salário, aposentadoria ou pensão)", variavel: "Varia de mês para mês" },
  },
  gastos: {
    titulo: "As contas do dia a dia levam quanto dessa renda?",
    apoio: "Aluguel, mercado, luz, água, transporte… Sem contar as parcelas das dívidas.",
    opcoes: rotulos(FAIXAS_GASTOS),
  },
  gastosSemRenda: {
    titulo: "Quanto custa manter a casa por mês, mais ou menos?",
    apoio: "Aluguel, mercado, luz, água, transporte… Sem contar as parcelas das dívidas.",
    opcoes: rotulos(FAIXAS_GASTOS_SEM_RENDA),
  },
  pessoasNaCasa: {
    titulo: "Quantas pessoas vivem dessa renda?",
    opcoes: { "1": "Só eu", "2": "2 pessoas", "3": "3 pessoas", "4": "4 pessoas", "5": "5 ou mais" },
    grade: true,
  },
  sentimento: {
    titulo: "Como fica a cabeça quando pensa nas dívidas?",
    apoio: "Sem julgamento. Isso muda o jeito como o resultado é escrito.",
    opcoes: ROTULOS_SENTIMENTO,
  },
  controle: { titulo: "Costuma anotar os gastos?", opcoes: ROTULOS_CONTROLE },
  reserva: { titulo: "Tem algum dinheiro guardado para emergências?", opcoes: ROTULOS_RESERVA },
  rendaExtra: { titulo: "Daria para fazer alguma renda extra nos próximos meses?", opcoes: ROTULOS_RENDA_EXTRA },
  objetivo: {
    titulo: "Última: o que mais quer resolver primeiro?",
    opcoes: ROTULOS_OBJETIVO,
  },
};

const DETALHE_TIPO: Partial<Record<TipoDivida, string>> = {
  cartao: "Fatura parcelada, rotativo ou atrasada",
  contas_consumo: "Luz, água, gás, internet, aluguel ou condomínio",
  consignado: "Descontado direto do salário ou benefício",
  crediario: "Carnê ou cartão de loja",
};

/** Como a dívida é chamada dentro da pergunta: "Quanto deve no cartão?". */
const NA_DIVIDA: Record<TipoDivida, string> = {
  cartao: "no cartão de crédito",
  cheque_especial: "no cheque especial",
  emprestimo_pessoal: "no empréstimo pessoal",
  consignado: "no consignado",
  financiamento_veiculo: "no financiamento do veículo",
  financiamento_imovel: "no financiamento da casa",
  contas_consumo: "nas contas atrasadas",
  crediario: "na loja ou no crediário",
  familia: "para a família ou os amigos",
  outro: "na outra dívida",
};

const OPCOES_TIPO = Object.fromEntries(
  (Object.keys(TIPOS_DIVIDA) as TipoDivida[]).map((t) => [t, TIPOS_DIVIDA[t].rotulo]),
) as Record<TipoDivida, string>;

const OPCOES_DIVIDA: Record<CampoDivida, Record<string, string>> = {
  saldo: rotulos(FAIXAS_SALDO),
  situacao: ROTULOS_SITUACAO,
  parcela: rotulos(FAIXAS_PARCELA),
};

function tituloDivida(tipo: TipoDivida, campo: CampoDivida): string {
  const onde = NA_DIVIDA[tipo];
  if (campo === "saldo") return tipo === "familia" ? "Quanto deve para a família ou os amigos, mais ou menos?" : `Quanto deve ${onde}, mais ou menos?`;
  if (campo === "situacao") return `E ${onde}, os pagamentos estão…`;
  return `Quanto paga por mês ${onde}?`;
}

function montarTelas(f: Formulario): Tela[] {
  const telas: Tela[] = [{ id: "tipos" }];
  f.dividas.forEach((d, indice) => {
    telas.push({ id: "divida", indice, campo: "saldo" }, { id: "divida", indice, campo: "situacao" });
    if (d.situacao !== "atraso_mais_90") telas.push({ id: "divida", indice, campo: "parcela" });
  });
  telas.push(
    { id: "escolha", campo: "negativado" },
    { id: "escolha", campo: "tentativa" },
    { id: "escolha", campo: "renda" },
  );
  if (semRenda(f)) telas.push({ id: "escolha", campo: "gastosSemRenda" });
  else telas.push({ id: "escolha", campo: "tipoRenda" }, { id: "escolha", campo: "gastos" });
  telas.push(
    { id: "escolha", campo: "pessoasNaCasa" },
    { id: "causas" },
    { id: "escolha", campo: "sentimento" },
    { id: "escolha", campo: "controle" },
    { id: "escolha", campo: "reserva" },
    { id: "escolha", campo: "rendaExtra" },
    { id: "escolha", campo: "objetivo" },
    { id: "contato" },
  );
  return telas;
}

type Erros = Record<string, string>;

function valorDaTela(tela: Tela, f: Formulario): string {
  if (tela.id === "escolha") return f[tela.campo];
  if (tela.id === "divida") return f.dividas[tela.indice]?.[tela.campo] ?? "";
  return "";
}

function validar(tela: Tela, f: Formulario): Erros {
  const e: Erros = {};
  if (tela.id === "contato") {
    const c = limparContato(f.contato);
    if (c.nome.length < 2 || !/\p{L}/u.test(c.nome)) e.nome = "Escreva seu nome.";
    if (!emailPareceValido(c.email)) e.email = "Confira o e-mail. Ex.: nome@gmail.com";
    if (!telefoneValido(c.telefone)) e.telefone = "Informe o WhatsApp com DDD. Ex.: (11) 91234-5678";
  } else if (tela.id === "tipos") {
    if (f.tipos.length === 0) e.escolha = "Marque pelo menos uma.";
  } else if (tela.id !== "causas" && !valorDaTela(tela, f)) {
    e.escolha = "Escolha uma opção.";
  }
  return e;
}

/* ---------- Tela de análise ---------- */

const ANALISE = [
  "Somando as dívidas",
  "Estimando os juros de cada uma",
  "Comparando com o que entra e sai do mês",
  "Montando o seu resultado",
];

function Analisando({ nome }: { nome: string }) {
  const [feitos, setFeitos] = useState(0);
  useEffect(() => {
    const relogio = setInterval(() => setFeitos((n) => Math.min(n + 1, ANALISE.length)), 650);
    return () => clearInterval(relogio);
  }, []);
  return (
    <div className="espera" role="status" aria-live="polite">
      <h1 className="titulo-2">Analisando suas respostas{nome ? `, ${nome}` : ""}</h1>
      <div className="espera__traco" aria-hidden="true" />
      <ul className="analise">
        {ANALISE.map((etapa, i) => (
          <li key={etapa} className="analise__item" data-feito={i < feitos}>
            {etapa}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Quiz ---------- */

export function Quiz() {
  const roteador = useRouter();
  const [f, setF] = useState<Formulario>(INICIAL);
  const [passo, setPasso] = useState(0);
  const [erros, setErros] = useState<Erros>({});
  const [carregado, setCarregado] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  const telas = useMemo(() => montarTelas(f), [f]);
  const tela = telas[Math.min(passo, telas.length - 1)];

  useEffect(() => {
    const salvo = lerRascunho<{ versao: number; formulario: Formulario; passo: number }>();
    const contato = lerContato();
    if (salvo?.versao === VERSAO_RASCUNHO && salvo.formulario) {
      const formulario = { ...INICIAL, ...salvo.formulario };
      setF(formulario);
      setPasso(Math.min(Math.max(salvo.passo ?? 0, 0), montarTelas(formulario).length - 1));
    } else if (contato) {
      setF((atual) => ({ ...atual, contato }));
    }
    setCarregado(true);
    return () => {
      if (espera.current) clearTimeout(espera.current);
    };
  }, []);

  useEffect(() => {
    if (carregado) gravarRascunho({ versao: VERSAO_RASCUNHO, formulario: f, passo });
  }, [f, passo, carregado]);

  function mudarContato(mudancas: Partial<Contato>) {
    setF((atual) => ({ ...atual, contato: { ...atual.contato, ...mudancas } }));
    setErros((atual) => {
      const restantes = { ...atual };
      for (const campo of Object.keys(mudancas)) delete restantes[campo];
      return restantes;
    });
  }

  function mudarTipos(tipos: TipoDivida[]) {
    setF((atual) => {
      const ordem = (Object.keys(TIPOS_DIVIDA) as TipoDivida[]).filter((t) => tipos.includes(t));
      // Mantém o que já foi respondido dos tipos que continuam marcados.
      const dividas = ordem.map(
        (tipo) => atual.dividas.find((d) => d.tipo === tipo) ?? { tipo, saldo: "", situacao: "", parcela: "" },
      ) as DividaForm[];
      return { ...atual, tipos: ordem, dividas };
    });
    setErros({});
  }

  function irPara(novo: number) {
    setPasso(novo);
    setErros({});
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => titulo.current?.focus());
  }

  function concluir(formulario: Formulario) {
    const contato = limparContato(formulario.contato);
    gravarContato(contato);
    const respostas = paraRespostas({ ...formulario, contato });
    gravarRespostas(respostas);
    registrar("quiz_concluido", contato, respostas);
    setAnalisando(true);
    window.scrollTo({ top: 0 });
    espera.current = setTimeout(() => roteador.push("/resultado"), ANALISE.length * 650 + 500);
  }

  function avancar(formulario: Formulario = f) {
    const proximas = montarTelas(formulario);
    const atual = proximas[Math.min(passo, proximas.length - 1)];
    const encontrados = validar(atual, formulario);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    if (passo >= proximas.length - 1) {
      concluir(formulario);
      return;
    }
    irPara(passo + 1);
  }

  /** Tocar numa resposta única já leva para a próxima pergunta. */
  function escolher(valor: string) {
    let formulario: Formulario;
    if (tela.id === "divida") {
      const { indice, campo } = tela;
      formulario = {
        ...f,
        dividas: f.dividas.map((d, i) => (i === indice ? { ...d, [campo]: valor } : d)),
      };
    } else if (tela.id === "escolha") {
      formulario = { ...f, [tela.campo]: valor } as Formulario;
    } else {
      return;
    }
    setF(formulario);
    setErros({});
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => avancar(formulario), 240);
  }

  if (!carregado) return null;
  if (analisando) return <Analisando nome={primeiroNome(f.contato.nome)} />;

  const total = telas.length;
  const deUmToque = tela.id === "escolha" || tela.id === "divida";
  const semResposta = deUmToque && !valorDaTela(tela, f);
  const ultimo = passo === total - 1;
  const restam = total - 1 - passo;

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
          {ultimo ? "Último passo" : restam <= 3 ? "Quase lá" : passo === 0 ? "Leva uns 2 minutos" : "Só toques, sem digitar"}
        </span>
        <div
          className="progresso__trilho"
          role="progressbar"
          aria-label="Progresso do quiz"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={passo + 1}
        >
          <div className="progresso__barra" style={{ width: `${Math.max(6, ((passo + 1) / total) * 100)}%` }} />
        </div>
      </div>

      {tela.id === "tipos" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" id="pergunta" ref={titulo} tabIndex={-1}>
              Quais dessas dívidas existem hoje?
            </h1>
            <p className="apoio">Marque todas. Depois são só toques: nada de digitar valores.</p>
          </div>
          <CartoesMultiplos
            rotuladoPor="pergunta"
            opcoes={OPCOES_TIPO}
            detalhes={DETALHE_TIPO}
            valores={f.tipos}
            aoMudar={mudarTipos}
            erro={erros.escolha}
          />
        </>
      )}

      {tela.id === "divida" && (
        <>
          <div className="passo__cabeca">
            <p className="sobretitulo">{TIPOS_DIVIDA[f.dividas[tela.indice].tipo].rotulo}</p>
            <h1 className="titulo-2" id="pergunta" ref={titulo} tabIndex={-1}>
              {tituloDivida(f.dividas[tela.indice].tipo, tela.campo)}
            </h1>
            {tela.campo !== "situacao" && <p className="apoio">Não precisa ser exato: escolha a faixa mais perto.</p>}
          </div>
          <Cartoes
            rotuladoPor="pergunta"
            opcoes={OPCOES_DIVIDA[tela.campo]}
            grade={tela.campo !== "situacao"}
            valor={valorDaTela(tela, f)}
            aoEscolher={escolher}
            erro={erros.escolha}
          />
        </>
      )}

      {tela.id === "escolha" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" id="pergunta" ref={titulo} tabIndex={-1}>
              {PERGUNTAS[tela.campo].titulo}
            </h1>
            {PERGUNTAS[tela.campo].apoio && <p className="apoio">{PERGUNTAS[tela.campo].apoio}</p>}
          </div>
          <Cartoes
            rotuladoPor="pergunta"
            opcoes={PERGUNTAS[tela.campo].opcoes}
            grade={PERGUNTAS[tela.campo].grade}
            valor={valorDaTela(tela, f)}
            aoEscolher={escolher}
            erro={erros.escolha}
          />
        </>
      )}

      {tela.id === "causas" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" id="pergunta" ref={titulo} tabIndex={-1}>
              O que mais pesou para chegar até aqui?
            </h1>
            <p className="apoio">Marque quantas quiser, ou nenhuma.</p>
          </div>
          <CartoesMultiplos
            rotuladoPor="pergunta"
            opcoes={ROTULOS_CAUSA}
            valores={f.causas}
            aoMudar={(v) => setF((x) => ({ ...x, causas: v }))}
          />
        </>
      )}

      {tela.id === "contato" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Pronto! Seu resultado está calculado.
            </h1>
            <p className="apoio">Para quem é o resultado? Ele aparece na próxima tela, de graça.</p>
          </div>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="nome">
              Seu nome
            </label>
            <input
              id="nome"
              className="entrada"
              type="text"
              autoComplete="name"
              maxLength={LIMITES.maxNomeCompleto}
              value={f.contato.nome}
              onChange={(e) => mudarContato({ nome: e.target.value })}
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
            <label className="campo__rotulo" htmlFor="email">
              Seu e-mail
            </label>
            <input
              id="email"
              className="entrada"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={120}
              value={f.contato.email}
              onChange={(e) => mudarContato({ email: e.target.value })}
              aria-invalid={erros.email ? true : undefined}
              aria-describedby={erros.email ? "email-erro" : undefined}
            />
            {erros.email && (
              <span className="campo__erro" id="email-erro" role="alert">
                {erros.email}
              </span>
            )}
          </div>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="telefone">
              Seu WhatsApp, com DDD
            </label>
            <input
              id="telefone"
              className="entrada"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(11) 91234-5678"
              value={mascaraTelefone(f.contato.telefone)}
              onChange={(e) => {
                const digitos = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
                mudarContato({ telefone: digitos });
              }}
              aria-invalid={erros.telefone ? true : undefined}
              aria-describedby={erros.telefone ? "telefone-erro" : undefined}
            />
            {erros.telefone && (
              <span className="campo__erro" id="telefone-erro" role="alert">
                {erros.telefone}
              </span>
            )}
          </div>
          <p className="pequeno apoio">
            Usamos seu contato para falar com você sobre o seu resultado e sobre o plano completo, por
            e-mail e WhatsApp. Sem spam, e você pode pedir para sair quando quiser.{" "}
            <Link href="/privacidade" target="_blank">
              Privacidade
            </Link>
            .
          </p>
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
        {!semResposta && (
          <button type="submit" className="botao">
            {ultimo ? "Ver meu resultado" : "Continuar"}
          </button>
        )}
      </div>
    </form>
  );
}
