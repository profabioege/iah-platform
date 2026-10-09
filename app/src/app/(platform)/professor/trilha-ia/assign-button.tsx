"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";

import { assignAiMissionAction } from "./actions";

export function AssignMissionButton({ classroomId, missionId }: { classroomId: string; missionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        className="w-fit"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await assignAiMissionAction({ classroomId, missionId });
            if (!result.ok) setError(result.error);
            else router.refresh();
          })
        }
      >
        <Send className="size-4" />
        {pending ? "Atribuindo…" : "Atribuir à turma"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
