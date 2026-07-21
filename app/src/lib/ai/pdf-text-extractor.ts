/**
 * Porto de extração de texto de PDF do IAH AI Gateway — server-only,
 * 100% em memória (nunca grava em disco; "processar e descartar",
 * decisão confirmada). Não é uma capacidade de IA (não precisa de
 * stub demonstrativo): usa `pdf-parse` de verdade nos dois modos.
 */

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PDF_PAGES = 40;
/** Orçamento de contexto do PDF no prompt — cerca de 30.000 caracteres. */
const MAX_EXTRACTED_CHARACTERS = 30_000;

export interface PdfExtractionResult {
  text: string;
  originalFilename: string;
  pageCount: number;
  /** Caracteres efetivamente extraídos, já truncados ao orçamento de contexto. */
  extractedCharacterCount: number;
  truncated: boolean;
  /** Presente quando o PDF parece ser digitalizado (sem texto extraível) — sem OCR nesta etapa. */
  warning: string | null;
}

export class PdfValidationError extends Error {}

export interface PdfTextExtractor {
  extract(file: { name: string; type: string; buffer: ArrayBuffer }): Promise<PdfExtractionResult>;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Confere a assinatura real do arquivo (`%PDF-`) — nunca confia só na extensão/mimetype declarado pelo navegador. */
function looksLikePdf(buffer: ArrayBuffer): boolean {
  const header = new Uint8Array(buffer.slice(0, 5));
  const signature = String.fromCharCode(...header);
  return signature === "%PDF-";
}

export const pdfParseTextExtractor: PdfTextExtractor = {
  async extract({ name, buffer }) {
    if (buffer.byteLength > MAX_PDF_SIZE_BYTES) {
      throw new PdfValidationError(
        `O PDF tem ${(buffer.byteLength / (1024 * 1024)).toFixed(1)} MB — o limite é 10 MB.`,
      );
    }
    if (!looksLikePdf(buffer)) {
      throw new PdfValidationError(
        "O arquivo não é um PDF válido (assinatura do arquivo não confere).",
      );
    }

    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      if (parser.progress?.total && parser.progress.total > MAX_PDF_PAGES) {
        throw new PdfValidationError(
          `O PDF tem mais de ${MAX_PDF_PAGES} páginas — reduza o arquivo e tente novamente.`,
        );
      }

      const result = await parser.getText();
      if (result.total > MAX_PDF_PAGES) {
        throw new PdfValidationError(
          `O PDF tem ${result.total} páginas — o limite é ${MAX_PDF_PAGES}.`,
        );
      }

      const pagesWithText = result.pages.filter((page) => page.text.trim().length > 0);
      const normalized = normalizeWhitespace(
        pagesWithText.map((page) => page.text).join("\n\n"),
      );

      const warning =
        pagesWithText.length === 0
          ? "Não foi possível extrair texto deste PDF — ele parece ser uma digitalização (imagem). Extração de imagem (OCR) ainda não é suportada."
          : null;

      const truncated = normalized.length > MAX_EXTRACTED_CHARACTERS;
      const text = truncated ? normalized.slice(0, MAX_EXTRACTED_CHARACTERS) : normalized;

      return {
        text,
        originalFilename: name,
        pageCount: result.total,
        extractedCharacterCount: text.length,
        truncated,
        warning,
      };
    } finally {
      await parser.destroy();
    }
  },
};
