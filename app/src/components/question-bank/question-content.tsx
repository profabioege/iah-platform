import type { ReactNode } from "react";

import type { ContentFormat } from "@/modules/question-bank/domain/entities";
import { parseBlocks, type MarkupNode } from "@/modules/question-bank/domain/markup";

/**
 * Texto de questão (enunciado ou alternativa). Em `marcacao_v1`/`v2`,
 * monta elementos a partir da árvore da lista de permissão
 * (`domain/markup`) — nunca injeta HTML. Tabelas (v2) viram `<table>`.
 * Figuras vêm da rota autenticada `/api/questoes/figura/<versão>/<n>`,
 * sob a mesma RLS da versão.
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
  if (format === "texto") return <span className="whitespace-pre-line">{text}</span>;
  const blocks = parseBlocks(text, format);
  return (
    <>
      {blocks.map((block, b) =>
        block.type === "inline" ? (
          <span key={b} className={blocks.length > 1 ? "block whitespace-pre-line" : "whitespace-pre-line"}>
            {render(block.nodes, versionId, inline)}
          </span>
        ) : (
          <span key={b} className="my-3 block overflow-x-auto">
            <table className="min-w-[16rem] border-collapse text-sm font-normal">
              {block.header ? (
                <thead>
                  <tr>
                    {block.header.map((cell, c) => (
                      <th key={c} scope="col" className="border border-border bg-muted/60 px-3 py-1.5 text-left font-semibold">
                        {render(cell, versionId, true)}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} className="border border-border px-3 py-1.5 align-top">
                        {render(cell, versionId, true)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </span>
        ),
      )}
    </>
  );
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
