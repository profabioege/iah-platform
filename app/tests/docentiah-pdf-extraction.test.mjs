import assert from "node:assert/strict";
import test from "node:test";

import { pdfParseTextExtractor, PdfValidationError } from "../src/lib/ai/pdf-text-extractor.ts";

test("rejeita arquivo maior que 10 MB antes de tentar interpretar o conteúdo", async () => {
  const oversized = new ArrayBuffer(11 * 1024 * 1024);
  await assert.rejects(
    () => pdfParseTextExtractor.extract({ name: "grande.pdf", type: "application/pdf", buffer: oversized }),
    PdfValidationError,
  );
});

test("rejeita arquivo sem a assinatura real de PDF, mesmo com nome/mimetype de PDF", async () => {
  const fakePdf = new TextEncoder().encode("isto não é um PDF de verdade").buffer;
  await assert.rejects(
    () => pdfParseTextExtractor.extract({ name: "falso.pdf", type: "application/pdf", buffer: fakePdf }),
    (error) => {
      assert.ok(error instanceof PdfValidationError);
      assert.match(error.message, /não é um PDF válido/i);
      return true;
    },
  );
});

test("a validação de assinatura roda antes da extração de verdade (não confia só no mimetype declarado)", async () => {
  // Mesmo declarando application/pdf, o conteúdo é o que decide — sem OCR, sem exceção pro mimetype.
  const fakePdf = new TextEncoder().encode("<html>não é pdf</html>").buffer;
  await assert.rejects(() =>
    pdfParseTextExtractor.extract({ name: "pagina.pdf", type: "application/pdf", buffer: fakePdf }),
  );
});
