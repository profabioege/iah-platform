/**
 * Stub de `next/navigation`. Nenhum alvo deste lote navega — quem
 * importa é o próprio `next-auth`, ao ser carregado pelo middleware.
 * Se alguma chamada acontecer, ela falha alto em vez de passar batida.
 */

export function redirect(url) {
  const error = new Error(`redirect inesperado para ${url}`);
  error.digest = `NEXT_REDIRECT;${url}`;
  throw error;
}

export function permanentRedirect(url) {
  return redirect(url);
}

export function notFound() {
  throw new Error("notFound() inesperado");
}

export const RedirectType = { push: "push", replace: "replace" };
export const useRouter = () => {
  throw new Error("useRouter() não existe fora do navegador");
};
export const useSearchParams = useRouter;
export const usePathname = useRouter;
export const useParams = useRouter;
