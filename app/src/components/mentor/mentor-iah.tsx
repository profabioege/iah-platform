"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowUp,
  Lightbulb,
  MessageCircleQuestion,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getMentorProvider,
  type MentorHistoryMessage,
  type MentorMissionContext,
} from "@/modules/mentor";

type ConversationStatus = "idle" | "loading" | "error";

interface ConversationMessage extends MentorHistoryMessage {
  id: string;
}

const INITIAL_MESSAGE: ConversationMessage = {
  id: "mentor-iah-welcome",
  role: "mentor",
  content:
    "Olá! Sou o Mentor IAH. Vou ajudar você a organizar o raciocínio com perguntas, pistas e analogias — sem fornecer respostas prontas nem redigir sua atividade. Em que parte desta Mission você quer pensar comigo?",
};

const QUICK_SUGGESTIONS = [
  "Ajude-me a entender a pergunta norteadora",
  "Dê uma pista para eu começar",
  "Use uma analogia",
  "Como posso revisar meu raciocínio?",
];

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);
    query.addEventListener("change", update);
    update();
    return () => query.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export function MentorIAH({ context }: { context: MentorMissionContext }) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ConversationMessage[]>([
    INITIAL_MESSAGE,
  ]);
  const [draft, setDraft] = React.useState("");
  const [status, setStatus] = React.useState<ConversationStatus>("idle");
  const [pendingMessage, setPendingMessage] = React.useState<string | null>(null);
  const isDesktop = useIsDesktop();
  const messageSequence = React.useRef(0);
  const messageEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(focusTimer);
  }, [open, isDesktop]);

  React.useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, status]);

  const nextId = (role: ConversationMessage["role"]) => {
    messageSequence.current += 1;
    return `${role}-${messageSequence.current}`;
  };

  const sendMessage = async (content: string, isRetry = false) => {
    const message = content.trim();
    if (!message || status === "loading") return;

    const conversation = isRetry
      ? messages
      : [
          ...messages,
          { id: nextId("student"), role: "student" as const, content: message },
        ];

    if (!isRetry) {
      setMessages(conversation);
      setDraft("");
    }
    setStatus("loading");
    setPendingMessage(message);

    try {
      const response = await getMentorProvider().sendMessage({
        message,
        history: conversation.map(({ role, content: historyContent }) => ({
          role,
          content: historyContent,
        })),
        context,
      });

      setMessages((current) => [
        ...current,
        { id: nextId("mentor"), role: "mentor", content: response.content },
      ]);
      setPendingMessage(null);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(draft);
  };

  const conversation = (
    <MentorConversation
      messages={messages}
      status={status}
      draft={draft}
      setDraft={setDraft}
      inputRef={inputRef}
      messageEndRef={messageEndRef}
      onSubmit={handleSubmit}
      onSuggestion={(suggestion) => void sendMessage(suggestion)}
      onRetry={() => pendingMessage && void sendMessage(pendingMessage, true)}
      onClose={() => setOpen(false)}
    />
  );

  return (
    <>
      {!open ? (
        <Button
          type="button"
          size="lg"
          onClick={() => setOpen(true)}
          aria-expanded="false"
          aria-controls="mentor-iah-panel"
          className="fixed right-4 bottom-4 z-30 h-12 gap-2 rounded-full px-4 shadow-lg md:right-6 md:bottom-6"
          data-testid="mentor-iah-launcher"
        >
          <MessageCircleQuestion className="size-5" />
          Mentor IAH
        </Button>
      ) : null}

      {open && isDesktop ? (
        <aside
          id="mentor-iah-panel"
          aria-label="Conversa com o Mentor IAH"
          className="fixed top-14 right-0 bottom-0 z-30 flex w-[25rem] border-l border-border bg-background shadow-2xl"
          data-testid="mentor-iah-desktop-panel"
        >
          {conversation}
        </aside>
      ) : null}

      {!isDesktop ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            id="mentor-iah-panel"
            side="right"
            showCloseButton={false}
            className="h-dvh gap-0 bg-background p-0 data-[side=right]:w-full! data-[side=right]:max-w-none! sm:data-[side=right]:w-[26rem]! sm:data-[side=right]:max-w-[26rem]!"
            data-testid="mentor-iah-mobile-panel"
          >
            <SheetTitle className="sr-only">Mentor IAH</SheetTitle>
            <SheetDescription className="sr-only">
              Apoio socrático durante a Mission.
            </SheetDescription>
            {conversation}
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}

function MentorConversation({
  messages,
  status,
  draft,
  setDraft,
  inputRef,
  messageEndRef,
  onSubmit,
  onSuggestion,
  onRetry,
  onClose,
}: {
  messages: ConversationMessage[];
  status: ConversationStatus;
  draft: string;
  setDraft: (value: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  messageEndRef: React.RefObject<HTMLDivElement | null>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSuggestion: (suggestion: string) => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const busy = status === "loading";

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Logo size="sm" mark className="h-6" title="Mentor IAH" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">Mentor IAH</h2>
            <span className="size-2 rounded-full bg-chart-2" aria-label="Disponível" />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            Ajuda a pensar, sem entregar respostas
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fechar Mentor IAH"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div
        role="log"
        aria-label="Histórico de mensagens do Mentor IAH"
        aria-live="polite"
        aria-relevant="additions"
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5"
      >
        {messages.map((message) => (
          <article
            key={message.id}
            className={
              message.role === "student"
                ? "ml-8 self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground"
                : "mr-5 self-start rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-card-foreground"
            }
          >
            <span className="sr-only">
              {message.role === "student" ? "Você: " : "Mentor IAH: "}
            </span>
            {message.content}
          </article>
        ))}

        {busy ? (
          <div
            className="mr-8 flex items-center gap-2 self-start rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-3 text-muted-foreground"
            aria-label="Mentor IAH está preparando uma pista"
            aria-busy="true"
          >
            <Sparkles className="size-4 animate-pulse text-primary" />
            <span className="text-xs">Pensando em uma boa pergunta…</span>
          </div>
        ) : null}

        {status === "error" ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-xs leading-relaxed">
                Não foi possível obter uma pista agora. Sua mensagem continua no histórico.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="size-3.5" />
              Tentar novamente
            </Button>
          </div>
        ) : null}

        <div ref={messageEndRef} aria-hidden="true" />
      </div>

      <div className="shrink-0 border-t border-border bg-background px-4 py-3">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Sugestões rápidas">
          {QUICK_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={busy}
              onClick={() => onSuggestion(suggestion)}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 text-left text-xs text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <Lightbulb className="size-3.5 text-primary" />
              {suggestion}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <label htmlFor="mentor-iah-input" className="sr-only">
            Escreva sua dúvida para o Mentor IAH
          </label>
          <textarea
            ref={inputRef}
            id="mentor-iah-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={busy}
            maxLength={600}
            rows={2}
            placeholder="Conte onde você ficou em dúvida…"
            className="min-h-11 max-h-32 min-w-0 flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
          />
          <Button
            type="submit"
            size="icon-lg"
            disabled={busy || draft.trim().length === 0}
            aria-label="Enviar mensagem ao Mentor IAH"
            className="rounded-xl"
          >
            <ArrowUp className="size-4" />
          </Button>
        </form>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          O Mentor IAH oferece pistas. Consulte o material e construa sua própria resposta.
        </p>
      </div>
    </div>
  );
}
