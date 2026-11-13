import Link from "next/link";
import { ExtratoAnotado } from "@/components/ExtratoAnotado";
import { Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";
import { MARCA, PRECO_REAIS } from "@/lib/config";
import { brlCentavos } from "@/lib/formato";

const preco = brlCentavos(PRECO_REAIS);

const PERSONALIZADO = [
  "A leitura da sua situação, com os seus números",
  "A fila: em que ordem atacar cada dívida, e por quê",
  "O que fazer com cada dívida e a mensagem pronta para enviar ao credor",
  "A previsão de quitação no ritmo de hoje e seguindo o plano",
  "Onde cortar no seu orçamento, grupo por grupo",
  "Seus primeiros 7 dias e o plano de 30 dias, semana a semana",
];

const GUIA_FIXO = [
  "Os sete passos para sair do vermelho",
  "Como negociar: regras, canais e seis mensagens prontas",
  "Seus direitos em português claro",
  "Dez armadilhas e golpes que afundam mais",
  "O orçamento dos três potes",
  "Checklist do mês, ajuda gratuita e glossário",
];

const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Preciso pagar para fazer o diagnóstico?",
    resposta: `Não. Você responde às perguntas e vê o diagnóstico de graça: total das dívidas, quanto da renda está comprometida, juros estimados por mês e o nível da sua situação. Só o plano completo é pago, e você decide depois de ver o diagnóstico.`,
  },
  {
    pergunta: "Vocês negociam minhas dívidas por mim?",
    resposta:
      "Não. O plano mostra a ordem, o que pedir e o que dizer a cada credor, com as mensagens prontas. Quem negocia é você, pelos canais oficiais, sem intermediário.",
  },
  {
    pergunta: "Que dados vocês pedem?",
    resposta:
      "Valores: renda, gastos do mês e quanto você deve em cada dívida. Não pedimos CPF, senha, número de cartão nem nome de banco. As respostas ficam guardadas no seu aparelho e são enviadas ao nosso sistema apenas para gerar o plano.",
  },
  {
    pergunta: "Quem escreve o plano?",
    resposta:
      "As contas (totais, juros, ordem das dívidas e prazos) são feitas por um sistema de cálculo com regras fixas. O texto é escrito por inteligência artificial em cima desses números, para falar do seu caso e não de finanças em geral. O guia que acompanha o plano foi escrito por gente e é igual para todos.",
  },
  {
    pergunta: "Como recebo o plano?",
    resposta:
      "Na tela, logo depois do pagamento, em cerca de um minuto. Você pode salvar em PDF ou imprimir. Ele também fica guardado no navegador em que você respondeu.",
  },
  {
    pergunta: "Serve para quem está sem renda ou com o nome negativado?",
    resposta:
      "Sim. Nesses casos o plano muda de foco: proteger o essencial, renegociar tudo em conjunto e mostrar os caminhos gratuitos que a lei oferece, como a repactuação para superendividados.",
  },
  {
    pergunta: "E se eu não gostar?",
    resposta: `Você tem ${MARCA.garantiaDias} dias para pedir o dinheiro de volta. Escreva para ${MARCA.contatoEmail} e devolvemos o valor integral.`,
  },
  {
    pergunta: "Isso é consultoria financeira?",
    resposta:
      "Não. É um material educativo, com estimativas feitas a partir do que você informa. Para questões jurídicas, o plano indica onde buscar atendimento gratuito, como Procon e Defensoria Pública.",
  },
];

export default function PaginaInicial() {
  return (
    <>
      <header className="pagina topo">
        <Marca />
        <Link href="/diagnostico" className="botao botao--contorno botao--compacto topo__acao">
          Fazer meu diagnóstico
        </Link>
      </header>

      <main>
        <section className="pagina abertura">
          <div className="abertura__texto">
            <h1 className="titulo-1">
              Descubra em que ordem pagar suas dívidas e em quanto tempo elas acabam.
            </h1>
            <p className="destaque coluna">
              Você responde a algumas perguntas sobre renda, gastos e o que deve. O {MARCA.nome} calcula
              seu diagnóstico na hora e monta um plano de quitação escrito para o seu caso.
            </p>
            <div className="abertura__acao">
              <Link href="/diagnostico" className="botao">
                Fazer meu diagnóstico
              </Link>
              <p className="pequeno apoio">
                O diagnóstico é gratuito e leva uns 3 minutos. O plano completo custa {preco}, em
                pagamento único.
              </p>
            </div>
          </div>
          <ExtratoAnotado />
        </section>

        <section className="secao secao--pautada" id="como-funciona">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">Como funciona</h2>
            </div>
            <ol className="etapas">
              <li className="etapa">
                <h3 className="titulo-3">Você responde</h3>
                <p className="apoio">
                  Renda, gastos do mês e cada dívida que tem hoje. Não pedimos CPF, senha nem nome de
                  banco.
                </p>
              </li>
              <li className="etapa">
                <h3 className="titulo-3">Vê o diagnóstico na hora</h3>
                <p className="apoio">
                  Quanto você deve no total, quanto da renda está comprometida, quanto vira juros por
                  mês e o nível da sua situação. De graça.
                </p>
              </li>
              <li className="etapa">
                <h3 className="titulo-3">Libera o plano completo</h3>
                <p className="apoio">
                  Por {preco}, a inteligência artificial escreve o plano para o seu caso: a fila das
                  dívidas, o que dizer a cada credor e o que fazer semana a semana.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="secao" id="o-que-vem">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">O que vem no plano</h2>
              <p className="destaque apoio">
                Duas partes: uma escrita só para você e um guia que acompanha todo plano.
              </p>
            </div>
            <div className="sumario">
              <div className="sumario__grupo">
                <h3 className="titulo-3">Feito para o seu caso</h3>
                <p className="apoio">Muda de pessoa para pessoa, porque parte das suas respostas.</p>
                <ul className="sumario__lista">
                  {PERSONALIZADO.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="sumario__grupo">
                <h3 className="titulo-3">Guia que acompanha todo plano</h3>
                <p className="apoio">O método e as regras do jogo, para consultar quando precisar.</p>
                <ul className="sumario__lista">
                  {GUIA_FIXO.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="secao secao--pautada" id="para-quem">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">Para quem é, e para quem não é</h2>
            </div>
            <div className="duas-listas">
              <div className="pilha">
                <h3 className="titulo-3">É para você se</h3>
                <ul className="lista-marcada lista-marcada--sim">
                  <li>Deve no cartão, no cheque especial, em empréstimo, em loja ou tem contas atrasadas.</li>
                  <li>Não sabe por onde começar, nem quanto falta para acabar.</li>
                  <li>Quer negociar, mas não sabe o que pedir nem o que dizer.</li>
                  <li>Já tentou se organizar e o plano não durou um mês.</li>
                </ul>
              </div>
              <div className="pilha">
                <h3 className="titulo-3">Não é para você se</h3>
                <ul className="lista-marcada lista-marcada--nao">
                  <li>Procura dicas de investimento. O assunto aqui é dívida.</li>
                  <li>As dívidas são de uma empresa. O plano é para pessoa física.</li>
                  <li>Quer alguém que negocie no seu lugar. O plano mostra como, e quem negocia é você.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="secao" id="preco">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">Quanto custa</h2>
              <p className="destaque apoio">
                Você só paga depois de ver seu diagnóstico, se quiser o plano completo.
              </p>
            </div>
            <div className="canhoto">
              <div className="canhoto__corpo">
                <h3 className="titulo-3">Plano completo</h3>
                <ul className="lista-pontos">
                  <li>Parte personalizada, escrita para o seu caso</li>
                  <li>Guia com método, mensagens prontas e direitos</li>
                  <li>Liberado na hora, para ler na tela ou salvar em PDF</li>
                  <li>Pagamento único por Pix ou cartão, sem assinatura</li>
                  <li>{MARCA.garantiaDias} dias para pedir o dinheiro de volta</li>
                </ul>
              </div>
              <div className="canhoto__valor">
                <p className="canhoto__preco">{preco}</p>
                <Link href="/diagnostico" className="botao botao--largo">
                  Fazer meu diagnóstico
                </Link>
                <p className="pequeno apoio">O diagnóstico é gratuito.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="secao secao--pautada" id="duvidas">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">Dúvidas comuns</h2>
            </div>
            <div className="perguntas">
              {PERGUNTAS.map(({ pergunta, resposta }) => (
                <details key={pergunta} className="pergunta">
                  <summary>{pergunta}</summary>
                  <p className="pergunta__resposta">{resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Rodape />
    </>
  );
}
