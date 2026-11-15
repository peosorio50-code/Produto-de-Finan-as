import type { Metadata } from "next";
import { Marca } from "@/components/Marca";
import { Quiz } from "@/components/Quiz";

export const metadata: Metadata = {
  title: "Quiz das dívidas",
  robots: { index: false },
};

export default function PaginaDiagnostico() {
  return (
    <>
      <header className="fluxo topo" style={{ paddingBottom: 0 }}>
        <Marca />
      </header>
      <main className="fluxo">
        <Quiz />
      </main>
    </>
  );
}
