import type { Metadata } from "next";

import { EditorialQueuePage } from "@/components/question-bank/editorial/pages";

export const metadata: Metadata = { title: "Revisão editorial", description: "Fila de questões para conferir, aprovar ou devolver." };

export default function Page({ searchParams }: { searchParams: Promise<{ status?: string; aviso?: string; serie?: string; habilidade?: string }> }) {
  return <EditorialQueuePage base="/professor/revisao" role="professor" searchParams={searchParams} />;
}
