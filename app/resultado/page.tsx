import type { Metadata } from "next";
import { Suspense } from "react";
import { Marca } from "@/components/Marca";
import { Resultado } from "@/components/Resultado";
import { Rodape } from "@/components/Rodape";

export const metadata: Metadata = {
  title: "Seu diagnóstico",
  robots: { index: false },
};

export default function PaginaResultado() {
  return (
    <>
      <header className="documento topo" style={{ paddingBottom: 0 }}>
        <Marca />
      </header>
      <main className="documento">
        <Suspense>
          <Resultado />
        </Suspense>
      </main>
      <Rodape />
    </>
  );
}
