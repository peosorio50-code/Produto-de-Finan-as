"use client";

import { useId } from "react";
import { milhar } from "@/lib/formato";

const MAXIMO = 9_999_999;

/** Campo de valor em reais inteiros, com teclado numérico no celular. */
export function CampoDinheiro({
  rotulo,
  ajuda,
  valor,
  aoMudar,
  erro,
}: {
  rotulo: string;
  ajuda?: string;
  valor: number;
  aoMudar: (valor: number) => void;
  erro?: string;
}) {
  const id = useId();
  return (
    <div className="campo">
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      {ajuda && (
        <span className="campo__ajuda" id={`${id}-ajuda`}>
          {ajuda}
        </span>
      )}
      <div className="entrada-dinheiro">
        <span className="entrada-dinheiro__moeda" aria-hidden="true">
          R$
        </span>
        <input
          id={id}
          className="entrada"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={valor > 0 ? milhar(valor) : ""}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, "").slice(0, 8);
            aoMudar(Math.min(digitos ? parseInt(digitos, 10) : 0, MAXIMO));
          }}
          aria-invalid={erro ? true : undefined}
          aria-describedby={[ajuda ? `${id}-ajuda` : "", erro ? `${id}-erro` : ""].join(" ").trim() || undefined}
        />
      </div>
      {erro && (
        <span className="campo__erro" id={`${id}-erro`} role="alert">
          {erro}
        </span>
      )}
    </div>
  );
}

/** Grupo de opções em que só uma pode ser marcada. */
export function Opcoes<T extends string>({
  legenda,
  ajuda,
  valor,
  opcoes,
  aoMudar,
  erro,
}: {
  legenda: string;
  ajuda?: string;
  valor: T | "";
  opcoes: Record<T, string>;
  aoMudar: (valor: T) => void;
  erro?: string;
}) {
  const nome = useId();
  return (
    <fieldset className="opcoes" aria-describedby={erro ? `${nome}-erro` : undefined}>
      <legend className="opcoes__legenda">
        {legenda}
        {ajuda && (
          <span className="campo__ajuda" style={{ display: "block", fontWeight: 400 }}>
            {ajuda}
          </span>
        )}
      </legend>
      {(Object.keys(opcoes) as T[]).map((chave) => (
        <label key={chave} className="opcao">
          <input type="radio" name={nome} checked={valor === chave} onChange={() => aoMudar(chave)} />
          <span>{opcoes[chave]}</span>
        </label>
      ))}
      {erro && (
        <span className="campo__erro" id={`${nome}-erro`} role="alert">
          {erro}
        </span>
      )}
    </fieldset>
  );
}

/** Grupo de opções em que várias podem ser marcadas. */
export function Multiplas<T extends string>({
  legenda,
  ajuda,
  valores,
  opcoes,
  aoMudar,
}: {
  legenda: string;
  ajuda?: string;
  valores: T[];
  opcoes: Record<T, string>;
  aoMudar: (valores: T[]) => void;
}) {
  return (
    <fieldset className="opcoes">
      <legend className="opcoes__legenda">
        {legenda}
        {ajuda && (
          <span className="campo__ajuda" style={{ display: "block", fontWeight: 400 }}>
            {ajuda}
          </span>
        )}
      </legend>
      {(Object.keys(opcoes) as T[]).map((chave) => {
        const marcado = valores.includes(chave);
        return (
          <label key={chave} className="opcao">
            <input
              type="checkbox"
              checked={marcado}
              onChange={() => aoMudar(marcado ? valores.filter((v) => v !== chave) : [...valores, chave])}
            />
            <span>{opcoes[chave]}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
