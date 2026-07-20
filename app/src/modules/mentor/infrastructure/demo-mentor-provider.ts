import type {
  MentorProvider,
  MentorRequest,
  MentorResponse,
} from "../domain/mentor-provider";

const DEMO_DELAY_MS = 700;

function wait(delay: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, delay);

    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Operação cancelada", "AbortError"));
      },
      { once: true },
    );
  });
}

function includesAny(message: string, terms: string[]): boolean {
  return terms.some((term) => message.includes(term));
}

function buildDemoReply(request: MentorRequest): string {
  const message = request.message.toLocaleLowerCase("pt-BR");
  const { currentStep, guidingQuestion } = request.context;

  if (
    includesAny(message, [
      "resposta final",
      "faça por mim",
      "faca por mim",
      "escreva por mim",
      "redija",
      "entrega pronta",
    ])
  ) {
    return (
      "Eu não posso fornecer a resposta final nem redigir sua entrega. " +
      "Posso ajudar você a construí-la: qual ideia você já consegue defender com uma evidência do material?"
    );
  }

  if (includesAny(message, ["analogia", "exemplo parecido", "comparação"])) {
    return (
      "Pense nesta investigação como montar um quebra-cabeça: uma peça isolada pode parecer certa, " +
      "mas só ganha sentido quando se encaixa nas demais. Quais duas pistas do material você pode " +
      "comparar antes de formar sua hipótese?"
    );
  }

  if (includesAny(message, ["pista", "começar", "comecar", "travado", "travada"])) {
    return (
      `Uma pista para a etapa “${currentStep.label}”: destaque primeiro as palavras que indicam uma ` +
      "afirmação verificável. Depois, pergunte: qual evidência do material confirma ou enfraquece essa afirmação?"
    );
  }

  if (includesAny(message, ["material", "fonte", "dossiê", "dossie", "consultar"])) {
    return (
      "Volte ao material e procure três sinais: quem fez a afirmação, qual evidência foi apresentada e " +
      "se outra fonte permite conferir. O que você encontrou em cada um desses pontos?"
    );
  }

  if (includesAny(message, ["revisar", "organizar", "raciocínio", "raciocinio"])) {
    return (
      "Organize seu raciocínio em quatro passos: hipótese, evidência, ligação entre as duas e dúvida que " +
      "ainda permanece. Qual desses passos está menos claro para você agora?"
    );
  }

  if (includesAny(message, ["pergunta norteadora", "objetivo", "entender a pergunta"])) {
    return (
      `A pergunta norteadora é: “${guidingQuestion}”. Sem respondê-la ainda, quais termos parecem mais ` +
      "importantes e o que você precisaria investigar para explicá-los com segurança?"
    );
  }

  return (
    `Na etapa “${currentStep.label}”, o que você já sabe, o que ainda precisa verificar e qual trecho ` +
    "do material pode ajudar a diminuir essa dúvida?"
  );
}

/**
 * Provider local e determinístico: não faz rede, não persiste histórico e não
 * produz entregas. A falha única por mensagem permite exercitar erro e retry
 * digitando "simular falha" no ambiente de demonstração.
 */
class DemoMentorProvider implements MentorProvider {
  readonly id = "demo-mentor-iah";
  private readonly simulatedFailures = new Set<string>();

  async sendMessage(request: MentorRequest): Promise<MentorResponse> {
    await wait(DEMO_DELAY_MS, request.signal);

    const normalizedMessage = request.message.trim().toLocaleLowerCase("pt-BR");
    if (
      normalizedMessage.includes("simular falha") &&
      !this.simulatedFailures.has(normalizedMessage)
    ) {
      this.simulatedFailures.add(normalizedMessage);
      throw new Error("Falha simulada do DemoMentorProvider");
    }

    return { content: buildDemoReply(request) };
  }
}

export const demoMentorProvider: MentorProvider = new DemoMentorProvider();
