"use client";

import * as React from "react";
import { Mic, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Ditado por voz do campo "Detalhes adicionais" — API nativa do
 * navegador (`SpeechRecognition`), feature-detected. Nunca substitui o
 * texto existente silenciosamente: cada trecho reconhecido é anexado
 * via `onAppend`, quem decide o que fica no campo é o professor.
 */

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type DictationState = "idle" | "listening" | "paused" | "unsupported";

export function VoiceDictationButton({ onAppend }: { onAppend: (text: string) => void }) {
  const [state, setState] = React.useState<DictationState>("idle");
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const intentRef = React.useRef<"listening" | "paused" | "idle">("idle");

  React.useEffect(() => {
    const globalWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Constructor = globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setState("unsupported");
      return;
    }

    const recognition = new Constructor();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) chunk += result[0].transcript;
      }
      if (chunk.trim()) onAppend(chunk.trim());
    };
    recognition.onerror = () => {
      intentRef.current = "idle";
      setState("idle");
    };
    recognition.onend = () => {
      // Só volta pra "ouvindo" automaticamente se não foi pausa/cancelamento deliberado.
      if (intentRef.current === "listening") recognition.start();
      else setState(intentRef.current);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onAppend]);

  if (state === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        Ditado por voz não é compatível com este navegador — digite o texto normalmente.
      </p>
    );
  }

  function start() {
    intentRef.current = "listening";
    setState("listening");
    recognitionRef.current?.start();
  }
  function pause() {
    intentRef.current = "paused";
    recognitionRef.current?.stop();
  }
  function resume() {
    intentRef.current = "listening";
    setState("listening");
    recognitionRef.current?.start();
  }
  function cancel() {
    intentRef.current = "idle";
    recognitionRef.current?.stop();
    setState("idle");
  }

  if (state === "idle") {
    return (
      <Button type="button" variant="outline" size="sm" onClick={start}>
        <Mic className="size-3.5" aria-hidden />
        Ditar por voz
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
          state === "listening" ? "border-chart-2/50 bg-chart-2/10 text-chart-2" : "border-border text-muted-foreground"
        }`}
      >
        <Mic className="size-3.5" aria-hidden />
        {state === "listening" ? "Ouvindo…" : "Pausado"}
      </span>
      {state === "listening" ? (
        <Button type="button" variant="outline" size="sm" onClick={pause}>
          <Square className="size-3.5" aria-hidden />
          Pausar
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={resume}>
          <Mic className="size-3.5" aria-hidden />
          Continuar
        </Button>
      )}
      <Button type="button" variant="ghost" size="sm" onClick={cancel}>
        <X className="size-3.5" aria-hidden />
        Cancelar
      </Button>
    </div>
  );
}
