import Link from "next/link";
import { MARCA } from "@/lib/config";

export function Rodape() {
  return (
    <footer className="rodape nao-imprimir">
      <div className="pagina rodape__grade">
        <div className="pilha">
          <p className="titulo-3">{MARCA.nome}</p>
          <nav className="rodape__links pequeno" aria-label="Rodapé">
            <Link href="/privacidade">Privacidade e termos</Link>
            <a href={`mailto:${MARCA.contatoEmail}`}>{MARCA.contatoEmail}</a>
          </nav>
        </div>
        <p className="pequeno">
          O {MARCA.nome} é um material educativo. Não é instituição financeira, não concede crédito, não
          negocia dívidas em seu nome e não substitui orientação jurídica ou financeira individual. As
          projeções são estimativas feitas a partir das informações que você fornece.
        </p>
      </div>
    </footer>
  );
}
