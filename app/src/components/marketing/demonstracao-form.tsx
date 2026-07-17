"use client";

import * as React from "react";
import { ArrowRight, Check } from "lucide-react";

/**
 * Formulário da página /demonstracao — funil comercial principal do IAH.
 *
 * Fase atual (sem backend): o envio monta o corpo do e-mail a partir dos
 * campos e abre o cliente de e-mail do visitante via mailto para
 * contato@iaheducacional.com.br. A tela de confirmação é exibida de forma
 * otimista logo após o mailto ser disparado (não há uma resposta de rede
 * para aguardar).
 *
 * Integração futura (Resend): trocar `sendViaMailto` por um POST em
 * `/api/contato` com o mesmo objeto de dados — a rota já aceita todos os
 * campos deste formulário (ver app/src/app/api/contato/route.ts) e o
 * componente `DemoForm` já implementa esse fluxo assíncrono como
 * referência. Nenhum campo nem nome precisa mudar nessa troca.
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

function sendViaMailto(data: FormData) {
  const linhas = [
    `Nome: ${data.get("nome") || "—"}`,
    `Escola: ${data.get("escola") || "—"}`,
    `Cargo: ${data.get("cargo") || "—"}`,
    `Cidade/Estado: ${data.get("cidadeEstado") || "—"}`,
    `Número de alunos: ${data.get("numeroAlunos") || "—"}`,
    `E-mail institucional: ${data.get("email") || "—"}`,
    `Telefone: ${data.get("telefone") || "—"}`,
    "",
    "Mensagem:",
    String(data.get("mensagem") || "—"),
  ];

  const url = `mailto:${DESTINATION}?subject=${encodeURIComponent(
    SUBJECT,
  )}&body=${encodeURIComponent(linhas.join("\n"))}`;

  window.location.href = url;
}

export function DemonstracaoForm() {
  const [enviado, setEnviado] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendViaMailto(new FormData(event.currentTarget));
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="demo-success" role="status">
        <span className="demo-success-icon" aria-hidden="true">
          <Check />
        </span>
        <h3>Recebemos sua solicitação.</h3>
        <p>Entraremos em contato em até 1 dia útil.</p>
      </div>
    );
  }

  return (
    <form className="demo-form" onSubmit={handleSubmit}>
      <div className="demo-grid">
        <label className="demo-field">
          <span>Nome *</span>
          <input name="nome" type="text" required autoComplete="name" />
        </label>
        <label className="demo-field">
          <span>Escola *</span>
          <input name="escola" type="text" required autoComplete="organization" />
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
        <label className="demo-field">
          <span>Cidade / Estado</span>
          <input name="cidadeEstado" type="text" autoComplete="address-level2" />
        </label>
        <label className="demo-field">
          <span>Número de alunos</span>
          <input name="numeroAlunos" type="text" inputMode="numeric" placeholder="ex.: 350" />
        </label>
        <label className="demo-field">
          <span>E-mail institucional *</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="demo-field">
          <span>Telefone</span>
          <input name="telefone" type="tel" autoComplete="tel" />
        </label>
      </div>

      <label className="demo-field">
        <span>Mensagem (opcional)</span>
        <textarea name="mensagem" rows={3} />
      </label>

      <div className="demo-actions">
        <button className="button button-primary" type="submit">
          Solicitar demonstração
          <ArrowRight aria-hidden="true" />
        </button>
      </div>

      <p className="demo-note">
        O envio abre o seu aplicativo de e-mail com a mensagem pronta para
        {" "}
        {DESTINATION}. Sem compromisso — seus dados são usados apenas para
        retornar o contato sobre o IAH.
      </p>
    </form>
  );
}
