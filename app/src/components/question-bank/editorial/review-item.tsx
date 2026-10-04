import Link from "next/link";

import { QuestionContent } from "@/components/question-bank/question-content";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EDITORIAL_DIFFICULTY_LABEL, type CurriculumSkill, type ReviewItem } from "@/modules/question-bank";

import { decideAction, saveVersionAction, submitVersionAction, suggestionAction } from "./actions";
import { ClassificationBadge, STATUS_LABEL } from "./review-queue";

const VERSION_STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  devolvida: "Devolvida",
  aprovada: "Aprovada",
  substituida: "Substituída",
};

const CHECKLIST = [
  ["gabarito", "Gabarito e resolução conferidos; cada devolutiva explica a alternativa"],
  ["habilidade", "Habilidade oficial adequada (confirme se foi proposta por IA)"],
  ["direitos", "Conteúdo original ou com uso autorizado; referências corretas"],
  ["linguagem", "Linguagem clara, sem ambiguidade nem viés; adequada à série"],
] as const;

type Ref = {
  serie_sugerida?: string | null;
  serie_origem?: string | null;
  titulo?: string | null;
  classificacao?: { origem?: string; motivo?: string; confianca_bncc?: string; associacao?: string | null };
  habilidade_trabalhada?: string | null;
  referencias?: Array<{ titulo: string; url: string; nota: string }>;
};

export function ReviewItemView({
  item,
  base,
  skills,
}: {
  item: ReviewItem;
  base: string;
  skills: CurriculumSkill[];
}) {
  const { version, key, skill, source } = item;
  const ref = (item.externalRef ?? {}) as Ref;
  const fmt = version.contentFormat;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link href={`${base}?status=${version.status === "substituida" ? "aprovada" : version.status}`} className="text-xs text-primary hover:underline">
          ← {STATUS_LABEL[version.status] ?? "Fila"}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-xl font-semibold">{item.code ?? version.id}</h1>
          <Badge>{VERSION_STATUS[version.status]}</Badge>
          <span className="text-sm text-muted-foreground">versão {version.version}</span>
          {item.mine ? <Badge variant="outline">você é o autor</Badge> : null}
        </div>
        {ref.titulo ? <p className="text-sm text-muted-foreground">{ref.titulo}</p> : null}
      </header>

      {item.sourceRights !== "verificado" ? (
        <p role="note" className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          A fonte <strong>{source?.title ?? "desta questão"}</strong> ainda não tem direitos verificados pela gestão — o banco recusa a aprovação até essa verificação.
        </p>
      ) : null}
      {item.classification === "ia" ? (
        <p role="note" className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <strong>Habilidade proposta por IA</strong> ({ref.classificacao?.confianca_bncc ?? "?"} confiança): {ref.classificacao?.motivo}. Confirme ao marcar &quot;habilidade&quot; na conferência, ou devolva pedindo correção.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-normal leading-relaxed">
            <QuestionContent text={version.stem} format={fmt} versionId={version.id} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <ol className="flex flex-col gap-2">
            {version.options.map((o) => {
              const correct = o.key === key?.answerKey;
              return (
                <li key={o.key} className={cn("rounded-md border px-3 py-2", correct ? "border-emerald-500" : "border-border")}>
                  <span className={cn(correct && "font-semibold text-emerald-700 dark:text-emerald-400")}>
                    {o.key}) <QuestionContent text={o.text} format={fmt} versionId={version.id} inline />
                    {correct ? " — gabarito" : ""}
                  </span>
                  {key?.optionFeedback?.[o.key] ? (
                    <span className="mt-1 block text-xs text-muted-foreground">Devolutiva: {key.optionFeedback[o.key]}</span>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <p className="whitespace-pre-line text-muted-foreground">
            <strong>Resolução:</strong> {key?.resolution ?? <em>ainda não escrita</em>}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Classificação e procedência</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Habilidade oficial:</span>
            <span className="font-mono font-semibold">{skill?.code}</span>
            <ClassificationBadge origin={item.classification} />
          </p>
          {skill ? <p className="text-muted-foreground">{skill.description}</p> : null}
          {ref.classificacao?.associacao ? <p className="text-muted-foreground">Associação do autor: {ref.classificacao.associacao}</p> : null}
          {ref.serie_sugerida ? (
            <p>
              <span className="text-muted-foreground">Série sugerida:</span> {ref.serie_sugerida}
              {ref.serie_origem === "ia" ? " (proposta por IA)" : ""}
            </p>
          ) : null}
          <p><span className="text-muted-foreground">Dificuldade:</span> {version.editorialDifficulty ? EDITORIAL_DIFFICULTY_LABEL[version.editorialDifficulty] : "não informada"}</p>
          <p><span className="text-muted-foreground">Autoria:</span> {version.authorship}</p>
          <p><span className="text-muted-foreground">Fonte:</span> {source?.title} · direitos {source?.rightsStatus}</p>
          {ref.referencias?.length ? (
            <ul className="list-disc pl-5">
              {ref.referencias.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{r.titulo}</a>
                  {r.nota ? ` — ${r.nota}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {item.suggestions.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Correspondências sugeridas</CardTitle>
            <CardDescription>Só correspondência confirmada vale para listas por habilidade e para o circuito.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {item.suggestions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
                <span className="font-mono font-semibold">{s.skill?.code ?? s.skillId}</span>
                <Badge variant="outline">{s.origin === "ia" ? "IA" : "equipe/autor"} · {s.confidence}</Badge>
                <Badge variant={s.status === "confirmada" ? "default" : "secondary"}>{s.status}</Badge>
                <span className="w-full text-muted-foreground">{s.rationale}</span>
                {s.skill ? <span className="w-full text-xs text-muted-foreground">{s.skill.description}</span> : null}
                {s.status === "sugerida" ? (
                  <span className="flex gap-2">
                    {(["confirmada", "rejeitada"] as const).map((d) => (
                      <form key={d} action={suggestionAction}>
                        <input type="hidden" name="base" value={base} />
                        <input type="hidden" name="versionId" value={version.id} />
                        <input type="hidden" name="suggestionId" value={s.id} />
                        <input type="hidden" name="decision" value={d} />
                        <button type="submit" className={cn(buttonVariants({ size: "sm", variant: d === "confirmada" ? "default" : "outline" }))}>
                          {d === "confirmada" ? "Confirmar" : "Rejeitar"}
                        </button>
                      </form>
                    ))}
                  </span>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {item.reviews.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Histórico de revisão desta versão</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {item.reviews.map((r) => (
              <p key={r.id}>
                <Badge variant={r.decision === "aprovada" ? "default" : "secondary"}>{r.decision}</Badge>{" "}
                <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleString("pt-BR")}</span>
                {r.comment ? ` — ${r.comment}` : ""}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {item.canReview ? (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">Conferência</CardTitle>
            <CardDescription>Aprovar exige os quatro itens. Devolver exige comentário para o autor.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={decideAction} className="flex flex-col gap-3 text-sm">
              <input type="hidden" name="base" value={base} />
              <input type="hidden" name="versionId" value={version.id} />
              {CHECKLIST.map(([name, label]) => (
                <label key={name} className="flex items-start gap-2">
                  <input type="checkbox" name={name} className="mt-0.5 size-4 accent-primary" />
                  {label}
                </label>
              ))}
              <textarea name="comment" rows={3} placeholder="Comentário (obrigatório para devolver)" className="rounded-md border border-input bg-background px-3 py-2" />
              <div className="flex flex-wrap gap-2">
                <button type="submit" name="decision" value="aprovada" className={cn(buttonVariants())}>Aprovar</button>
                <button type="submit" name="decision" value="devolvida" className={cn(buttonVariants({ variant: "outline" }))}>Devolver ao autor</button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : version.status === "em_revisao" && item.mine ? (
        <p className="text-sm text-muted-foreground">Você é o autor desta versão: outra pessoa da equipe precisa revisá-la.</p>
      ) : null}

      {item.canEdit ? <Editor item={item} base={base} skills={skills} /> : null}

      {item.history.length > 1 ? (
        <p className="text-xs text-muted-foreground">
          Versões:{" "}
          {item.history.map((h, i) => (
            <span key={h.id}>
              {i ? " · " : ""}
              <Link href={`${base}/${encodeURIComponent(h.id)}`} className={cn("hover:underline", h.id === version.id && "font-semibold")}>
                v{h.version} ({VERSION_STATUS[h.status]})
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

function Editor({ item, base, skills }: { item: ReviewItem; base: string; skills: CurriculumSkill[] }) {
  const { version, key, question } = item;
  const areaId = item.skill?.areaId;
  const options = skills.filter((s) => !areaId || s.areaId === areaId);
  const field = "rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Corrigir (cria a versão {version.version + 1})</CardTitle>
        <CardDescription>
          Marcação: &lt;sub&gt;, &lt;sup&gt;, &lt;em&gt;, &lt;strong&gt;, &lt;small&gt; e tabelas em linhas | a | b |. A versão atual fica no histórico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveVersionAction} className="flex flex-col gap-3 text-sm">
          <input type="hidden" name="base" value={base} />
          <input type="hidden" name="versionId" value={version.id} />
          <label className="flex flex-col gap-1">Enunciado
            <textarea name="stem" rows={12} defaultValue={version.stem} required className={cn(field, "font-mono text-xs")} />
          </label>
          {version.options.map((o) => (
            <div key={o.key} className="grid gap-2 md:grid-cols-2">
              <label className="flex flex-col gap-1">Alternativa {o.key}
                <input name={`option:${o.key}`} defaultValue={o.text} required className={field} />
              </label>
              <label className="flex flex-col gap-1">Devolutiva {o.key}
                <textarea name={`feedback:${o.key}`} rows={2} defaultValue={key?.optionFeedback?.[o.key] ?? ""} className={field} />
              </label>
            </div>
          ))}
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1">Gabarito
              <select name="answerKey" defaultValue={key?.answerKey} className={field}>
                {version.options.map((o) => <option key={o.key} value={o.key}>{o.key}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">Dificuldade (rótulo editorial)
              <select name="difficulty" defaultValue={version.editorialDifficulty ?? ""} className={field}>
                <option value="">Não informar</option>
                <option value="facil">Fácil</option>
                <option value="media">Média</option>
                <option value="dificil">Difícil</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">Habilidade oficial
              <select name="skillId" defaultValue={question.skillId} className={field}>
                {options.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">Resolução comentada
            <textarea name="resolution" rows={4} defaultValue={key?.resolution ?? ""} required className={field} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" name="intent" value="enviar" className={cn(buttonVariants())}>Salvar e enviar à revisão</button>
            <button type="submit" name="intent" value="salvar" className={cn(buttonVariants({ variant: "outline" }))}>Salvar como rascunho</button>
          </div>
        </form>
        {version.status === "rascunho" ? (
          <form action={submitVersionAction} className="mt-3">
            <input type="hidden" name="base" value={base} />
            <input type="hidden" name="versionId" value={version.id} />
            <button type="submit" className={cn(buttonVariants({ variant: "secondary" }))}>Enviar esta versão à revisão sem mudanças</button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
