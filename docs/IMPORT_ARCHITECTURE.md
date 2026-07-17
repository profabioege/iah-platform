# Arquitetura de Importação — IAH Educacional

Como cada origem de dados de Turma/Aluno (cadastro manual, CSV, Google Classroom, Microsoft Teams, Moodle, API genérica) alimenta **exatamente o mesmo modelo interno** descrito em [DOMAIN_MODEL.md](DOMAIN_MODEL.md).

> **Atualização (Sprint Núcleo da Plataforma, D-023):** o contrato descrito aqui foi implementado em código — `app/src/modules/integrations/import/` (contrato + 6 provedores: manual funcional, 5 stubs) e `app/src/modules/platform/services/import-service.ts` (quem grava). Com uma melhoria sobre a versão original deste documento: **o provider é estritamente só-leitura** (`listClassrooms`/`listStudents`); a gravação (`importClassroom`) saiu do provider e virou responsabilidade do `ImportService` — um provedor de origem externa não deve ter poder de escrita no modelo interno. As seções abaixo refletem o contrato vigente.

## Visão geral

O IAH será usado por escolas que já têm seus alunos e turmas cadastrados em outro lugar — uma planilha, o Google Classroom, o Microsoft Teams, um Moodle institucional — ou que preferem simplesmente digitar a lista à mão. **A Plataforma não pode ter uma noção de Turma/Aluno diferente para cada uma dessas origens.** Toda origem converge para as mesmas entidades internas (`Turma`, `Aluno`, `Matrícula`, definidas em `DOMAIN_MODEL.md`), através de um único contrato: `ImportProvider`.

Isso já é a mesma filosofia aplicada em D-019 (`modules/integrations`, `ClassroomProvider`) — este documento generaliza esse contrato para origens que não são uma API OAuth (CSV, cadastro manual), e nomeia formalmente a família completa de provedores previstos.

## O contrato `ImportProvider` (implementado em `modules/integrations/import`)

```
ImportProvider (só-leitura)
├─ id: "manual" | "csv" | "google" | "microsoft" | "moodle" | "api"
├─ isConfigured: boolean
├─ listClassrooms(): Promise<ImportedClassroom[]>
└─ listStudents(externalClassroomId): Promise<ImportedStudent[]>

ImportService (modules/platform — quem grava)
├─ previewClassroom(provider, institutionId, externalClassroomId)
│    → candidatos + reconciliação por e-mail já indicada
└─ importClassroom(provider, institutionId, academicYearId, externalClassroomId)
     → grava Turma/Aluno/Matrícula via contratos de repositório
       (chamado SÓ depois da revisão humana)
```

- `listClassrooms()` — devolve as turmas candidatas encontradas na origem (ex.: cursos do Google Classroom, abas de uma planilha, turmas de um Moodle).
- `listStudents(externalClassroomId)` — devolve os alunos candidatos de uma turma específica.
- **O provider nunca grava.** Converter candidatos em `Turma`/`Aluno`/`Matrícula` internos é papel do `ImportService`, **depois de revisão humana** (ver "Fluxo de importação" abaixo) — nunca silenciosamente.
- `ImportedClassroom`/`ImportedStudent` são tipos de fronteira (dados crus da origem, ainda não confirmados) — não são `Turma`/`Aluno` internos; só viram isso depois do passo de revisão.

### Relação com `ClassroomProvider` (já existe em código)

`modules/integrations/classroom/domain/classroom-provider.ts` (D-019) já define `listCourses()`/`listStudents()`/`publishMission()`, hoje usado só para o caso Google (mock + stub). `ImportProvider` é a generalização desse mesmo formato para incluir origens que não têm API (CSV, manual) e adiciona o passo explícito de confirmação (`importClassroom`) que `ClassroomProvider` ainda não tem, porque hoje ele não persiste nada. Quando a persistência existir (`ROADMAP.md`, item 3), o caminho natural é: `ClassroomProvider` passa a ser a especialização de `ImportProvider` usada pelos provedores com API (Google, Microsoft), enquanto `ManualImportProvider`/`CSVImportProvider` implementam `ImportProvider` diretamente, sem API. Nenhuma mudança é necessária no que já existe — é extensão, não substituição.

## As 6 implementações (`modules/integrations/import/infrastructure/import-providers.ts`)

| Implementação | Como preenche o modelo interno | Situação hoje |
|---|---|---|
| **`ManualImportProvider`** | A "origem" são os dados digitados no ato: o provedor é criado já com as turmas/alunos do formulário (`createManualImportProvider`) e apenas os devolve — o `ImportService` grava, como para qualquer origem. | **Funcional** (não precisa de credencial; a UI de cadastro que o alimenta depende de banco) |
| **`CSVImportProvider`** | Lê um arquivo CSV enviado (colunas: nome da turma, nome do aluno, e-mail); `listClassrooms()` agrupa linhas por turma; `listStudents()` lista as linhas de uma turma. | Stub (parser real pendente) |
| **`GoogleClassroomProvider`** | Usa a Google Classroom API (`classroom.courses.readonly`, `classroom.rosters.readonly`) — ver `GOOGLE_WORKSPACE.md`. `listClassrooms()` → `courses.list`; `listStudents()` → `courses.students.list`. | Stub (credenciais pendentes; convive com o `ClassroomProvider` de D-019) |
| **`MicrosoftTeamsProvider`** | Usa a Microsoft Graph API (Education/Teams for Education) para listar turmas (`classes`) e membros. | Stub — nenhuma credencial, nenhum SDK instalado |
| **`MoodleProvider`** | Usa a Moodle Web Services API (`core_enrol_get_users_courses` + `core_enrol_get_enrolled_users`, tipicamente) para listar cursos/turmas e alunos matriculados. | Stub — nenhuma credencial, nenhum SDK instalado |
| **`APIProvider`** | Origem genérica via API REST configurável (para sistemas escolares próprios que exponham turmas/alunos em JSON). | Stub — formato do endpoint a definir quando houver um caso real |

## Fluxo de importação (qualquer origem)

```
Origem externa                ImportProvider (só-leitura)    Plataforma (revisão humana)         ImportService → Modelo interno
───────────────               ───────────────────────────    ─────────────────────────────       ──────────────────────────────
Planilha / API / formulário → listClassrooms()             → tela: "Turmas encontradas: 3"
                             → listStudents(classroomId)    → tela: "12 alunos — confirmar?"
                                                               (Professor/Admin revisa, corrige,
                                                                resolve conflitos de nome/e-mail)
                                                            → confirmação → importClassroom()   → Turma, Aluno, Matrícula
```

**Regra central: nenhuma importação é automática e silenciosa.** Toda origem passa por uma tela de revisão antes de gravar — mesmo o Google Classroom, mesmo com OAuth já configurado. Isso é coerente com D-015 (dados simulados sempre identificados, nunca silenciosos) e evita que um CSV malformado ou uma sincronização do Classroom crie 40 alunos fantasmas sem ninguém perceber.

## Reconciliação de identidade

Quando a mesma pessoa aparece em mais de uma origem (ex.: um aluno já cadastrado manualmente é encontrado de novo ao sincronizar o Google Classroom), é preciso decidir se é a "mesma" pessoa ou uma nova. Chave proposta: **e-mail institucional**, normalizado (minúsculas, sem espaços) — é o único campo presente e estável em todas as 5 origens (CSV tem coluna de e-mail; Google/Microsoft/Moodle sempre expõem e-mail; cadastro manual pede e-mail). Alunos sem e-mail (comum em Ensino Fundamental) ficam como um ponto em aberto — ver `DOMAIN_MODEL.md`, seção 9.

## Pontos de extensão

- **Novo provedor:** implementar `ImportProvider` em `infrastructure/`, seguindo os tipos `ImportedClassroom`/`ImportedStudent` — nenhuma mudança em `Turma`/`Aluno`/`Matrícula` nem em qualquer tela.
- **Novo campo importável** (ex.: foto do aluno, série): estende `ImportedStudent`, opcional por padrão — origens que não o fornecem simplesmente não o preenchem.
- **Sincronização contínua vs. importação pontual:** o contrato acima cobre importação pontual (sob demanda); sincronização automática recorrente é uma extensão futura sobre `ClassroomIntegration` (`DOMAIN_MODEL.md`, seção 2), não uma mudança neste contrato.
