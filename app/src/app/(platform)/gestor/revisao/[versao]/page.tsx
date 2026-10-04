import type { Metadata } from "next";

import { EditorialItemPage } from "@/components/question-bank/editorial/pages";

export const metadata: Metadata = { title: "Revisar questão" };

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ versao: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  return <EditorialItemPage base="/gestor/revisao" role="administrador" params={params} searchParams={searchParams} />;
}
