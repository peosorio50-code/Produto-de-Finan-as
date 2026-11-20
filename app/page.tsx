import Link from "next/link";
import { ExtratoAnotado } from "@/components/ExtratoAnotado";
import { Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";
import { MARCA } from "@/lib/config";

/*
 * A página inicial fala só do quiz gratuito. O plano pago é apresentado
 * depois, na tela do resultado, quando a pessoa já recebeu a sua situação.
 */

const NUMEROS = [
  "Quanto você deve no total",
  "Quanto vira juros por mês, dívida por dívida",
  "Que parte da sua renda as parcelas levam",
  "Quanto sobra ou falta no fim do mês",
];

const LEITURA = [
  "O nome da sua situação e o nível, de atenção a emergência",
  "Se as dívidas acabam no ritmo de hoje, e em quanto tempo",
  "O que mais pesa no seu caso",
  "Por onde começar",
];

const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "O quiz é gratuito mesmo?",
    resposta:
      "Sim. Você responde às perguntas com toques, informa nome, e-mail e WhatsApp no fim e vê o resultado na tela, sem pagar nada e sem informar cartão.",
  },
  {
    pergunta: "Que dados vocês pedem?",
    resposta:
      "Perguntas de múltipla escolha: quais dívidas existem, quanto se deve em cada uma e quanto entra por mês, sempre em faixas, sem digitar valores. No fim, nome, e-mail e WhatsApp. Não pedimos CPF, senha, número de cartão nem nome de banco.",
  },
  {
    pergunta: "Por que pedem e-mail e WhatsApp?",
    resposta:
      "Para falar com você sobre o seu resultado e sobre o plano completo. Sem spam, e você pode pedir para sair quando quiser.",
  },
  {
    pergunta: "Como os juros são calculados?",
    resposta:
      "Usamos a taxa típica de cada tipo de dívida no Brasil e o meio da faixa de valor que você escolheu. Por isso os valores são estimativas, não o número exato do seu contrato.",
  },
  {
    pergunta: "Vocês negociam minhas dívidas por mim?",
    resposta:
      "Não. O quiz mostra onde você está e por onde começar. Quem negocia é você, pelos canais oficiais de cada credor, sem intermediário.",
  },
  {
    pergunta: "Serve para quem está sem renda ou com o nome negativado?",
    resposta:
      "Sim. O resultado leva isso em conta e muda a recomendação de por onde começar.",
  },
  {
    pergunta: "Isso é consultoria financeira?",
    resposta:
      "Não. É um material educativo, com estimativas feitas a partir do que você informa. Para questões jurídicas, procure atendimento gratuito no Procon ou na Defensoria Pública.",
  },
];

export default function PaginaInicial() {
  return (
    <>
      <header className="pagina topo">
        <Marca />
        <Link href="/diagnostico" className="botao botao--contorno botao--compacto topo__acao">
          Fazer o quiz
        </Link>
      </header>

      <main>
        <section className="pagina abertura">
          <div className="abertura__texto">
            <h1 className="titulo-1">
              Descubra a situação real das suas dívidas e por onde começar a sair delas.
            </h1>
            <p className="destaque coluna">
              Responda a um quiz rápido sobre renda, gastos e o que você deve. O {MARCA.nome} faz as
              contas e mostra na hora, de graça, como está a sua situação.
            </p>
            <div className="abertura__acao">
              <Link href="/diagnostico" className="botao">
                Fazer o quiz gratuito
              </Link>
              <p className="pequeno apoio">Leva uns 2 minutos, só com toques. Sem CPF e sem cartão.</p>
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
                <h3 className="titulo-3">Você responde ao quiz</h3>
                <p className="apoio">
                  Perguntas rápidas, quase todas de um toque: renda, gastos e cada dívida que você tem
                  hoje. Valores aproximados já servem.
                </p>
              </li>
              <li className="etapa">
                <h3 className="titulo-3">O {MARCA.nome} faz as contas</h3>
                <p className="apoio">
                  Soma tudo, estima os juros de cada dívida e compara com o que entra e sai do seu mês.
                </p>
              </li>
              <li className="etapa">
                <h3 className="titulo-3">Você vê a sua situação</h3>
                <p className="apoio">
                  Na mesma hora, na tela: o nome da sua situação, os seus números e por onde começar.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="secao" id="o-que-mostra">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">O que o resultado mostra</h2>
              <p className="destaque apoio">
                Os números que quase ninguém tem na ponta do lápis, e o que eles querem dizer.
              </p>
            </div>
            <div className="sumario">
              <div className="sumario__grupo">
                <h3 className="titulo-3">Seus números</h3>
                <ul className="sumario__lista">
                  {NUMEROS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="sumario__grupo">
                <h3 className="titulo-3">A leitura do seu caso</h3>
                <ul className="sumario__lista">
                  {LEITURA.map((item) => (
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
                  <li>Não sabe ao certo quanto deve, nem quanto paga de juros.</li>
                  <li>Não sabe por onde começar.</li>
                  <li>Evita abrir as faturas porque o número assusta.</li>
                </ul>
              </div>
              <div className="pilha">
                <h3 className="titulo-3">Não é para você se</h3>
                <ul className="lista-marcada lista-marcada--nao">
                  <li>Procura dicas de investimento. O assunto aqui é dívida.</li>
                  <li>As dívidas são de uma empresa. O quiz é para pessoa física.</li>
                  <li>Quer alguém que negocie no seu lugar. O {MARCA.nome} mostra o caminho, e quem negocia é você.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="secao" id="duvidas">
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

        <section className="secao secao--pautada">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">Dois minutos para saber onde você está</h2>
              <p className="destaque apoio">
                Dívida que a gente não olha parece maior do que é. Ou menor. O quiz mostra o tamanho
                certo.
              </p>
            </div>
            <Link href="/diagnostico" className="botao">
              Fazer o quiz gratuito
            </Link>
          </div>
        </section>
      </main>

      <Rodape />
    </>
  );
}
