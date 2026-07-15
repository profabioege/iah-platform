"use client";

import * as React from "react";
import { Mail } from "lucide-react";

/**
 * Formulário da página /contato.
 *
 * Fase atual (sem backend): o envio abre o cliente de e-mail do visitante
 * via mailto para contato@iaheducacional.com.br, com assunto padronizado e
 * o corpo montado a partir dos campos. Integração futura (Resend): trocar
 * o handleSubmit para POST em /api/contato — a rota e o componente
 * demo-form já existem prontos para isso.
 */
const DESTINATION = "contato@iaheducacional.com.br";
const SUBJECT = "Solicitação de Demonstração - IAH";

const CARGOS = [
  "Diretor(a)",
  "Coordenador(a) pedagógico(a)",
  "Mantenedor(a)",
  "Professor(a)",
  "Outro",
];

export function ContactForm() {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const linhas = [
      `Nome: ${data.get("nome") || "—"}`,
      `E-mail: ${data.get("email") || "—"}`,
      `Escola/Instituição: ${data.get("escola") || "—"}`,
      `Cargo: ${data.get("cargo") || "—"}`,
      "",
      "Mensagem:",
      String(data.get("mensagem") || "—"),
    ];

    const url = `mailto:${DESTINATION}?subject=${encodeURIComponent(
      SUBJECT,
    )}&body=${encodeURIComponent(linhas.join("\n"))}`;

    window.location.href = url;
  }

  return (
    <form className="demo-form" onSubmit={handleSubmit}>
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

      <div className="demo-actions">
        <button className="button button-primary" type="submit">
          <Mail aria-hidden="true" />
          Solicitar demonstração
        </button>
      </div>

      <p className="demo-note">
        O envio abre o seu aplicativo de e-mail com a mensagem pronta para
        {" "}
        {DESTINATION}. Se preferir, escreva diretamente para um dos e-mails
        institucionais abaixo.
      </p>
    </form>
  );
}
