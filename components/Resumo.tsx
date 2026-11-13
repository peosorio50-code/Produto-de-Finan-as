import { ROTULOS_NIVEL } from "@/lib/diagnostico";
import { brl, duracao, pct } from "@/lib/formato";
import type { Diagnostico, Nivel } from "@/lib/tipos";

export const FRASE_NIVEL: Record<Nivel, string> = {
  1: "Suas dívidas ainda cabem na renda, mas os juros já estão correndo.",
  2: "As dívidas já pesam no seu mês. Dá para reverter com ordem e negociação.",
  3: "As dívidas estão crescendo mais rápido do que você consegue pagar.",
  4: "Hoje a conta não fecha. O primeiro passo é proteger o essencial e renegociar tudo.",
};

/** Escala de quatro níveis com o nível da pessoa em destaque. */
export function EscalaNivel({ nivel }: { nivel: Nivel }) {
  return (
    <div>
      <p className="so-leitor">
        Nível {nivel} de 4: {ROTULOS_NIVEL[nivel]}
      </p>
      <ol className="nivel" aria-hidden="true">
        {([1, 2, 3, 4] as Nivel[]).map((n) => (
          <li
            key={n}
            className="nivel__faixa"
            data-ativo={n === nivel}
            data-passou={n < nivel}
          >
            {ROTULOS_NIVEL[n]}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Os números principais do diagnóstico, em formato de extrato. */
export function LinhasDiagnostico({ d }: { d: Diagnostico }) {
  return (
    <dl className="linhas">
      <div className="linhas__item">
        <dt>
          Total das dívidas
          <span className="linhas__nota">
            {d.quantidadeDividas} {d.quantidadeDividas === 1 ? "dívida" : "dívidas"}
            {d.dividasEmAtraso > 0 && `, ${d.dividasEmAtraso} em atraso`}
          </span>
        </dt>
        <dd className="negativo">{brl(d.totalDividas)}</dd>
      </div>
      <div className="linhas__item">
        <dt>
          Juros por mês
          <span className="linhas__nota">Estimativa pelas taxas de cada tipo de dívida</span>
        </dt>
        <dd className="negativo">{brl(d.jurosEstimadosMes)}</dd>
      </div>
      <div className="linhas__item">
        <dt>Parcelas que você paga por mês</dt>
        <dd>{brl(d.parcelasMes)}</dd>
      </div>
      {d.comprometimento !== null && (
        <div className="linhas__item">
          <dt>
            Parte da renda que vai para parcelas
            <span className="linhas__nota">Acima de 30% já é sinal de aperto</span>
          </dt>
          <dd className={d.comprometimento > 0.3 ? "negativo" : undefined}>{pct(d.comprometimento)}</dd>
        </div>
      )}
      <div className="linhas__item">
        <dt>
          {d.sobraMes < 0 ? "Falta no fim do mês" : "Sobra no fim do mês"}
          <span className="linhas__nota">Renda menos gastos e parcelas</span>
        </dt>
        <dd className={d.sobraMes < 0 ? "negativo" : "positivo"}>{brl(Math.abs(d.sobraMes))}</dd>
      </div>
      <div className="linhas__item">
        <dt>
          No ritmo de hoje
          <span className="linhas__nota">Pagando só o que você paga agora</span>
        </dt>
        <dd className={d.ritmoAtual.meses === null ? "negativo" : undefined}>
          {d.ritmoAtual.meses === null ? "As dívidas não acabam" : `Quita em ${duracao(d.ritmoAtual.meses)}`}
        </dd>
      </div>
    </dl>
  );
}
