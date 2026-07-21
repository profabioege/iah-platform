import { LinkCard } from "../quick-shortcuts";
import { DOCENT_TASKS } from "./tasks";

/** As oito tarefas do DocentIAH — nunca um chat genérico, sempre uma tarefa clara. */
export function TaskGrid() {
  return (
    <section aria-label="Tarefas do DocentIAH" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {DOCENT_TASKS.map((task) => (
        <LinkCard
          key={task.slug}
          icon={task.icon}
          title={task.title}
          description={task.description}
          href={task.href ?? `/professor/docente-iah/tarefa/${task.slug}`}
        />
      ))}
    </section>
  );
}
