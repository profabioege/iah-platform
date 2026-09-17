/**
 * Aviso da candidata de apresentação para telas cujo estado vive só no
 * repositório demonstrativo em memória do servidor (ex.: sondagem): deixa
 * explícito que nada é gravado em banco e que reiniciar apaga o que foi feito.
 */
export function DemoStateNotice({ children }: { children?: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
      Ambiente de demonstração · dados fictícios.{" "}
      {children ??
        "Respostas e correções ficam apenas na memória deste servidor de demonstração — não são gravadas em banco e se apagam quando ele reinicia."}
    </p>
  );
}
