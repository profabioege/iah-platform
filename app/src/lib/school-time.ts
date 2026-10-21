/**
 * Horário exibido no fuso da escola, nunca no fuso de quem renderiza.
 *
 * Sem `timeZone`, o servidor (UTC na Vercel) e o navegador (Brasília)
 * produziam strings diferentes para o mesmo instante, e a tela trocava de
 * horário depois da hidratação. Com o fuso fixo, a primeira renderização
 * já mostra o horário de Brasília. Só formata: o timestamp armazenado
 * (ISO, UTC) não muda.
 */
export const SCHOOL_TIME_ZONE = "America/Sao_Paulo";

/** "dd/mm, hh:mm" no fuso da escola. */
export function formatSchoolDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: SCHOOL_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
