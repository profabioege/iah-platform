import type { ReactNode } from "react";

import type { ContentFormat } from "@/modules/question-bank/domain/entities";
import { parseMarkup, type MarkupNode } from "@/modules/question-bank/domain/markup";

/**
 * Texto de questão (enunciado ou alternativa). Em `marcacao_v1`, monta
 * elementos a partir da árvore da lista de permissão (`domain/markup`) —
 * nunca injeta HTML. Figuras vêm da rota autenticada
 * `/api/questoes/figura/<versão>/<n>`, sob a mesma RLS da versão.
 */
export function QuestionContent({
  text,
  format,
  versionId,
  inline = false,
}: {
  text: string;
  format: ContentFormat;
  versionId: string;
  /** Alternativa: figura menor, sem margem de parágrafo. */
  inline?: boolean;
}) {
  if (format !== "marcacao_v1") return <span className="whitespace-pre-line">{text}</span>;
  return <span className="whitespace-pre-line">{render(parseMarkup(text), versionId, inline)}</span>;
}

function render(nodes: MarkupNode[], versionId: string, inline: boolean): ReactNode[] {
  return nodes.map((node, i) => {
    if (node.type === "text") return node.text;
    if (node.type === "figura") {
      return (
        <span key={i} className={inline ? "inline-block align-middle" : "my-3 block"}>
          {/* eslint-disable-next-line @next/next/no-img-element -- PNG privado servido pela rota autenticada */}
          <img
            src={`/api/questoes/figura/${encodeURIComponent(versionId)}/${node.n}`}
            alt={`Figura ${node.n} da questão`}
            loading="lazy"
            className={inline ? "max-h-40 w-auto" : "h-auto max-w-full"}
          />
        </span>
      );
    }
    const children = render(node.children, versionId, inline);
    switch (node.tag) {
      case "sub":
        return <sub key={i}>{children}</sub>;
      case "sup":
        return <sup key={i}>{children}</sup>;
      case "em":
        return <em key={i}>{children}</em>;
      case "strong":
        return <strong key={i}>{children}</strong>;
      case "small":
        return <small key={i} className="block text-xs text-muted-foreground">{children}</small>;
    }
  });
}
