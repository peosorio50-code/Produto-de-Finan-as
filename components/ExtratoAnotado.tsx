import type { CSSProperties } from "react";
import { diagnosticar } from "@/lib/diagnostico";
import { EXEMPLO } from "@/lib/exemplo";
import { brl } from "@/lib/formato";

/**
 * Peça central da página inicial: um extrato de dívidas fictício com as
 * anotações que o diagnóstico gratuito faz. Os números saem do mesmo motor
 * que calcula o diagnóstico de verdade.
 */
export function ExtratoAnotado() {
  const d = diagnosticar(EXEMPLO);
  const primeira = d.dividas[0];
  const porCusto = [...d.dividas].sort((a, b) => b.jurosEstimadosMes - a.jurosEstimadosMes);
  const ordem = (n: number) => ({ "--ordem": n }) as CSSProperties;

  return (
    <figure className="extrato" aria-label="Exemplo de diagnóstico feito pelo Fôlego">
      <div className="extrato__cabeca">
        <span className="extrato__titulo">Extrato de dívidas</span>
        <span className="pequeno apoio">Exemplo</span>
      </div>

      <ul>
        {porCusto.map((divida, i) => (
          <li key={divida.id} className="extrato__item">
            <div className="extrato__linha">
              <span>{divida.rotulo}</span>
              <span className="extrato__pontos" aria-hidden="true" />
              <span className="numero negativo">{brl(divida.saldo)}</span>
            </div>
            <span className="extrato__nota caneta" style={ordem(i)}>
              {divida.id === primeira.id
                ? "comece por esta"
                : `${brl(divida.jurosEstimadosMes)} de juros por mês`}
            </span>
          </li>
        ))}
      </ul>

      <div className="extrato__total">
        <span>Total</span>
        <span className="numero negativo">{brl(d.totalDividas)}</span>
      </div>

      <p className="extrato__conclusao caneta" style={ordem(porCusto.length)}>
        <span className="marca-texto" style={ordem(porCusto.length + 1)}>
          {brl(d.jurosEstimadosMes)} por mês
        </span>{" "}
        só de juros
      </p>

      <figcaption className="pequeno apoio" style={{ marginTop: "1.25rem" }}>
        Caso fictício, calculado pelo mesmo sistema que faz o seu diagnóstico. O seu resultado depende
        das suas respostas.
      </figcaption>
    </figure>
  );
}
