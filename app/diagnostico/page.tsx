import type { Metadata } from "next";
import { Marca } from "@/components/Marca";
import { Questionario } from "@/components/Questionario";

export const metadata: Metadata = {
  title: "Diagnóstico",
  robots: { index: false },
};

export default function PaginaDiagnostico() {
  return (
    <>
      <header className="fluxo topo" style={{ paddingBottom: 0 }}>
        <Marca />
      </header>
      <main className="fluxo">
        <Questionario />
      </main>
    </>
  );
}
