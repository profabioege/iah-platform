"use client";

import * as React from "react";
import { ArrowRight, Check, MessageCircle } from "lucide-react";

/** Cargos alinhados ao público-alvo da Landing. */
const CARGOS = [
  "Diretor(a)",
  "Coordenador(a) pedagógico(a)",
  "Mantenedor(a)",
  "Professor(a)",
  "Outro",
];

type Status = "idle" | "sending" | "success" | "error";

export function DemoForm({ whatsappNumber }: { whatsappNumber?: string }) {
  const [status, setStatus] = React.useState<Status>("idle");
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Não foi possível enviar.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Não foi possível enviar.",
      );
    }
  }

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        "Olá! Gostaria de conhecer a plataforma IAH Educacional.",
      )}`
    : null;

  if (status === "success") {
    return (
      <div className="demo-success" role="status">
        <span className="demo-success-icon" aria-hidden="true">
          <Check />
        </span>
        <h3>Recebemos sua solicitação.</h3>
        <p>
          Nossa equipe entrará em contato em breve pelo e-mail informado.
          Obrigado pelo interesse no IAH Educacional.
        </p>
        {whatsappHref ? (
          <a
            className="button button-whatsapp"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle aria-hidden="true" />
            Falar agora no WhatsApp
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form className="demo-form" onSubmit={handleSubmit} noValidate>
      <div className="demo-grid">
        <label className="demo-field">
          <span>Nome *</span>
          <input name="nome" type="text" required autoComplete="name" />
        </label>
        <label className="demo-field">
          <span>E-mail *</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="demo-field">
          <span>Escola / Instituição</span>
          <input name="escola" type="text" autoComplete="organization" />
        </label>
        <label className="demo-field">
          <span>Cargo</span>
          <select name="cargo" defaultValue="">
            <option value="" disabled>
              Selecione…
            </option>
            {CARGOS.map((cargo) => (
              <option key={cargo} value={cargo}>
                {cargo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="demo-field">
        <span>Mensagem (opcional)</span>
        <textarea name="mensagem" rows={3} />
      </label>

      {status === "error" ? (
        <p className="demo-error" role="alert">
          {errorMsg}
        </p>
      ) : null}

      <div className="demo-actions">
        <button
          className="button button-primary"
          type="submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Enviando…" : "Solicitar demonstração"}
          {status === "sending" ? null : <ArrowRight aria-hidden="true" />}
        </button>
        {whatsappHref ? (
          <a
            className="button button-whatsapp"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle aria-hidden="true" />
            WhatsApp
          </a>
        ) : null}
      </div>

      <p className="demo-note">
        Sem compromisso. Seus dados são tratados conforme a LGPD e usados
        apenas para retornar o contato sobre o IAH.
      </p>
    </form>
  );
}
