/**
 * O que fica guardado no navegador do cliente. Não há banco de dados: as
 * respostas, o pedido e o plano gerado ficam só no aparelho dele. O contato e
 * o resumo do resultado também vão para o webhook de leads (lib/leads.ts).
 */
import type { Contato, Origem, PlanoCompleto, Respostas } from "./tipos";

const CHAVE_RASCUNHO = "folego:quiz";
const CHAVE_CONTATO = "folego:contato";
const CHAVE_ORIGEM = "folego:origem";
const CHAVE_RESPOSTAS = "folego:respostas";
const CHAVE_PEDIDO = "folego:pedido";
const CHAVE_PLANO = "folego:plano:";

export interface Pedido {
  ref: string;
  /** Respostas exatamente como o servidor as registrou no checkout. */
  respostas: Respostas;
  urlPagamento: string;
  criadoEm: string;
}

function ler<T>(chave: string): T | null {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Navegação privada ou armazenamento cheio: o fluxo segue sem guardar.
  }
}

export const lerContato = () => ler<Contato>(CHAVE_CONTATO);
export const gravarContato = (c: Contato) => gravar(CHAVE_CONTATO, c);

/** Parâmetros de campanha da primeira visita que trouxe algum. */
export const lerOrigem = () => ler<Origem>(CHAVE_ORIGEM) ?? {};
export const gravarOrigem = (o: Origem) => gravar(CHAVE_ORIGEM, o);

/** Quiz em andamento (formato interno do formulário). */
export const lerRascunho = <T>() => ler<T>(CHAVE_RASCUNHO);
export const gravarRascunho = (rascunho: unknown) => gravar(CHAVE_RASCUNHO, rascunho);

/** Respostas finalizadas, prontas para o diagnóstico. */
export const lerRespostas = () => ler<Respostas>(CHAVE_RESPOSTAS);
export const gravarRespostas = (r: Respostas) => gravar(CHAVE_RESPOSTAS, r);

export const lerPedido = () => ler<Pedido>(CHAVE_PEDIDO);
export const gravarPedido = (p: Pedido) => gravar(CHAVE_PEDIDO, p);

export const lerPlano = (ref: string) => ler<PlanoCompleto>(CHAVE_PLANO + ref);
export const gravarPlano = (p: PlanoCompleto) => gravar(CHAVE_PLANO + p.ref, p);
