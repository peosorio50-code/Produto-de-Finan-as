"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlanoDocumento } from "@/components/PlanoDocumento";
import { gravarPlano, lerPedido, lerPlano, type Pedido } from "@/lib/armazenamento";
import { MARCA } from "@/lib/config";
import type { PlanoCompleto } from "@/lib/tipos";

type Estado =
  | { fase: "carregando" }
  | { fase: "sem_pedido" }
  | { fase: "gerando" }
  | { fase: "aguardando_pagamento" }
  | { fase: "erro" }
  | { fase: "pronto"; plano: PlanoCompleto };

const ETAPAS = [
  "Conferindo o pagamento",
  "Colocando suas dívidas em ordem",
  "Calculando os prazos",
  "Escrevendo seu plano",
  "Revisando os detalhes",
];

/** Quantas vezes conferir sozinho se o pagamento caiu, a cada 5 segundos. */
const TENTATIVAS_AUTOMATICAS = 24;

function Espera() {
  const [etapa, setEtapa] = useState(0);
  useEffect(() => {
    const relogio = setInterval(() => setEtapa((e) => Math.min(e + 1, ETAPAS.length - 1)), 9000);
    return () => clearInterval(relogio);
  }, []);
  return (
    <div className="espera" role="status" aria-live="polite">
      <h1 className="titulo-2">Montando seu plano</h1>
      <div className="espera__traco" aria-hidden="true" />
      <p className="destaque">{ETAPAS[etapa]}</p>
      <p className="apoio">Leva cerca de um minuto. Não feche esta página.</p>
    </div>
  );
}

export function TelaPlano() {
  const parametros = useSearchParams();
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const pedido = useRef<Pedido | null>(null);
  const iniciou = useRef(false);
  const tentativas = useRef(0);

  const refDaUrl = parametros.get("ref");
  const idPagamento = parametros.get("payment_id") ?? parametros.get("collection_id") ?? undefined;

  const buscar = useCallback(async () => {
    const atual = pedido.current;
    if (!atual) return;
    setEstado((e) => (e.fase === "aguardando_pagamento" ? e : { fase: "gerando" }));
    try {
      const resposta = await fetch("/api/plano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: atual.ref, respostas: atual.respostas, idPagamento }),
      });
      if (resposta.status === 402) {
        setEstado({ fase: "aguardando_pagamento" });
        return;
      }
      if (!resposta.ok) throw new Error(String(resposta.status));
      const { plano } = (await resposta.json()) as { plano: PlanoCompleto };
      gravarPlano(plano);
      setEstado({ fase: "pronto", plano });
    } catch {
      setEstado({ fase: "erro" });
    }
  }, [idPagamento]);

  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;

    const salvo = lerPedido();
    if (!salvo || (refDaUrl && refDaUrl !== salvo.ref)) {
      setEstado({ fase: "sem_pedido" });
      return;
    }
    pedido.current = salvo;
    const guardado = lerPlano(salvo.ref);
    if (guardado) {
      setEstado({ fase: "pronto", plano: guardado });
      return;
    }
    void buscar();
  }, [buscar, refDaUrl]);

  // Pix pode levar alguns segundos para ser confirmado: confere de novo sozinho.
  useEffect(() => {
    if (estado.fase !== "aguardando_pagamento") return;
    if (tentativas.current >= TENTATIVAS_AUTOMATICAS) return;
    const espera = setTimeout(() => {
      tentativas.current += 1;
      void buscar();
    }, 5000);
    return () => clearTimeout(espera);
  }, [estado, buscar]);

  if (estado.fase === "carregando") return null;

  if (estado.fase === "gerando") return <Espera />;

  if (estado.fase === "sem_pedido") {
    return (
      <div className="espera">
        <h1 className="titulo-2">Não encontramos seu pedido neste aparelho</h1>
        <p className="apoio">
          O plano fica guardado no navegador em que você respondeu às perguntas. Abra esta página nele.
          {MARCA.contatoEmail && (
            <>
              {" "}
              Se você pagou e não consegue acessar, escreva para{" "}
              <a href={`mailto:${MARCA.contatoEmail}`}>{MARCA.contatoEmail}</a> e resolvemos.
            </>
          )}
        </p>
        <Link href="/diagnostico" className="botao botao--contorno">
          Fazer um novo diagnóstico
        </Link>
      </div>
    );
  }

  if (estado.fase === "aguardando_pagamento") {
    return (
      <div className="espera" role="status">
        <h1 className="titulo-2">Aguardando a confirmação do pagamento</h1>
        <div className="espera__traco" aria-hidden="true" />
        <p className="apoio">
          Assim que o pagamento for confirmado, seu plano aparece aqui. Com Pix isso costuma levar
          alguns segundos. Estamos conferindo sozinhos, e você não precisa recarregar a página.
        </p>
        <div className="acoes-plano">
          {pedido.current && (
            <a href={pedido.current.urlPagamento} className="botao">
              Ir para o pagamento
            </a>
          )}
          <button
            type="button"
            className="botao botao--contorno"
            onClick={() => {
              tentativas.current = 0;
              void buscar();
            }}
          >
            Já paguei, conferir agora
          </button>
        </div>
      </div>
    );
  }

  if (estado.fase === "erro") {
    return (
      <div className="espera">
        <h1 className="titulo-2">Não deu para montar o plano agora</h1>
        <p className="apoio">
          Seu pagamento e suas respostas estão guardados. Tente de novo em instantes.
          {MARCA.contatoEmail && (
            <>
              {" "}
              Se continuar, escreva para <a href={`mailto:${MARCA.contatoEmail}`}>{MARCA.contatoEmail}</a>.
            </>
          )}
        </p>
        <button type="button" className="botao" onClick={() => void buscar()}>
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <>
      {estado.plano.origemNarrativa === "padrao" && (
        <div className="aviso nao-imprimir" style={{ marginTop: "1.5rem" }}>
          <p>
            A inteligência artificial não respondeu a tempo, então este plano foi escrito pelas nossas
            regras, com os seus números. Ele já está completo, e você pode pedir a versão escrita pela IA.
          </p>
          <button type="button" className="botao-texto" onClick={() => void buscar()}>
            Gerar a versão escrita pela IA
          </button>
        </div>
      )}
      <PlanoDocumento plano={estado.plano} />
    </>
  );
}
