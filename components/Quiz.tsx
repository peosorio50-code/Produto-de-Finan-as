"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { CampoDinheiro, Cartoes, CartoesMultiplos } from "@/components/Campos";
import {
  gravarContato,
  gravarRascunho,
  gravarRespostas,
  lerContato,
  lerOrigem,
  lerRascunho,
} from "@/lib/armazenamento";
import { emailPareceValido, telefoneValido } from "@/lib/contato";
import { ROTULOS_GASTO, TIPOS_DIVIDA } from "@/lib/diagnostico";
import { mascaraTelefone } from "@/lib/formato";
import { LIMITES } from "@/lib/limites";
import {
  ROTULOS_CAUSA,
  ROTULOS_CONTROLE,
  ROTULOS_NEGATIVADO,
  ROTULOS_OBJETIVO,
  ROTULOS_RENDA,
  ROTULOS_RENDA_EXTRA,
  ROTULOS_RESERVA,
  ROTULOS_SENTIMENTO,
  ROTULOS_SITUACAO,
  ROTULOS_TENTATIVA,
} from "@/lib/rotulos";
import type {
  CategoriaGasto,
  Causa,
  Contato,
  Controle,
  Gastos,
  Negativado,
  Objetivo,
  RendaExtra,
  Reserva,
  Respostas,
  Sentimento,
  SituacaoDivida,
  Tentativa,
  TipoDivida,
  TipoRenda,
} from "@/lib/tipos";

/* ---------- Formulário ---------- */

interface DividaForm {
  chave: string;
  tipo: TipoDivida;
  apelido: string;
  saldo: number;
  parcela: number;
  situacao: SituacaoDivida | "";
  sabeJuros: boolean;
  juros: string;
}

interface Formulario {
  contato: Contato;
  pessoasNaCasa: number;
  tipoRenda: TipoRenda | "";
  rendaMensal: number;
  gastos: Gastos;
  tipos: TipoDivida[];
  dividas: DividaForm[];
  negativado: Negativado | "";
  tentativa: Tentativa | "";
  causas: Causa[];
  sentimento: Sentimento | "";
  controle: Controle | "";
  reserva: Reserva | "";
  rendaExtra: RendaExtra | "";
  objetivo: Objetivo | "";
}

const INICIAL: Formulario = {
  contato: { nome: "", email: "", telefone: "" },
  pessoasNaCasa: 0,
  tipoRenda: "",
  rendaMensal: 0,
  gastos: { moradia: 0, contas: 0, alimentacao: 0, transporte: 0, saude: 0, outros: 0 },
  tipos: [],
  dividas: [],
  negativado: "",
  tentativa: "",
  causas: [],
  sentimento: "",
  controle: "",
  reserva: "",
  rendaExtra: "",
  objetivo: "",
};

/** Muda quando o formato do rascunho muda, para não carregar um rascunho antigo. */
const VERSAO_RASCUNHO = 2;

function novaDivida(tipo: TipoDivida): DividaForm {
  return {
    chave: Math.random().toString(36).slice(2, 10),
    tipo,
    apelido: "",
    saldo: 0,
    parcela: 0,
    situacao: "",
    sabeJuros: false,
    juros: "",
  };
}

function lerJuros(texto: string): number | null {
  const n = Number(texto.replace(",", ".").replace("%", "").trim());
  return texto.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 30 ? n : null;
}

function limparContato(c: Contato): Contato {
  return { nome: c.nome.replace(/\s+/g, " ").trim(), email: c.email.trim().toLowerCase(), telefone: c.telefone };
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0]?.slice(0, LIMITES.maxNome) ?? "";
}

function paraRespostas(f: Formulario): Respostas {
  return {
    nome: primeiroNome(f.contato.nome),
    rendaMensal: f.tipoRenda === "sem_renda" ? 0 : f.rendaMensal,
    tipoRenda: f.tipoRenda as TipoRenda,
    pessoasNaCasa: f.pessoasNaCasa,
    gastos: f.gastos,
    dividas: f.dividas.map((d, i) => ({
      id: `d${i + 1}`,
      tipo: d.tipo,
      apelido: d.apelido.trim(),
      saldo: d.saldo,
      parcela: Math.min(d.parcela, d.saldo),
      situacao: d.situacao as SituacaoDivida,
      jurosMes: d.sabeJuros ? lerJuros(d.juros) : null,
    })),
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

/** Avisa o servidor (e, por ele, o webhook de leads). Falha em silêncio. */
function registrar(evento: "quiz_iniciado" | "quiz_concluido", contato: Contato, respostas?: Respostas) {
  void fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evento, contato, origem: lerOrigem(), respostas }),
    keepalive: true,
  }).catch(() => {});
}

/* ---------- Telas ---------- */

type Escolha = "pessoasNaCasa" | "tipoRenda" | "negativado" | "tentativa" | "sentimento" | "controle" | "reserva" | "rendaExtra" | "objetivo";

type Tela =
  | { id: "contato" }
  | { id: "escolha"; campo: Escolha }
  | { id: "renda" }
  | { id: "gastos" }
  | { id: "tipos" }
  | { id: "divida"; tipo: TipoDivida }
  | { id: "causas" };

const PESSOAS: Record<string, string> = { "1": "Só eu", "2": "2 pessoas", "3": "3 pessoas", "4": "4 pessoas", "5": "5 ou mais" };

const PERGUNTAS: Record<Escolha, { titulo: string; apoio?: string; opcoes: Record<string, string>; grade?: boolean }> = {
  pessoasNaCasa: {
    titulo: "Quantas pessoas vivem da sua renda, contando você?",
    opcoes: PESSOAS,
    grade: true,
  },
  tipoRenda: {
    titulo: "Como é a sua renda hoje?",
    apoio: "Some tudo o que a casa recebe: salário, bicos, benefícios, pensão.",
    opcoes: ROTULOS_RENDA,
  },
  negativado: { titulo: "Seu nome está negativado no Serasa ou no SPC?", opcoes: ROTULOS_NEGATIVADO },
  tentativa: { titulo: "Você já tentou negociar alguma dessas dívidas?", opcoes: ROTULOS_TENTATIVA },
  sentimento: {
    titulo: "Como você se sente quando pensa nas dívidas?",
    apoio: "Sem julgamento. Isso muda o jeito como seu resultado é escrito.",
    opcoes: ROTULOS_SENTIMENTO,
  },
  controle: { titulo: "Você acompanha seus gastos?", opcoes: ROTULOS_CONTROLE },
  reserva: { titulo: "Tem algum dinheiro guardado para emergências?", opcoes: ROTULOS_RESERVA },
  rendaExtra: { titulo: "Consegue fazer alguma renda extra nos próximos meses?", opcoes: ROTULOS_RENDA_EXTRA },
  objetivo: {
    titulo: "Por último: o que você mais quer resolver?",
    apoio: "Escolha o que vem primeiro para você.",
    opcoes: ROTULOS_OBJETIVO,
  },
};

const AJUDA_GASTO: Record<CategoriaGasto, string> = {
  moradia: "Aluguel, prestação da casa, condomínio",
  contas: "Luz, água, gás, internet, celular",
  alimentacao: "Mercado, feira, padaria, refeições fora",
  transporte: "Ônibus, combustível, aplicativos, manutenção",
  saude: "Remédios, plano de saúde, escola, cursos",
  outros: "Lazer, assinaturas, roupas, presentes",
};

const DETALHE_TIPO: Partial<Record<TipoDivida, string>> = {
  cartao: "Fatura parcelada, rotativo ou atrasada",
  contas_consumo: "Luz, água, gás, internet, aluguel ou condomínio",
  consignado: "Descontado direto do salário ou benefício",
  crediario: "Carnê ou cartão de loja",
};

const TITULO_TIPO: Record<TipoDivida, string> = {
  cartao: "Sobre o cartão de crédito",
  cheque_especial: "Sobre o cheque especial",
  emprestimo_pessoal: "Sobre o empréstimo pessoal",
  consignado: "Sobre o consignado",
  financiamento_veiculo: "Sobre o financiamento do veículo",
  financiamento_imovel: "Sobre o financiamento da casa",
  contas_consumo: "Sobre as contas atrasadas",
  crediario: "Sobre a loja ou o crediário",
  familia: "Sobre o que você deve a família ou amigos",
  outro: "Sobre a outra dívida",
};

const OPCOES_TIPO = Object.fromEntries(
  (Object.keys(TIPOS_DIVIDA) as TipoDivida[]).map((t) => [t, TIPOS_DIVIDA[t].rotulo]),
) as Record<TipoDivida, string>;

function montarTelas(f: Formulario): Tela[] {
  const telas: Tela[] = [
    { id: "contato" },
    { id: "escolha", campo: "pessoasNaCasa" },
    { id: "escolha", campo: "tipoRenda" },
  ];
  if (f.tipoRenda !== "sem_renda") telas.push({ id: "renda" });
  telas.push({ id: "gastos" }, { id: "tipos" });
  for (const tipo of f.tipos) telas.push({ id: "divida", tipo });
  telas.push(
    { id: "escolha", campo: "negativado" },
    { id: "escolha", campo: "tentativa" },
    { id: "causas" },
    { id: "escolha", campo: "sentimento" },
    { id: "escolha", campo: "controle" },
    { id: "escolha", campo: "reserva" },
    { id: "escolha", campo: "rendaExtra" },
    { id: "escolha", campo: "objetivo" },
  );
  return telas;
}

type Erros = Record<string, string>;

function validar(tela: Tela, f: Formulario): Erros {
  const e: Erros = {};
  switch (tela.id) {
    case "contato": {
      const c = limparContato(f.contato);
      if (c.nome.length < 2 || !/\p{L}/u.test(c.nome)) e.nome = "Escreva seu nome.";
      if (!emailPareceValido(c.email)) e.email = "Confira o e-mail. Ex.: nome@gmail.com";
      if (!telefoneValido(c.telefone)) e.telefone = "Informe o WhatsApp com DDD. Ex.: (11) 91234-5678";
      break;
    }
    case "escolha":
      if (!f[tela.campo]) e.escolha = "Escolha uma opção.";
      break;
    case "renda":
      if (f.rendaMensal <= 0) e.renda = "Informe quanto entra por mês. Um valor aproximado já serve.";
      break;
    case "gastos":
      if (Object.values(f.gastos).reduce((a, b) => a + b, 0) <= 0)
        e.gastos = "Preencha pelo menos um gasto. Um valor aproximado já serve.";
      break;
    case "tipos":
      if (f.tipos.length === 0) e.tipos = "Marque pelo menos uma.";
      break;
    case "divida":
      for (const d of f.dividas.filter((x) => x.tipo === tela.tipo)) {
        if (d.saldo <= 0) e[`${d.chave}-saldo`] = "Informe quanto você deve. Um valor aproximado já serve.";
        if (!d.situacao) e[`${d.chave}-situacao`] = "Escolha uma opção.";
        if (d.sabeJuros && lerJuros(d.juros) === null) e[`${d.chave}-juros`] = "Informe os juros ao mês, entre 0 e 30.";
      }
      break;
    case "causas":
      break;
  }
  return e;
}

/* ---------- Tela de análise ---------- */

const ANALISE = [
  "Somando suas dívidas",
  "Estimando os juros de cada uma",
  "Comparando com o que entra e sai do seu mês",
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
    if (salvo?.versao === VERSAO_RASCUNHO && salvo.formulario) {
      const formulario = { ...INICIAL, ...salvo.formulario };
      setF(formulario);
      setPasso(Math.min(Math.max(salvo.passo ?? 0, 0), montarTelas(formulario).length - 1));
    } else {
      const contato = lerContato();
      if (contato) setF((atual) => ({ ...atual, contato }));
    }
    setCarregado(true);
    return () => {
      if (espera.current) clearTimeout(espera.current);
    };
  }, []);

  useEffect(() => {
    if (carregado) gravarRascunho({ versao: VERSAO_RASCUNHO, formulario: f, passo });
  }, [f, passo, carregado]);

  function mudar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setF((atual) => ({ ...atual, [campo]: valor }));
  }

  function mudarContato(mudancas: Partial<Contato>) {
    setF((atual) => ({ ...atual, contato: { ...atual.contato, ...mudancas } }));
    // O aviso some assim que a pessoa mexe no campo; volta a ser conferido ao continuar.
    setErros((atual) => {
      const restantes = { ...atual };
      for (const campo of Object.keys(mudancas)) delete restantes[campo];
      return restantes;
    });
  }

  function mudarDivida(chave: string, mudancas: Partial<DividaForm>) {
    setF((atual) => ({
      ...atual,
      dividas: atual.dividas.map((d) => (d.chave === chave ? { ...d, ...mudancas } : d)),
    }));
  }

  function mudarTipos(tipos: TipoDivida[]) {
    setF((atual) => {
      // Mantém o que já foi preenchido dos tipos que continuam marcados.
      const mantidas = atual.dividas.filter((d) => tipos.includes(d.tipo));
      const novas = tipos.filter((t) => !mantidas.some((d) => d.tipo === t)).map(novaDivida);
      const ordem = (Object.keys(TIPOS_DIVIDA) as TipoDivida[]).filter((t) => tipos.includes(t));
      const dividas = [...mantidas, ...novas].sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo));
      return { ...atual, tipos: ordem, dividas };
    });
  }

  function irPara(novo: number) {
    setPasso(novo);
    setErros({});
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => titulo.current?.focus());
  }

  function concluir(formulario: Formulario) {
    const respostas = paraRespostas(formulario);
    gravarRespostas(respostas);
    registrar("quiz_concluido", limparContato(formulario.contato), respostas);
    setAnalisando(true);
    window.scrollTo({ top: 0 });
    espera.current = setTimeout(() => roteador.push("/resultado"), ANALISE.length * 650 + 500);
  }

  function avancar(formulario: Formulario = f) {
    const atual = telas[passo];
    const encontrados = validar(atual, formulario);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    if (atual.id === "contato") {
      const contato = limparContato(formulario.contato);
      const anterior = lerContato();
      if (JSON.stringify(anterior) !== JSON.stringify(contato)) {
        gravarContato(contato);
        registrar("quiz_iniciado", contato);
      }
      setF((x) => ({ ...x, contato }));
    }

    const proximas = montarTelas(formulario);
    if (passo >= proximas.length - 1) {
      concluir(formulario);
      return;
    }
    irPara(passo + 1);
  }

  /** Tocar numa resposta única já leva para a próxima pergunta. */
  function escolher(campo: Escolha, valor: string) {
    const formulario = {
      ...f,
      [campo]: campo === "pessoasNaCasa" ? Number(valor) : valor,
      // Quem está sem renda não informa valor de renda.
      ...(campo === "tipoRenda" && valor === "sem_renda" && { rendaMensal: 0 }),
    } as Formulario;
    setF(formulario);
    setErros({});
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => avancar(formulario), 260);
  }

  if (!carregado) return null;
  if (analisando) return <Analisando nome={primeiroNome(f.contato.nome)} />;

  const total = telas.length;
  const escolhaSemResposta = tela.id === "escolha" && !f[tela.campo];
  const ultimo = passo === total - 1;

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
          {passo === 0 ? "Antes de começar" : `Pergunta ${passo} de ${total - 1}`}
        </span>
        <div
          className="progresso__trilho"
          role="progressbar"
          aria-label="Progresso do quiz"
          aria-valuemin={0}
          aria-valuemax={total - 1}
          aria-valuenow={passo}
        >
          <div className="progresso__barra" style={{ width: `${Math.max(4, (passo / (total - 1)) * 100)}%` }} />
        </div>
      </div>

      {tela.id === "contato" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Descubra a situação real das suas dívidas
            </h1>
            <p className="apoio">
              São perguntas rápidas, quase todas de um toque. No fim você vê, de graça, como está sua
              situação e por onde começar. Para quem é o resultado?
            </p>
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
            valor={f[tela.campo] ? String(f[tela.campo]) : ""}
            aoEscolher={(v) => escolher(tela.campo, v)}
            erro={erros.escolha}
          />
        </>
      )}

      {tela.id === "renda" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Quanto entra por mês, já com os descontos?
            </h1>
            <p className="apoio">
              {f.tipoRenda === "variavel"
                ? "Use a média dos últimos três meses."
                : "O valor que cai na conta, não o do contracheque."}
            </p>
          </div>
          <CampoDinheiro
            rotulo="Renda da casa por mês"
            valor={f.rendaMensal}
            aoMudar={(v) => mudar("rendaMensal", v)}
            erro={erros.renda}
          />
        </>
      )}

      {tela.id === "gastos" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
              Quanto sai por mês com o dia a dia?
            </h1>
            <p className="apoio">
              Valores aproximados já servem. Não inclua parcelas de dívidas: elas vêm a seguir.
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

      {tela.id === "tipos" && (
        <>
          <div className="passo__cabeca">
            <h1 className="titulo-2" id="pergunta" ref={titulo} tabIndex={-1}>
              Quais destas dívidas você tem hoje?
            </h1>
            <p className="apoio">Marque todas. Em seguida, uma pergunta rápida sobre cada uma.</p>
          </div>
          <CartoesMultiplos
            rotuladoPor="pergunta"
            opcoes={OPCOES_TIPO}
            detalhes={DETALHE_TIPO}
            valores={f.tipos}
            aoMudar={mudarTipos}
            erro={erros.tipos}
          />
        </>
      )}

      {tela.id === "divida" && (
        <TelaDivida
          tipo={tela.tipo}
          dividas={f.dividas.filter((d) => d.tipo === tela.tipo)}
          podeAdicionar={f.dividas.length < LIMITES.maxDividas}
          erros={erros}
          titulo={titulo}
          aoMudar={mudarDivida}
          aoAdicionar={() => mudar("dividas", [...f.dividas, novaDivida(tela.tipo)])}
          aoRemover={(chave) => mudar("dividas", f.dividas.filter((d) => d.chave !== chave))}
        />
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
            aoMudar={(v) => mudar("causas", v)}
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
        {!escolhaSemResposta && (
          <button type="submit" className="botao">
            {passo === 0 ? "Começar o quiz" : ultimo ? "Ver meu resultado" : "Continuar"}
          </button>
        )}
      </div>
    </form>
  );
}

function TelaDivida({
  tipo,
  dividas,
  podeAdicionar,
  erros,
  titulo,
  aoMudar,
  aoAdicionar,
  aoRemover,
}: {
  tipo: TipoDivida;
  dividas: DividaForm[];
  podeAdicionar: boolean;
  erros: Erros;
  titulo: RefObject<HTMLHeadingElement | null>;
  aoMudar: (chave: string, mudancas: Partial<DividaForm>) => void;
  aoAdicionar: () => void;
  aoRemover: (chave: string) => void;
}) {
  const varias = dividas.length > 1;
  const rotulo = TIPOS_DIVIDA[tipo].rotulo;
  return (
    <>
      <div className="passo__cabeca">
        <h1 className="titulo-2" ref={titulo} tabIndex={-1}>
          {TITULO_TIPO[tipo]}
        </h1>
        <p className="apoio">Se não souber o valor exato, coloque o mais próximo que lembrar.</p>
      </div>
      {dividas.map((d, i) => (
        <div key={d.chave} className={varias ? "divida" : "pilha-divida"}>
          {varias && (
            <div className="divida__cabeca">
              <h2 className="titulo-3">
                {rotulo} {i + 1}
              </h2>
              <button type="button" className="botao-texto" onClick={() => aoRemover(d.chave)}>
                Remover<span className="so-leitor"> {rotulo.toLowerCase()} {i + 1}</span>
              </button>
            </div>
          )}
          <div className="grade-campos grade-campos--2">
            <CampoDinheiro
              rotulo="Quanto você deve hoje"
              valor={d.saldo}
              aoMudar={(v) => aoMudar(d.chave, { saldo: v })}
              erro={erros[`${d.chave}-saldo`]}
            />
            <CampoDinheiro
              rotulo="Quanto paga por mês nela"
              ajuda="Se não está pagando, deixe em branco."
              valor={d.parcela}
              aoMudar={(v) => aoMudar(d.chave, { parcela: v })}
            />
          </div>
          <Cartoes
            legenda="Ela está em dia?"
            opcoes={ROTULOS_SITUACAO}
            valor={d.situacao}
            aoEscolher={(v) => aoMudar(d.chave, { situacao: v })}
            erro={erros[`${d.chave}-situacao`]}
          />
          {varias && (
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
                onChange={(e) => aoMudar(d.chave, { apelido: e.target.value })}
              />
            </div>
          )}
          <label className="opcao">
            <input
              type="checkbox"
              checked={d.sabeJuros}
              onChange={(e) => aoMudar(d.chave, { sabeJuros: e.target.checked })}
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
                onChange={(e) => aoMudar(d.chave, { juros: e.target.value.slice(0, 6) })}
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
      {podeAdicionar && (
        <button type="button" className="botao botao--contorno" onClick={aoAdicionar}>
          Tenho mais uma dívida deste tipo
        </button>
      )}
    </>
  );
}
