import { NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * Endpoint do formulário "Solicitar Demonstração" (/demonstracao e /contato).
 * Recebe os dados do lead e envia por e-mail via Resend.
 *
 * Ambos os formulários da Landing (DemonstracaoForm, DemoForm) enviam o
 * mesmo formato de payload para esta rota — hoje eles usam mailto
 * (ver seus próprios comentários), mas a rota já está pronta para
 * receber o POST assim que RESEND_API_KEY for configurada.
 *
 * Variáveis de ambiente (ver .env.example):
 * - RESEND_API_KEY       (obrigatória) — chave da conta Resend.
 * - CONTACT_TO_EMAIL     (opcional)    — destino; padrão contato@iaheducacional.com.br.
 * - CONTACT_FROM_EMAIL   (opcional)    — remetente verificado no Resend.
 */

const TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? "contato@iaheducacional.com.br";
const FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL ?? "IAH Educacional <onboarding@resend.dev>";

interface ContactPayload {
  nome?: string;
  email?: string;
  escola?: string;
  cargo?: string;
  cidadeEstado?: string;
  numeroAlunos?: string;
  telefone?: string;
  mensagem?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  let data: ContactPayload;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Requisição inválida." },
      { status: 400 },
    );
  }

  const nome = data.nome?.trim() ?? "";
  const email = data.email?.trim() ?? "";
  const escola = data.escola?.trim() ?? "";
  const cargo = data.cargo?.trim() ?? "";
  const cidadeEstado = data.cidadeEstado?.trim() ?? "";
  const numeroAlunos = data.numeroAlunos?.trim() ?? "";
  const telefone = data.telefone?.trim() ?? "";
  const mensagem = data.mensagem?.trim() ?? "";

  if (!nome || !email) {
    return NextResponse.json(
      { ok: false, error: "Nome e e-mail são obrigatórios." },
      { status: 400 },
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Informe um e-mail válido." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "[contato] RESEND_API_KEY ausente — configure a variável de ambiente.",
    );
    return NextResponse.json(
      { ok: false, error: "Serviço de envio indisponível no momento." },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);

  const linhas = [
    ["Nome", nome],
    ["E-mail", email],
    ["Escola/Instituição", escola || "—"],
    ["Cargo", cargo || "—"],
    ["Cidade/Estado", cidadeEstado || "—"],
    ["Número de alunos", numeroAlunos || "—"],
    ["Telefone", telefone || "—"],
    ["Mensagem", mensagem || "—"],
  ];

  const html = `
    <h2>Nova solicitação de demonstração — IAH Educacional</h2>
    <table cellpadding="8" style="border-collapse:collapse">
      ${linhas
        .map(
          ([label, value]) =>
            `<tr><td style="font-weight:600">${label}</td><td>${escapeHtml(
              value,
            )}</td></tr>`,
        )
        .join("")}
    </table>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Demonstração IAH — ${nome}${escola ? ` (${escola})` : ""}`,
      html,
    });

    if (error) {
      console.error("[contato] Falha no envio via Resend:", error);
      return NextResponse.json(
        { ok: false, error: "Não foi possível enviar. Tente novamente." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contato] Erro inesperado:", err);
    return NextResponse.json(
      { ok: false, error: "Não foi possível enviar. Tente novamente." },
      { status: 500 },
    );
  }
}
