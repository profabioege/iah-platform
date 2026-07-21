"use client";

import * as React from "react";
import { AlertTriangle, FileText, Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PdfExtractionResult } from "@/lib/ai/pdf-text-extractor";

import { extractPdfAction } from "./actions";

export interface PdfAttachmentValue {
  fileName: string;
  extraction: PdfExtractionResult;
}

/**
 * Upload local de PDF — só `application/pdf`, 10 MB, ~40 páginas
 * (validado no servidor, nunca só pela extensão). Processado e
 * descartado: o arquivo nunca é gravado em disco; só os metadados
 * ficam (via `extraction`).
 */
export function PdfAttachment({
  value,
  onChange,
}: {
  value: PdfAttachmentValue | null;
  onChange: (value: PdfAttachmentValue | null) => void;
}) {
  const [status, setStatus] = React.useState<"idle" | "processing" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("processing");
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    const result = await extractPdfAction(formData);

    if ("error" in result) {
      setStatus("error");
      setErrorMessage(result.error);
      onChange(null);
      return;
    }
    setStatus("idle");
    onChange({ fileName: file.name, extraction: result });
  }

  function remove() {
    onChange(null);
    setStatus("idle");
    setErrorMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="pdf-attachment-input" className="text-xs font-medium text-muted-foreground">
        Anexar PDF (opcional)
      </label>

      {!value && status !== "processing" ? (
        <div>
          <input
            ref={inputRef}
            id="pdf-attachment-input"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
          />
          <p className="mt-1 text-xs text-muted-foreground">PDF até 10 MB e cerca de 40 páginas.</p>
        </div>
      ) : null}

      {status === "processing" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Paperclip className="size-4 animate-pulse" aria-hidden />
          Processando o PDF…
        </p>
      ) : null}

      {status === "error" && errorMessage ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {errorMessage}
        </p>
      ) : null}

      {value ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{value.fileName}</span>
              <span className="text-xs text-muted-foreground">
                {value.extraction.pageCount} página(s) · {value.extraction.extractedCharacterCount.toLocaleString("pt-BR")} caracteres extraídos
                {value.extraction.truncated ? " · conteúdo reduzido ao limite de contexto" : ""}
              </span>
              {value.extraction.warning ? (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                  {value.extraction.warning}
                </span>
              ) : null}
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={remove} aria-label="Remover PDF anexado">
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
