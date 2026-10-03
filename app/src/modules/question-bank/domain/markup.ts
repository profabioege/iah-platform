/**
 * Marcação mínima das questões (`content_format = 'marcacao_v1'`).
 *
 * Permitido: <sub>, <sup>, <em>, <strong>, <small> e o marcador
 * {{figura:N}} (figura N da própria versão, em `question_assets`). O
 * texto chega com &, < e > escapados como entidades HTML. Qualquer outra
 * coisa — tag desconhecida, atributo, fechamento sem abertura — vira
 * texto literal: a tela NUNCA injeta HTML, só monta elementos a partir
 * desta árvore (lista de permissão, não de bloqueio).
 */

export const MARKUP_TAGS = ["sub", "sup", "em", "strong", "small"] as const;
export type MarkupTag = (typeof MARKUP_TAGS)[number];

export type MarkupNode =
  | { type: "text"; text: string }
  | { type: "tag"; tag: MarkupTag; children: MarkupNode[] }
  | { type: "figura"; n: number };

const TOKEN = /<(\/?)(sub|sup|em|strong|small)>|\{\{figura:(\d{1,2})\}\}/g;

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED[body.toLowerCase()] ?? whole;
  });
}

export function parseMarkup(source: string): MarkupNode[] {
  const root: MarkupNode[] = [];
  const stack: Array<{ tag: MarkupTag; children: MarkupNode[] }> = [];
  const current = () => (stack.length ? stack[stack.length - 1].children : root);
  const pushText = (raw: string) => {
    if (!raw) return;
    const text = decodeEntities(raw);
    const list = current();
    const last = list[list.length - 1];
    if (last?.type === "text") last.text += text;
    else list.push({ type: "text", text });
  };

  let cursor = 0;
  for (const match of source.matchAll(TOKEN)) {
    pushText(source.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    const [whole, closing, tag, figura] = match;
    if (figura) {
      current().push({ type: "figura", n: Number(figura) });
    } else if (!closing) {
      stack.push({ tag: tag as MarkupTag, children: [] });
    } else if (stack.length && stack[stack.length - 1].tag === tag) {
      const done = stack.pop()!;
      current().push({ type: "tag", tag: done.tag, children: done.children });
    } else {
      pushText(whole.replace("<", "&lt;").replace(">", "&gt;")); // fechamento órfão vira texto
    }
  }
  pushText(source.slice(cursor));
  // Tag aberta sem fechamento: fecha no fim (conteúdo preservado).
  while (stack.length) {
    const done = stack.pop()!;
    current().push({ type: "tag", tag: done.tag, children: done.children });
  }
  return root;
}

/** Números de figura citados no texto (para conferir contra as figuras gravadas). */
export function figureRefs(source: string): number[] {
  return [...source.matchAll(/\{\{figura:(\d{1,2})\}\}/g)].map((m) => Number(m[1]));
}
