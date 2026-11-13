export type TipoDivida =
  | "cartao"
  | "cheque_especial"
  | "emprestimo_pessoal"
  | "consignado"
  | "financiamento_veiculo"
  | "financiamento_imovel"
  | "contas_consumo"
  | "crediario"
  | "familia"
  | "outro";

export type SituacaoDivida = "em_dia" | "atraso_ate_90" | "atraso_mais_90";

export interface Divida {
  id: string;
  tipo: TipoDivida;
  /** Nome que a pessoa dá à dívida, para diferenciar duas do mesmo tipo. */
  apelido: string;
  /** Quanto deve hoje, em reais. */
  saldo: number;
  /** Quanto paga por mês hoje, em reais (0 se não está pagando). */
  parcela: number;
  situacao: SituacaoDivida;
  /** Juros ao mês em %, se a pessoa souber. null = usar estimativa. */
  jurosMes: number | null;
}

export type TipoRenda = "fixa" | "variavel" | "sem_renda";
export type Negativado = "sim" | "nao" | "nao_sei";
export type Controle = "nenhum" | "as_vezes" | "sempre";
export type Reserva = "nenhuma" | "menos_1_mes" | "mais_1_mes";
export type RendaExtra = "sim" | "talvez" | "nao";

export type Causa =
  | "perda_renda"
  | "saude"
  | "cartao"
  | "familia"
  | "juros"
  | "negocio"
  | "apostas"
  | "impulso";

export type Objetivo = "limpar_nome" | "parar_juros" | "tranquilidade" | "credito" | "guardar";

export type CategoriaGasto = "moradia" | "contas" | "alimentacao" | "transporte" | "saude" | "outros";

export type Gastos = Record<CategoriaGasto, number>;

export interface Respostas {
  nome: string;
  rendaMensal: number;
  tipoRenda: TipoRenda;
  pessoasNaCasa: number;
  gastos: Gastos;
  dividas: Divida[];
  negativado: Negativado;
  causas: Causa[];
  controle: Controle;
  reserva: Reserva;
  rendaExtra: RendaExtra;
  objetivo: Objetivo;
}

/* ---------- Resultado do diagnóstico (calculado, sem IA) ---------- */

export type Nivel = 1 | 2 | 3 | 4;

export type AcaoDivida =
  | "regularizar_ja"
  | "negociar_desconto"
  | "negociar_parcelamento"
  | "trocar_por_barata"
  | "atacar"
  | "manter_em_dia"
  | "combinar";

export interface DividaAnalisada extends Divida {
  /** Posição na ordem de ataque (1 = primeira). */
  ordem: number;
  rotulo: string;
  /** Taxa mensal usada nos cálculos (fração: 0.08 = 8%). */
  taxa: number;
  taxaInformada: boolean;
  /** Juros estimados que essa dívida gera por mês hoje, em reais. */
  jurosEstimadosMes: number;
  acao: AcaoDivida;
  /** Mês em que é quitada no cenário do plano (null se não quita). */
  quitadaNoMes: number | null;
}

export interface Cenario {
  pagamentoMensal: number;
  /** Meses até quitar tudo. null = não quita no horizonte simulado. */
  meses: number | null;
  jurosTotais: number;
  totalPago: number;
}

export interface LinhaOrcamento {
  categoria: CategoriaGasto;
  rotulo: string;
  atual: number;
  /** Fração da renda (0.3 = 30%). null se renda zero. */
  parteDaRenda: number | null;
  referencia: number;
  acima: boolean;
  corteSugerido: number;
  meta: number;
}

export interface Diagnostico {
  nivel: Nivel;
  nivelRotulo: string;
  pontos: number;
  renda: number;
  totalDividas: number;
  quantidadeDividas: number;
  parcelasMes: number;
  gastosMes: number;
  /** Renda − gastos − parcelas atuais. Negativa = a conta não fecha. */
  sobraMes: number;
  /** Parcelas ÷ renda. null se renda zero. */
  comprometimento: number | null;
  /** Total das dívidas em meses de renda. null se renda zero. */
  dividaEmMesesDeRenda: number | null;
  jurosEstimadosMes: number;
  saldoEmAtraso: number;
  dividasEmAtraso: number;
  cortesSugeridos: number;
  /** Valor mensal que o plano destina às dívidas. */
  pagamentoPlano: number;
  /** Quanto falta por mês para cobrir as parcelas que vencem hoje. */
  faltaMes: number;
  ritmoAtual: Cenario;
  plano: Cenario;
  /** O plano quita tudo em até cinco anos só com os pagamentos mensais. */
  planoViavel: boolean;
  /** Quanto seria preciso pagar por mês para quitar em três anos. Só quando o plano não é viável. */
  pagamentoParaQuitarEm3Anos: number | null;
  economiaDeJuros: number | null;
  dividas: DividaAnalisada[];
  orcamento: LinhaOrcamento[];
  sinais: {
    contaNaoFecha: boolean;
    semRenda: boolean;
    rendaVariavel: boolean;
    negativado: boolean;
    temAtraso: boolean;
    temCreditoCaro: boolean;
    apostas: boolean;
    semReserva: boolean;
    semControle: boolean;
    /** Situação em que vale procurar a repactuação da Lei do Superendividamento. */
    avaliarSuperendividamento: boolean;
  };
}

/* ---------- Texto personalizado (IA ou versão padrão) ---------- */

export interface Narrativa {
  leitura: string[];
  pontosCriticos: { titulo: string; explicacao: string }[];
  primeiros7Dias: string[];
  plano30Dias: { semana: string; foco: string; acoes: string[] }[];
  estrategiaPorDivida: {
    dividaId: string;
    oQueFazer: string;
    comoNegociar: string;
    mensagemPronta: string;
  }[];
  ondeCortar: { categoria: string; sugestao: string }[];
  proximos90Dias: string[];
  recado: string;
}

export interface PlanoCompleto {
  ref: string;
  geradoEm: string;
  nome: string;
  diagnostico: Diagnostico;
  narrativa: Narrativa;
  /** "ia" = escrito pela IA; "padrao" = versão gerada por regras (IA indisponível). */
  origemNarrativa: "ia" | "padrao";
}
