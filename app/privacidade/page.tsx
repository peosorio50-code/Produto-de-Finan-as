import type { Metadata } from "next";
import { Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";
import { MARCA, PRECO_REAIS } from "@/lib/config";
import { brlCentavos } from "@/lib/formato";

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
          <p className="apoio">Em poucas palavras: pedimos o mínimo e não guardamos suas respostas.</p>
        </header>

        <section className="bloco">
          <h2 className="titulo-3">O que pedimos</h2>
          <p>
            Um nome para chamar você e valores aproximados de renda, gastos e dívidas. Não pedimos CPF,
            senha, número de cartão, conta bancária nem nome de banco. Se preferir, use um apelido no
            lugar do nome.
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">Onde suas respostas ficam</h2>
          <p>
            No seu aparelho, no armazenamento do navegador. O diagnóstico gratuito é calculado ali
            mesmo. Quando você libera o plano completo, as respostas são enviadas ao nosso sistema e a
            um serviço de inteligência artificial (Claude, da Anthropic) apenas para gerar o texto do
            plano. Não mantemos banco de dados com suas respostas nem com o plano gerado, e não
            vendemos nem compartilhamos essas informações para publicidade.
          </p>
          <p>
            Para apagar tudo, limpe os dados de navegação deste site nas configurações do seu
            navegador.
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">Pagamento</h2>
          <p>
            O pagamento de {brlCentavos(PRECO_REAIS)} é único e processado pelo Mercado Pago. Não temos
            acesso aos dados do seu cartão. O Mercado Pago trata seus dados de pagamento conforme a
            política de privacidade dele.
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">Garantia e devolução</h2>
          <p>
            Você tem {MARCA.garantiaDias} dias, a contar da compra, para pedir a devolução integral do
            valor, sem precisar explicar o motivo. Escreva para{" "}
            <a href={`mailto:${MARCA.contatoEmail}`}>{MARCA.contatoEmail}</a> pelo mesmo e-mail usado
            no pagamento.
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">O que o {MARCA.nome} é, e o que não é</h2>
          <p>
            É um material educativo: um diagnóstico e um plano de organização feitos a partir das
            informações que você fornece. Os prazos e valores são estimativas, calculadas com taxas de
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
            Pela Lei Geral de Proteção de Dados, você pode pedir informações sobre o tratamento dos
            seus dados ou a exclusão deles. Como não guardamos suas respostas, o que temos se resume
            aos registros de pagamento. Para qualquer pedido, escreva para{" "}
            <a href={`mailto:${MARCA.contatoEmail}`}>{MARCA.contatoEmail}</a>.
          </p>
        </section>
      </main>
      <Rodape />
    </>
  );
}
