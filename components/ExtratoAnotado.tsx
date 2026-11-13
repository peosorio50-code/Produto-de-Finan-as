import type { CSSProperties } from "react";
import { diagnosticar } from "@/lib/diagnostico";
import { EXEMPLO } from "@/lib/exemplo";
import { brl, duracao } from "@/lib/formato";
import type { AcaoDivida } from "@/lib/tipos";

const NOTA: Record<AcaoDivida, string> = {
  regularizar_ja: "regularizar já",
  negociar_desconto: "pedir desconto à vista",
  negociar_parcelamento: "refazer as parcelas",
  trocar_por_barata: "trocar por juros menores",
  atacar: "antecipar com a sobra",
  manter_em_dia: "só manter em dia",
  combinar: "combinar um valor fixo",
};

/**
 * Peça central da página de vendas: um extrato de dívidas fictício com as
 * anotações que o plano faz. Os números saem do mesmo motor do produto.
 */
export function ExtratoAnotado() {
  const d = diagnosticar(EXEMPLO);
  const ordem = (n: number) => ({ "--ordem": n }) as CSSProperties;

  return (
    <figure className="extrato" aria-label="Exemplo de plano montado pelo Fôlego">
      <div className="extrato__cabeca">
        <span className="extrato__titulo">Extrato de dívidas</span>
        <span className="pequeno apoio">Exemplo</span>
      </div>

      <ol>
        {d.dividas.map((divida, i) => (
          <li key={divida.id} className="extrato__item">
            <div className="extrato__linha">
              <span>{divida.rotulo}</span>
              <span className="extrato__pontos" aria-hidden="true" />
              <span className="numero negativo">{brl(divida.saldo)}</span>
            </div>
            <span className="extrato__nota caneta" style={ordem(i)}>
              {divida.ordem}º: {NOTA[divida.acao]}
            </span>
          </li>
        ))}
      </ol>

      <div className="extrato__total">
        <span>Total</span>
        <span className="numero negativo">{brl(d.totalDividas)}</span>
      </div>

      {d.plano.meses !== null && (
        <p className="extrato__conclusao caneta" style={ordem(d.dividas.length)}>
          {brl(d.pagamentoPlano)} por mês nas dívidas:{" "}
          <span className="marca-texto" style={ordem(d.dividas.length + 1)}>
            quitadas em {duracao(d.plano.meses)}
          </span>
        </p>
      )}

      <figcaption className="pequeno apoio" style={{ marginTop: "1.25rem" }}>
        Caso fictício, calculado pelo mesmo sistema que monta o seu plano. O seu resultado depende
        das suas respostas.
      </figcaption>
    </figure>
  );
}
