import type { Metadata } from "next";
import { Suspense } from "react";
import { Marca } from "@/components/Marca";
import { Resultado } from "@/components/Resultado";
import { Rodape } from "@/components/Rodape";
import { PUBLICO } from "@/lib/api";

export const metadata: Metadata = {
  title: "Seu diagnóstico",
  robots: { index: false },
};

export default function PaginaResultado() {
  // A venda aberta ou fechada é fixada no build (NEXT_PUBLIC_VENDA_ABERTA).
  const vendaAberta = PUBLICO.vendaAberta;

  return (
    <>
      <header className="documento topo" style={{ paddingBottom: 0 }}>
        <Marca />
      </header>
      <main className="documento">
        <Suspense>
          <Resultado vendaAberta={vendaAberta} />
        </Suspense>
      </main>
      <Rodape />
    </>
  );
}
