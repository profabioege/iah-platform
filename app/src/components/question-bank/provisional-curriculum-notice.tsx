/**
 * Aviso obrigatório enquanto o planejamento da escola for o recorte
 * provisório (status `provisional` — D-049). Não some sozinho: só deixa
 * de aparecer quando a escola valida o próprio currículo.
 */
export function ProvisionalCurriculumNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
    >
      <strong className="font-semibold">Recorte curricular provisório.</strong>{" "}
      Habilidades e distribuição por série/período são demonstrativas e serão substituídas
      pelo currículo da escola. Itens sintéticos de demonstração.
    </div>
  );
}
