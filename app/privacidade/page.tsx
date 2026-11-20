import type { Metadata } from "next";
import { Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";
import { MARCA } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacidade e termos",
};

export default function PaginaPrivacidade() {
  return (
    <>
      <header className="documento topo" style={{ paddingBottom: 0 }}>
        <Marca />
      </header>
      <main className="documento">
        <header className="documento__capa">
          <h1 className="titulo-2">Privacidade e termos de uso</h1>
          <p className="apoio">
            Em poucas palavras: pedimos o mínimo, usamos seu contato só para falar com você e não
            vendemos seus dados.
          </p>
        </header>

        <section className="bloco">
          <h2 className="titulo-3">O que pedimos</h2>
          <p>
            No início do quiz, nome, e-mail e WhatsApp. Depois, valores aproximados de renda, gastos e
            dívidas e algumas respostas de múltipla escolha. Não pedimos CPF, senha, número de cartão,
            conta bancária nem nome de banco.
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">Para que usamos seu contato</h2>
          <p>
            Para falar com você sobre o seu resultado e sobre o plano completo, por e-mail e WhatsApp.
            Para não receber mais mensagens, responda a qualquer uma delas pedindo para sair
            {MARCA.contatoEmail && (
              <>
                {" "}
                ou escreva para <a href={`mailto:${MARCA.contatoEmail}`}>{MARCA.contatoEmail}</a>
              </>
            )}
            . Não vendemos nem cedemos seu contato a outras empresas.
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">Onde suas respostas ficam</h2>
          <p>
            O resultado é calculado no seu aparelho, e as respostas ficam guardadas no armazenamento
            do navegador. Quando você começa o quiz, seu nome, e-mail e WhatsApp são gravados no nosso
            servidor. Quando termina, gravamos junto um resumo do resultado: a situação, o nível, a
            renda, o total e os tipos de dívida e as respostas de múltipla escolha, para que a
            conversa seja sobre o seu caso.
          </p>
          <p>
            Quando você clica para comprar o plano completo, gravamos no servidor as respostas do quiz,
            para montar o plano depois do pagamento e para que você possa abri-lo em qualquer
            aparelho pelo link que recebe. O plano gerado fica guardado junto. As respostas também são
            enviadas a um serviço de inteligência artificial (Claude, da Anthropic) apenas para
            escrever o texto do plano. Seu e-mail e seu telefone não vão para a inteligência
            artificial.
          </p>
          <p>
            Para apagar o que fica no seu aparelho, limpe os dados de navegação deste site nas
            configurações do seu navegador. Para apagar o que fica no nosso servidor, peça pelo canal
            indicado em &ldquo;Seus direitos sobre os dados&rdquo;.
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">Pagamento</h2>
          <p>
            O diagnóstico é gratuito. O plano completo é opcional e pago uma única vez, sem
            assinatura. O pagamento é processado pela Kiwify, que trata seus dados conforme a
            política de privacidade dela e nos avisa quando o pagamento é aprovado, recusado ou
            devolvido, com seu nome, e-mail e telefone. Não temos acesso aos dados do seu cartão.
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">Garantia e devolução</h2>
          <p>
            Quem compra o plano completo tem {MARCA.garantiaDias} dias, a contar da compra, para pedir
            a devolução integral do valor, sem precisar explicar o motivo.
            {MARCA.contatoEmail && (
              <>
                {" "}
                Escreva para <a href={`mailto:${MARCA.contatoEmail}`}>{MARCA.contatoEmail}</a> pelo mesmo
                e-mail usado no pagamento.
              </>
            )}
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">O que o {MARCA.nome} é, e o que não é</h2>
          <p>
            É um material educativo: um diagnóstico gratuito e, para quem quiser, um plano de
            organização, feitos a partir das informações que você fornece. Os prazos e valores são estimativas, calculadas com taxas de
            juros típicas quando você não informa as suas, e não garantem resultado.
          </p>
          <p>
            Não é instituição financeira, não concede crédito, não negocia dívidas em seu nome e não
            presta consultoria jurídica, contábil ou de investimentos. Parte do texto é escrita por
            inteligência artificial e pode conter imprecisões: confira as condições de qualquer acordo
            diretamente com o credor antes de fechar.
          </p>
        </section>

        <section className="bloco bloco--final">
          <h2 className="titulo-3">Seus direitos sobre os dados</h2>
          <p>
            Pela Lei Geral de Proteção de Dados, você pode pedir acesso, correção ou exclusão dos seus
            dados. O que temos é o seu contato, o resumo do resultado do quiz e os registros de
            pagamento.
            {MARCA.contatoEmail && (
              <>
                {" "}
                Para qualquer pedido, escreva para{" "}
                <a href={`mailto:${MARCA.contatoEmail}`}>{MARCA.contatoEmail}</a>.
              </>
            )}
          </p>
        </section>
      </main>
      <Rodape />
    </>
  );
}
