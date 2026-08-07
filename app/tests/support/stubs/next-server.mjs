/**
 * Stub de `next/server`.
 *
 * O middleware só usa `NextResponse.redirect` e `NextResponse.next`, e o
 * que o teste precisa observar é exatamente isso: houve redirecionamento
 * e para onde. Devolvemos objetos simples e inspecionáveis em vez de
 * `Response` reais para que a asserção fale de DESTINO, não de status
 * HTTP — o contrato sob teste é o gate por papel, não o transporte.
 */

export const NextResponse = {
  redirect(url) {
    return { iahKind: "redirect", location: String(url) };
  },
  next() {
    return { iahKind: "next", location: null };
  },
  json(body, init) {
    return { iahKind: "json", body, init: init ?? null };
  },
};

/** Presente só para satisfazer imports; os testes montam requisições simples. */
export class NextRequest {}
export class NextURL extends URL {}
export const userAgent = () => ({});
export const userAgentFromString = () => ({});
export const ImageResponse = class {};
